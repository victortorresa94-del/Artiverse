/**
 * GET /api/panel
 *
 * KPIs simples del panel principal nuevo:
 *   - Envíos: ayer / hoy / esta semana / este mes / total (split Instantly/HubSpot)
 *   - Registros: hoy / esta semana + últimos 8 nuevos usuarios
 *   - Pendientes: conversaciones que necesitan respuesta + nuevos contactos hoy
 */
import { NextResponse } from 'next/server'
import { INSTANTLY_API_KEY } from '@/lib/instantly'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HS_TOKEN     = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS           = 'https://api.hubapi.com'
const ARTIVERSE_API = 'https://api.artiverse.es'
const ARTIVERSE_KEY = process.env.ARTIVERSE_API_KEY || ''

const OWN_EMAILS = [
  'victor@artiversemail.es',
  'victor@artiverse.es',
  'victor@artiverse.online',
]

// ─── Helpers de fechas ────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const c = new Date(d); c.setHours(0,0,0,0); return c
}
function startOfWeek(d: Date): Date {
  const c = startOfDay(d)
  const day = c.getDay()  // 0=domingo
  const diff = day === 0 ? -6 : 1 - day  // lunes
  c.setDate(c.getDate() + diff)
  return c
}
function startOfMonth(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), 1)
  return c
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

interface InstantlyLead {
  id: string; email: string; status: number; verification_status?: number
  email_open_count?: number; email_click_count?: number; email_reply_count?: number
  timestamp_updated?: string
}

interface InstantlyEmail {
  id:                 string
  timestamp_created:  string
  timestamp_email:    string
  from_address_email: string
}

async function fetchInstantlyEmails(): Promise<InstantlyEmail[]> {
  const all: InstantlyEmail[] = []
  let cursor: string | null = null
  for (let page = 0; page < 5; page++) {
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
    cursor = d.next_cursor || null
    if (!cursor || items.length < 100) break
  }
  return all
}

async function fetchInstantlyLeads(): Promise<InstantlyLead[]> {
  const all: InstantlyLead[] = []
  let cursor: string | null = null
  for (let page = 0; page < 30; page++) {
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

async function fetchHubspotSent(sinceMs: number): Promise<number[]> {
  // Devuelve timestamps de emails enviados desde HubSpot
  if (!HS_TOKEN) return []
  const ts: number[] = []
  let offset: number | null = null
  for (let page = 0; page < 5; page++) {
    const url = `${HS}/engagements/v1/engagements/paged?limit=100${offset ? `&offset=${offset}` : ''}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${HS_TOKEN}` }, next: { revalidate: 0 } })
    if (!res.ok) break
    const d = await res.json()
    const items: any[] = d.results || []
    for (const it of items) {
      if (it.engagement.type !== 'EMAIL') continue
      if (it.engagement.timestamp < sinceMs) continue
      const fromEmail = it.metadata?.from?.email?.toLowerCase() || ''
      const isOwn = OWN_EMAILS.some(o => fromEmail === o.toLowerCase())
      if (isOwn) ts.push(it.engagement.timestamp)
    }
    if (!d['has-more']) break
    offset = d.offset
  }
  return ts
}

interface ArtUser {
  email:     string
  firstName?: string
  lastName?:  string
  createdAt:  string
  hasAgency?: boolean
}

