/**
 * GET /api/new-dashboard/inbox
 *
 * Devuelve los emails ENTRANTES (respuestas de prospectos) de Instantly
 * que están pendientes de contestar.
 *
 * Filtros:
 *   - from_address_email != cuentas propias (emails de outreach)
 *   - Últimos N días (por defecto 14)
 *   - Ordenados por timestamp DESC
 */
import { NextResponse } from 'next/server'
import { INSTANTLY_API_KEY } from '@/lib/instantly'

export const dynamic = 'force-dynamic'

// Cuentas de envío propias — excluir de "inbound"
const OWN_EMAILS = [
  'victor@artiversemail.es',
  'victor@artiverse.es',
  'victor@artiverse.online',
]

const DAYS_BACK = 14

interface InstantlyEmail {
  id: string
  timestamp_created: string
  timestamp_email: string
  message_id: string
  subject: string
  to_address_email_list: Array<{ address: string; name?: string }> | string
  body: { text?: string; html?: string } | string
  from_address_email: string
  from_address_json?: { address?: string; name?: string }
  campaign_id?: string
  lead?: { email?: string; firstName?: string; company?: string }
  is_unread?: boolean
  ai_interest_value?: number
  i_status?: string
  thread_id?: string
  content_preview?: string
  eaccount?: string
}

function extractText(body: InstantlyEmail['body']): string {
  if (!body) return ''
  if (typeof body === 'string') return body
  return body.text || body.html?.replace(/<[^>]+>/g, ' ').trim() || ''
}

function extractHtml(body: InstantlyEmail['body']): string {
  if (!body) return ''
  if (typeof body === 'string') return `<p>${body}</p>`
  if (body.html) return body.html
  return `<p style="white-space:pre-wrap">${body.text || ''}</p>`
}

function getFromName(email: InstantlyEmail): string {
  if (email.from_address_json?.name) return email.from_address_json.name
  return email.lead?.firstName || email.from_address_email.split('@')[0]
}

function getCompany(email: InstantlyEmail): string {
  if (email.lead?.company) return email.lead.company
  // Guess from domain
  const domain = email.from_address_email.split('@')[1] || ''
  if (domain && !domain.includes('gmail') && !domain.includes('hotmail') && !domain.includes('yahoo')) {
    return domain.replace(/^www\./, '').replace(/\.(com|es|org|net)$/, '')
  }
  return ''
}

function priorityScore(email: InstantlyEmail): number {
  // ai_interest_value is 0-100 from Instantly
  const aiScore = email.ai_interest_value ?? 50
  // Recency bonus (decay over 7 days)
  const ageMs = Date.now() - new Date(email.timestamp_email).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const recencyBonus = Math.max(0, 30 - ageDays * 4)
  return aiScore + recencyBonus
}

export async function GET() {
  const since = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Fetch up to 3 pages of emails
    let allEmails: InstantlyEmail[] = []
    let cursor: string | null = null

    for (let page = 0; page < 3; page++) {
      const url = new URL('https://api.instantly.ai/api/v2/emails')
      url.searchParams.set('limit', '100')
      if (cursor) url.searchParams.set('starting_after', cursor)

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}` },
        next: { revalidate: 0 },
      })
      if (!res.ok) break

      const data = await res.json()
      const items: InstantlyEmail[] = data.items || []
      allEmails.push(...items)
      cursor = data.next_cursor || null
      if (!cursor || items.length < 100) break
    }

    // Filter: inbound only, within date range
    const inbound = allEmails.filter(e => {
      const isOwn = OWN_EMAILS.some(own =>
        e.from_address_email?.toLowerCase() === own.toLowerCase()
      )
      const ts = e.timestamp_email || e.timestamp_created || ''
      return !isOwn && ts >= since
    })

    // Build response
    const emails = inbound
      .map(e => ({
        id:          e.id,
        thread_id:   e.thread_id || e.id,
        timestamp:   e.timestamp_email || e.timestamp_created,
        from_email:  e.from_address_email,
        from_name:   getFromName(e),
        company:     getCompany(e),
        subject:     e.subject || '(sin asunto)',
        preview:     extractText(e.body).slice(0, 120),
        body_text:   extractText(e.body),
        body_html:   extractHtml(e.body),
        campaign_id: e.campaign_id || '',
        is_unread:   e.is_unread ?? true,
        ai_score:    e.ai_interest_value ?? null,
        priority:    priorityScore(e),
      }))
      .sort((a, b) => b.priority - a.priority)

    return NextResponse.json({
      emails,
      total: emails.length,
      unread: emails.filter(e => e.is_unread).length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
