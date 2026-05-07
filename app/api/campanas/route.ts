/**
 * GET /api/campanas
 *
 * Lista campañas Instantly con stats (total, sent, opened, replied, bounced)
 * y los respondedores (con preview del mensaje).
 *
 * Query opcional: ?campaign_id=<uuid>  → solo esa campaña con sus respondedores
 */
import { NextRequest, NextResponse } from 'next/server'
import { INSTANTLY_API_KEY } from '@/lib/instantly'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const OWN_EMAILS = [
  'victor@artiversemail.es',
  'victor@artiverse.es',
  'victor@artiverse.online',
  'info@artiverse.es',
]

interface InstantlyCampaign {
  id:        string
  name:      string
  status?:   number
  timestamp_created?: string
}

interface InstantlyLead {
  id:                  string
  email:               string
  campaign?:           string
  campaign_id?:        string
  first_name?:         string
  last_name?:          string
  company_name?:       string
  status:              number
  email_open_count?:   number
  email_click_count?:  number
  email_reply_count?:  number
  verification_status?: number
  timestamp_updated?:  string
  payload?:            { location?: string }
}

interface InstantlyEmail {
  id:                 string
  thread_id?:         string
  timestamp_email:    string
  subject:            string
  body:               { text?: string; html?: string } | string
  from_address_email: string
  campaign_id?:       string
  lead?:              { email?: string; firstName?: string }
}

async function fetchAllCampaigns(): Promise<InstantlyCampaign[]> {
  const all: InstantlyCampaign[] = []
  let cursor: string | null = null
  for (let p = 0; p < 5; p++) {
    const url = new URL('https://api.instantly.ai/api/v2/campaigns')
    url.searchParams.set('limit', '100')
    if (cursor) url.searchParams.set('starting_after', cursor)
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) break
    const d = await res.json()
    const items: InstantlyCampaign[] = d.items || []
    all.push(...items)
    cursor = d.next_starting_after
    if (!cursor || items.length < 100) break
  }
  return all
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
  for (let p = 0; p < 5; p++) {
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

function leadCampaignId(l: InstantlyLead): string {
  return l.campaign_id || l.campaign || ''
}

function extractText(body: any): string {
  if (!body) return ''
  if (typeof body === 'string') return body
  return body.text || body.html?.replace(/<[^>]+>/g, ' ').trim() || ''
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const campaignFilter = searchParams.get('campaign_id')

  try {
    const [campaigns, leads, inboundEmails] = await Promise.all([
      fetchAllCampaigns(),
      fetchAllLeads(),
      fetchInboundEmails(),
    ])

    // Map campaign → stats
    const stats: Record<string, {
      total: number; sent: number; opened: number; clicked: number;
      replied: number; bounced: number; lastActivity: string;
    }> = {}

    const campaignNames: Record<string, string> = {}
    for (const c of campaigns) campaignNames[c.id] = c.name

    for (const l of leads) {
      const cid = leadCampaignId(l)
      if (!cid) continue
      if (!stats[cid]) {
        stats[cid] = { total: 0, sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, lastActivity: '' }
      }
      const s = stats[cid]
      s.total++
      if (l.status === -1 || l.verification_status === -1) s.bounced++
      if ((l.email_open_count   ?? 0) > 0) s.opened++
      if ((l.email_click_count  ?? 0) > 0) s.clicked++
      if ((l.email_reply_count  ?? 0) > 0) s.replied++
      if (l.status === 1)                  s.sent++  // active in sequence
      if (l.timestamp_updated && l.timestamp_updated > s.lastActivity) {
        s.lastActivity = l.timestamp_updated
      }
    }

    // Mensaje más reciente por lead (para preview)
    const latestByLead: Record<string, InstantlyEmail> = {}
    for (const e of inboundEmails) {
      const email = e.from_address_email?.toLowerCase()
      if (!email) continue
      const existing = latestByLead[email]
      if (!existing || e.timestamp_email > existing.timestamp_email) {
        latestByLead[email] = e
      }
    }

    // Construir lista de campañas con resumen
    const campaignsList = campaigns.map(c => ({
      id:           c.id,
      name:         c.name,
      status:       c.status,
      created:      c.timestamp_created,
      stats:        stats[c.id] || { total: 0, sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, lastActivity: '' },
    })).sort((a, b) => (b.stats.lastActivity || '').localeCompare(a.stats.lastActivity || ''))

    // Si pidieron una campaña específica, devolver respondedores con detalle
    if (campaignFilter) {
      const respondents = leads
        .filter(l => leadCampaignId(l) === campaignFilter && (l.email_reply_count ?? 0) > 0)
        .map(l => {
          const last = latestByLead[l.email?.toLowerCase()]
          return {
            email:       l.email,
            name:        [l.first_name, l.last_name].filter(Boolean).join(' ').trim(),
            company:     l.company_name || '',
            location:    l.payload?.location || '',
            opens:       l.email_open_count || 0,
            replies:     l.email_reply_count || 0,
            updated:     l.timestamp_updated,
            last_subject: last?.subject || '',
            last_message: last ? extractText(last.body).slice(0, 280) : '',
            last_at:      last?.timestamp_email || '',
            thread_id:    last?.thread_id || last?.id || '',
          }
        })
        .sort((a, b) => (b.last_at || '').localeCompare(a.last_at || ''))

      const c = campaigns.find(c => c.id === campaignFilter)
      return NextResponse.json({
        campaign: c ? { ...c, stats: stats[c.id] } : null,
        respondents,
      })
    }

    return NextResponse.json({ campaigns: campaignsList, total: campaigns.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
