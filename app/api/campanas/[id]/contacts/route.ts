/**
 * GET /api/campanas/[id]/contacts
 *
 * Devuelve TODOS los contactos de una campaña Instantly clasificados:
 *   phase: respondido | click | abierto | contactado | mail_erroneo
 * Incluye el último mensaje recibido si respondieron.
 */
import { NextRequest, NextResponse } from 'next/server'
import { INSTANTLY_API_KEY } from '@/lib/instantly'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const OWN_EMAILS = [
  'victor@artiversemail.es', 'victor@artiverse.es', 'victor@artiverse.online',
  'info@artiverse.es',
]

interface InstantlyLead {
  id: string; email: string; campaign?: string; campaign_id?: string
  first_name?: string; last_name?: string; company_name?: string; job_title?: string
  status: number; verification_status?: number
  email_open_count?: number; email_click_count?: number; email_reply_count?: number
  timestamp_updated?: string
  payload?: { location?: string; linkedIn?: string; industry?: string }
}

interface InstantlyEmail {
  id: string; thread_id?: string; timestamp_email: string
  subject: string
  body: { text?: string; html?: string } | string
  from_address_email: string; campaign_id?: string
}

type Phase = 'respondido' | 'click' | 'abierto' | 'contactado' | 'mail_erroneo'

function phaseOf(l: InstantlyLead): Phase {
  if (l.status === -1 || l.verification_status === -1) return 'mail_erroneo'
  if ((l.email_reply_count ?? 0) > 0) return 'respondido'
  if ((l.email_click_count ?? 0) > 0) return 'click'
  if ((l.email_open_count  ?? 0) > 0) return 'abierto'
  return 'contactado'
}

function leadCampaignId(l: InstantlyLead): string {
  return l.campaign_id || l.campaign || ''
}

function extractText(body: any): string {
  if (!body) return ''
  if (typeof body === 'string') return body
  return body.text || body.html?.replace(/<[^>]+>/g, ' ').trim() || ''
}

async function fetchAllLeads(): Promise<InstantlyLead[]> {
  const all: InstantlyLead[] = []
  let cursor: string | null = null
  for (let p = 0; p < 30; p++) {
    const body: any = { limit: 100 }
    if (cursor) body.starting_after = cursor
    const res = await fetch('https://api.instantly.ai/api/v2/leads/list', {
      method: 'POST',
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) break
    const d = await res.json()
    const items: InstantlyLead[] = d.items || []
    all.push(...items)
    cursor = d.next_starting_after
    if (!cursor || items.length < 100) break
  }
  return all
}

async function fetchInboundEmails(): Promise<InstantlyEmail[]> {
  const all: InstantlyEmail[] = []
  let cursor: string | null = null
  // 30 páginas = hasta 3000 emails (cubre meses de respuestas)
  for (let p = 0; p < 30; p++) {
    const url = new URL('https://api.instantly.ai/api/v2/emails')
    url.searchParams.set('limit', '100')
    if (cursor) url.searchParams.set('starting_after', cursor)
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) break
    const d = await res.json()
    const items: InstantlyEmail[] = d.items || []
    all.push(...items)
    cursor = d.next_cursor
    if (!cursor || items.length < 100) break
  }
  return all.filter(e => !OWN_EMAILS.includes(e.from_address_email?.toLowerCase()))
}

async function fetchCampaignName(id: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.instantly.ai/api/v2/campaigns/${id}`, {
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const d = await res.json()
    return d?.name || null
  } catch { return null }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const campaignId = params.id

  try {
    const [allLeads, inboundEmails, campaignName] = await Promise.all([
      fetchAllLeads(),
      fetchInboundEmails(),
      fetchCampaignName(campaignId),
    ])

    // Mensaje más reciente por email del inbound
    const latestByLead: Record<string, InstantlyEmail> = {}
    for (const e of inboundEmails) {
      const email = e.from_address_email?.toLowerCase()
      if (!email) continue
      const existing = latestByLead[email]
      if (!existing || e.timestamp_email > existing.timestamp_email) {
        latestByLead[email] = e
      }
    }

    const leads = allLeads.filter(l => leadCampaignId(l) === campaignId && l.email)

    const contacts = leads.map(l => {
      const phase = phaseOf(l)
      const last  = latestByLead[l.email.toLowerCase()]
      const name  = [l.first_name, l.last_name].filter(Boolean).join(' ').trim()
      return {
        email:        l.email,
        name:         name,
        company:      l.company_name || '',
        job:          l.job_title || '',
        location:     l.payload?.location || '',
        linkedin:     l.payload?.linkedIn,
        phase,
        opens:        l.email_open_count   ?? 0,
        clicks:       l.email_click_count  ?? 0,
        replies:      l.email_reply_count  ?? 0,
        updated:      l.timestamp_updated  ?? '',
        last_subject: last?.subject || '',
        last_message: last ? extractText(last.body) : '',
        last_at:      last?.timestamp_email || '',
        thread_id:    last?.thread_id || last?.id || '',
      }
    })

    // Sort: respondidos primero, luego por updated desc
    const PHASE_ORDER: Record<Phase, number> = {
      respondido: 0, click: 1, abierto: 2, contactado: 3, mail_erroneo: 4,
    }
    contacts.sort((a, b) => {
      const po = PHASE_ORDER[a.phase as Phase] - PHASE_ORDER[b.phase as Phase]
      if (po !== 0) return po
      return (b.updated || '').localeCompare(a.updated || '')
    })

    const counts: Record<string, number> = { all: contacts.length, respondido: 0, click: 0, abierto: 0, contactado: 0, mail_erroneo: 0 }
    for (const c of contacts) counts[c.phase]++

    return NextResponse.json({
      campaign: {
        id: campaignId,
        name: campaignName,
      },
      contacts,
      counts,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
