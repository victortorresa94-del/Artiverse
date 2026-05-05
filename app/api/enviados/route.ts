/**
 * GET /api/enviados
 *
 * Devuelve TODOS los emails enviados, separados por origen:
 *   - Instantly: outbound de las campañas (con step 1/2/3)
 *   - HubSpot: respuestas manuales loggeadas en CRM
 *
 * Ambos vienen ordenados por timestamp DESC.
 */
import { NextResponse } from 'next/server'
import { INSTANTLY_API_KEY } from '@/lib/instantly'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HS_TOKEN = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS       = 'https://api.hubapi.com'

// Cuentas propias de envío (outbound desde Instantly)
const OWN_EMAILS = [
  'victor@artiversemail.es',
  'victor@artiverse.es',
  'victor@artiverse.online',
]

const DAYS_BACK = 30

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstantlyEmail {
  id:                  string
  timestamp_created:   string
  timestamp_email:     string
  subject:             string
  body:                { text?: string; html?: string } | string
  from_address_email:  string
  to_address_email_list?: Array<{ address: string; name?: string }> | string
  campaign_id?:        string
  lead?:               { email?: string; firstName?: string; company?: string }
  step?:               number  // 0,1,2 = posición en secuencia
  email_type?:         string
  thread_id?:          string
  content_preview?:    string
}

interface InstantlyCampaign {
  id:       string
  name:     string
  sequences?: Array<any>
}

export interface SentEmail {
  id:        string
  source:    'instantly' | 'hubspot'
  timestamp: string
  to_email:  string
  to_name:   string
  company:   string
  subject:   string
  preview:   string
  body_text: string
  body_html: string
  // Instantly only:
  campaign_name?: string
  campaign_id?:   string
  step?:          number   // 1, 2, 3
  step_label?:    string   // "1er email" / "2º follow-up" etc.
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getRecipient(e: InstantlyEmail): { email: string; name: string } {
  const list = e.to_address_email_list
  if (Array.isArray(list) && list.length > 0) {
    return { email: list[0].address, name: list[0].name || '' }
  }
  if (typeof list === 'string') return { email: list, name: '' }
  if (e.lead?.email) return { email: e.lead.email, name: e.lead.firstName || '' }
  return { email: '', name: '' }
}

function stepLabel(step: number): string {
  if (step === 0 || step === 1) return '1er email'
  if (step === 2)               return '2º follow-up'
  if (step === 3)               return '3er follow-up'
  return `Paso ${step}`
}

// ─── Instantly fetchers ───────────────────────────────────────────────────────

async function fetchInstantlyCampaigns(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const res = await fetch('https://api.instantly.ai/api/v2/campaigns?limit=100', {
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}` },
      next:    { revalidate: 0 },
    })
    if (!res.ok) return map
    const data = await res.json()
    const items: InstantlyCampaign[] = data.items || []
    items.forEach(c => map.set(c.id, c.name))
    return map
  } catch {
    return map
  }
}

async function fetchInstantlySent(since: string): Promise<InstantlyEmail[]> {
  const all: InstantlyEmail[] = []
  let cursor: string | null = null

  for (let page = 0; page < 5; page++) {
    const url = new URL('https://api.instantly.ai/api/v2/emails')
    url.searchParams.set('limit', '100')
    url.searchParams.set('email_type', 'sent')
    if (cursor) url.searchParams.set('starting_after', cursor)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}` },
      next:    { revalidate: 0 },
    })
    if (!res.ok) break

    const data = await res.json()
    const items: InstantlyEmail[] = data.items || []
    all.push(...items)
    cursor = data.next_cursor || null
    if (!cursor || items.length < 100) break
  }

  // Si email_type filter no funciona en el API, filtrar localmente por from
  return all.filter(e => {
    const ts = e.timestamp_email || e.timestamp_created || ''
    if (ts < since) return false
    const isOwn = OWN_EMAILS.some(o => e.from_address_email?.toLowerCase() === o.toLowerCase())
    return isOwn
  })
}