async function fetchArtiverseUsers(): Promise<ArtUser[]> {
  if (!ARTIVERSE_KEY) return []
  const all: ArtUser[] = []
  let cursor: string | null = null
  try {
    for (let p = 0; p < 10; p++) {
      const url = new URL(`${ARTIVERSE_API}/admin/marketing/users`)
      url.searchParams.set('limit', '100')
      if (cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url.toString(), {
        headers: { 'x-api-key': ARTIVERSE_KEY },
        next: { revalidate: 0 },
      })
      if (!res.ok) break
      const d = await res.json()
      const users: ArtUser[] = d.data || d.users || []
      all.push(...users)
      cursor = d.nextCursor
      if (!cursor || !d.hasMore) break
    }
  } catch {}
  return all
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const now           = new Date()
    const todayStart    = startOfDay(now).getTime()
    const yesterdayStart= todayStart - 24*60*60*1000
    const weekStart     = startOfWeek(now).getTime()
    const monthStart    = startOfMonth(now).getTime()

    const [instantlyEmails, hubspotTimestamps, users] = await Promise.all([
      fetchInstantlyEmails(),
      fetchHubspotSent(monthStart - 30*24*60*60*1000), // 30d atrás del inicio de mes para tener total ~60d
      fetchArtiverseUsers(),
    ])

    // ── Sent counts ──────────────────────────────────────────────────────────
    const sentInstantly = instantlyEmails.filter(e => OWN_EMAILS.some(o =>
      e.from_address_email?.toLowerCase() === o.toLowerCase()
    ))

    function countSentSince(timestamps: number[], since: number, until?: number): number {
      return timestamps.filter(t => t >= since && (until === undefined || t < until)).length
    }
    function countInstantlySince(since: number, until?: number): number {
      return sentInstantly.filter(e => {
        const t = new Date(e.timestamp_email || e.timestamp_created).getTime()
        return t >= since && (until === undefined || t < until)
      }).length
    }

    const sent = {
      ayer:  {
        instantly: countInstantlySince(yesterdayStart, todayStart),
        hubspot:   countSentSince(hubspotTimestamps, yesterdayStart, todayStart),
      },
      hoy:   {
        instantly: countInstantlySince(todayStart),
        hubspot:   countSentSince(hubspotTimestamps, todayStart),
      },
      semana:{
        instantly: countInstantlySince(weekStart),
        hubspot:   countSentSince(hubspotTimestamps, weekStart),
      },
      mes:   {
        instantly: countInstantlySince(monthStart),
        hubspot:   countSentSince(hubspotTimestamps, monthStart),
      },
      total: {
        instantly: sentInstantly.length,
        hubspot:   hubspotTimestamps.length,
      },
    }

    // ── Registrations ────────────────────────────────────────────────────────
    const registros = {
      hoy:    users.filter(u => new Date(u.createdAt).getTime() >= todayStart).length,
      semana: users.filter(u => new Date(u.createdAt).getTime() >= weekStart).length,
      mes:    users.filter(u => new Date(u.createdAt).getTime() >= monthStart).length,
      total:  users.length,
      ultimos: users
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8)
        .map(u => ({
          email:     u.email,
          name:      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email.split('@')[0],
          createdAt: u.createdAt,
          hasAgency: !!u.hasAgency,
        })),
    }

    // ── Pendientes: conversaciones inbound sin contestar ─────────────────────
    // Heurística simple: emails entrantes (no own) en los últimos 14 días que no tienen respuesta posterior
    const inbound = instantlyEmails.filter(e => !OWN_EMAILS.some(o =>
      e.from_address_email?.toLowerCase() === o.toLowerCase()
    ))
    const last14 = inbound.filter(e => {
      const t = new Date(e.timestamp_email || e.timestamp_created).getTime()
      return t >= now.getTime() - 14*24*60*60*1000
    })
    // Agrupar por from_address_email - cuántos contactos únicos nos han escrito
    const uniqueContacts = new Set(last14.map(e => e.from_address_email?.toLowerCase()).filter(Boolean))

    const pendientes = {
      necesitan_respuesta: last14.length,    // mensajes entrantes 14d
      contactos_unicos:    uniqueContacts.size,
      hoy_nuevos: inbound.filter(e => {
        const t = new Date(e.timestamp_email || e.timestamp_created).getTime()
        return t >= todayStart
      }).length,
    }

    return NextResponse.json({
      sent,
      registros,
      pendientes,
      generated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