// ─── HubSpot fetchers ─────────────────────────────────────────────────────────

interface HsEngagement {
  engagement: {
    id:         number
    type:       string
    timestamp:  number
    createdAt:  number
  }
  associations?: { contactIds?: number[] }
  metadata?: {
    from?:    { email?: string; firstName?: string; lastName?: string }
    to?:      Array<{ email?: string; firstName?: string; lastName?: string }>
    subject?: string
    text?:    string
    html?:    string
    status?:  string
  }
}

async function fetchHubspotSent(sinceMs: number): Promise<SentEmail[]> {
  if (!HS_TOKEN) return []

  const result: SentEmail[] = []
  let offset: number | null = null

  for (let page = 0; page < 5; page++) {
    const url = `${HS}/engagements/v1/engagements/paged?limit=100${offset ? `&offset=${offset}` : ''}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${HS_TOKEN}` },
      next:    { revalidate: 0 },
    })
    if (!res.ok) break
    const data = await res.json()
    const items: HsEngagement[] = data.results || []

    for (const it of items) {
      const eng = it.engagement
      if (eng.type !== 'EMAIL') continue
      if (eng.timestamp < sinceMs) continue

      const meta = it.metadata || {}
      const fromEmail = meta.from?.email?.toLowerCase() || ''
      const isOwn = OWN_EMAILS.some(o => fromEmail === o.toLowerCase())
      if (!isOwn) continue

      const to = meta.to?.[0]
      if (!to?.email) continue

      const text = meta.text || (meta.html ? meta.html.replace(/<[^>]+>/g, ' ').trim() : '')
      const html = meta.html || `<p style="white-space:pre-wrap">${meta.text || ''}</p>`

      result.push({
        id:        String(eng.id),
        source:    'hubspot',
        timestamp: new Date(eng.timestamp).toISOString(),
        to_email:  to.email,
        to_name:   [to.firstName, to.lastName].filter(Boolean).join(' ').trim(),
        company:   '',
        subject:   meta.subject || '(sin asunto)',
        preview:   text.slice(0, 140),
        body_text: text,
        body_html: html,
      })
    }

    if (!data['has-more']) break
    offset = data.offset
  }
  return result
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const sinceISO = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString()
    const sinceMs  = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000

    const [campaigns, instantlyRaw, hubspot] = await Promise.all([
      fetchInstantlyCampaigns(),
      fetchInstantlySent(sinceISO),
      fetchHubspotSent(sinceMs),
    ])

    const instantly: SentEmail[] = instantlyRaw.map(e => {
      const r = getRecipient(e)
      const step = (e.step ?? 0) + (typeof e.step === 'number' && e.step >= 1 ? 0 : 1)
      // Normalize step to 1-based
      const realStep = typeof e.step === 'number' ? (e.step === 0 ? 1 : e.step) : 1
      return {
        id:            e.id,
        source:        'instantly' as const,
        timestamp:     e.timestamp_email || e.timestamp_created,
        to_email:      r.email,
        to_name:       r.name || e.lead?.firstName || '',
        company:       e.lead?.company || '',
        subject:       e.subject || '(sin asunto)',
        preview:       extractText(e.body).slice(0, 140),
        body_text:     extractText(e.body),
        body_html:     extractHtml(e.body),
        campaign_id:   e.campaign_id || '',
        campaign_name: campaigns.get(e.campaign_id || '') || 'Sin campaña',
        step:          realStep,
        step_label:    stepLabel(realStep),
      }
    })

    instantly.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    hubspot.sort((a, b)   => b.timestamp.localeCompare(a.timestamp))

    return NextResponse.json({
      instantly,
      hubspot,
      counts: {
        instantly: instantly.length,
        hubspot:   hubspot.length,
        total:     instantly.length + hubspot.length,
      },
      since: sinceISO,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
