/**
 * GET /api/conversaciones
 *
 * Devuelve TODAS las conversaciones (hilos) con sus mensajes:
 *   - Inbound de Instantly (respuestas que nos han enviado)
 *   - Outbound desde Instantly (campañas)
 *   - Outbound desde HubSpot (manual via /api/new-dashboard/send-reply)
 *
 * Hila por thread_id de Instantly. Cada hilo tiene status (pendiente/
 * esperando/cerrada/no_interesado/mail_obsoleto) persistido en listas
 * HubSpot "Conv: <estado>".
 */
import { NextResponse } from 'next/server'
import { INSTANTLY_API_KEY } from '@/lib/instantly'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HS_TOKEN = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS       = 'https://api.hubapi.com'

const OWN_EMAILS = [
  'victor@artiversemail.es',
  'victor@artiverse.es',
  'victor@artiverse.online',
]

// ─── Conversation status (persisted in HubSpot lists) ───────────────────────

export const CONV_STATUSES = ['pendiente', 'esperando', 'cerrada', 'no_interesado', 'mail_obsoleto'] as const
export type ConvStatus = typeof CONV_STATUSES[number]

const CONV_LIST_NAMES: Record<Exclude<ConvStatus, 'pendiente'>, string> = {
  esperando:     'Conv: Esperando respuesta',
  cerrada:       'Conv: Cerrada',
  no_interesado: 'Conv: No interesado',
  mail_obsoleto: 'Conv: Mail obsoleto',
}
// "pendiente" = no está en ninguna lista (default si tiene inbound sin contestar)

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstantlyEmail {
  id:                 string
  thread_id?:         string
  message_id?:        string
  timestamp_created:  string
  timestamp_email:    string
  subject:            string
  body:               { text?: string; html?: string } | string
  from_address_email: string
  from_address_json?: { address?: string; name?: string }
  to_address_email_list?: Array<{ address: string; name?: string }> | string
  campaign_id?:       string
  lead?:              { email?: string; firstName?: string; lastName?: string; company?: string }
  is_unread?:         boolean
  ai_interest_value?: number
  step?:              number
  email_type?:        string
  content_preview?:   string
}

export interface ConvMessage {
  id:        string
  direction: 'in' | 'out'
  timestamp: string
  from_email:string
  from_name: string
  to_email:  string
  subject:   string
  body_text: string
  body_html: string
  source:    'instantly' | 'hubspot'
  step?:     number
}

export interface Conversation {
  thread_id:        string
  contact_email:    string
  contact_name:     string
  company:          string
  messages:         ConvMessage[]
  last_in_at:       string
  last_out_at:      string
  last_activity_at: string
  status:           ConvStatus
  has_inbound:      boolean
  unread:           boolean
  ai_score:         number
}

// ─── HubSpot helpers ──────────────────────────────────────────────────────────

function hsHeaders() {
  return { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' }
}

async function ensureConvLists(): Promise<Record<string, number>> {
  if (!HS_TOKEN) return {}
  const res = await fetch(`${HS}/contacts/v1/lists?count=250`, { headers: hsHeaders() })
  if (!res.ok) return {}
  const d = await res.json()
  const existing: Array<{ listId: number; name: string }> = (d.lists || []).map((l: any) => ({ listId: l.listId, name: l.name }))
  const result: Record<string, number> = {}

  for (const [phase, name] of Object.entries(CONV_LIST_NAMES)) {
    const found = existing.find(l => l.name === name)
    if (found) {
      result[phase] = found.listId
    } else {
      const cr = await fetch(`${HS}/contacts/v1/lists`, {
        method: 'POST',
        headers: hsHeaders(),
        body: JSON.stringify({ name, dynamic: false }),
      })
      if (cr.ok) {
        const cd = await cr.json()
        result[phase] = cd.listId
      }
    }
  }
  return result
}

async function getListMemberEmails(listId: number): Promise<Set<string>> {
  const emails = new Set<string>()
  let vidOffset = 0
  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `${HS}/contacts/v1/lists/${listId}/contacts/all?count=100&property=email${vidOffset ? `&vidOffset=${vidOffset}` : ''}`,
      { headers: hsHeaders() }
    )
    if (!res.ok) break
    const d = await res.json()
    const contacts = d.contacts || []
    for (const c of contacts) {
      const email = c.properties?.email?.value
        || c['identity-profiles']?.[0]?.identities?.find((i: any) => i.type === 'EMAIL')?.value
      if (email) emails.add(String(email).toLowerCase())
    }
    if (!d['has-more']) break
    vidOffset = d['vid-offset']
  }
  return emails
}

// ─── Instantly fetcher ────────────────────────────────────────────────────────

async function fetchAllEmails(): Promise<InstantlyEmail[]> {
  const all: InstantlyEmail[] = []
  let cursor: string | null = null
  for (let page = 0; page < 30; page++) {
    const url = new URL('https://api.instantly.ai/api/v2/emails')
    url.searchParams.set('limit', '100')
    if (cursor) url.searchParams.set('starting_after', cursor)
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}` },
      next:    { revalidate: 0 },
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

// ─── HubSpot outbound emails ──────────────────────────────────────────────────

interface HsEngagement {
  engagement: { id: number; type: string; timestamp: number }
  associations?: { contactIds?: number[] }
  metadata?: {
    from?: { email?: string; firstName?: string }
    to?:   Array<{ email?: string; firstName?: string }>
    subject?: string
    text?:    string
    html?:    string
  }
}

async function fetchHubspotOutbound(sinceMs: number): Promise<ConvMessage[]> {
  if (!HS_TOKEN) return []
  const out: ConvMessage[] = []
  let offset: number | null = null

  for (let page = 0; page < 5; page++) {
    const url = `${HS}/engagements/v1/engagements/paged?limit=100${offset ? `&offset=${offset}` : ''}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${HS_TOKEN}` }, next: { revalidate: 0 } })
    if (!res.ok) break
    const data = await res.json()
    const items: HsEngagement[] = data.results || []
    for (const it of items) {
      if (it.engagement.type !== 'EMAIL') continue
      if (it.engagement.timestamp < sinceMs) continue
      const meta = it.metadata || {}
      const fromEmail = meta.from?.email?.toLowerCase() || ''
      const isOwn = OWN_EMAILS.some(o => fromEmail === o.toLowerCase())
      if (!isOwn) continue
      const to = meta.to?.[0]
      if (!to?.email) continue

      const text = meta.text || (meta.html ? meta.html.replace(/<[^>]+>/g, ' ').trim() : '')
      const html = meta.html || `<p style="white-space:pre-wrap">${meta.text || ''}</p>`

      out.push({
        id:        `hs_${it.engagement.id}`,
        direction: 'out',
        timestamp: new Date(it.engagement.timestamp).toISOString(),
        from_email:fromEmail,
        from_name: 'Víctor Torres',
        to_email:  to.email.toLowerCase(),
        subject:   meta.subject || '',
        body_text: text,
        body_html: html,
        source:    'hubspot',
      })
    }
    if (!data['has-more']) break
    offset = data.offset
  }
  return out
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
function isOutbound(e: InstantlyEmail): boolean {
  return OWN_EMAILS.some(o => e.from_address_email?.toLowerCase() === o.toLowerCase())
}
function getRecipient(e: InstantlyEmail): string {
  const list = e.to_address_email_list
  if (Array.isArray(list) && list.length > 0) return list[0].address
  if (typeof list === 'string') return list
  if (e.lead?.email) return e.lead.email
  return ''
}

function instantlyToMsg(e: InstantlyEmail): ConvMessage {
  const out = isOutbound(e)
  return {
    id:         e.id,
    direction:  out ? 'out' : 'in',
    timestamp:  e.timestamp_email || e.timestamp_created,
    from_email: e.from_address_email,
    from_name:  e.from_address_json?.name || e.lead?.firstName || e.from_address_email.split('@')[0],
    to_email:   getRecipient(e).toLowerCase(),
    subject:    e.subject || '',
    body_text:  extractText(e.body),
    body_html:  extractHtml(e.body),
    source:     'instantly',
    step:       e.step,
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Asegurar listas + leer estados
    const listIds = await ensureConvLists()
    const [esperandoEmails, cerradaEmails, noIntEmails, mailObsoletoEmails] = await Promise.all([
      listIds.esperando     ? getListMemberEmails(listIds.esperando)     : Promise.resolve(new Set<string>()),
      listIds.cerrada       ? getListMemberEmails(listIds.cerrada)       : Promise.resolve(new Set<string>()),
      listIds.no_interesado ? getListMemberEmails(listIds.no_interesado) : Promise.resolve(new Set<string>()),
      listIds.mail_obsoleto ? getListMemberEmails(listIds.mail_obsoleto) : Promise.resolve(new Set<string>()),
    ])

    // 2. Fetch Instantly emails (todos)
    const instantly = await fetchAllEmails()

    // 3. Fetch HubSpot outbound (90 días)
    const hubspot = await fetchHubspotOutbound(Date.now() - 90 * 24 * 60 * 60 * 1000)

    // 4. Construir mapa thread_id → conversación. Para HubSpot, hacemos thread fake = "hs_<email>"
    const threads = new Map<string, ConvMessage[]>()
    const threadContacts = new Map<string, { email: string; name: string; company: string }>()

    for (const e of instantly) {
      const tid = e.thread_id || e.id
      const msg = instantlyToMsg(e)
      if (!threads.has(tid)) threads.set(tid, [])
      threads.get(tid)!.push(msg)

      // Contacto del hilo: el "otro" lado
      const contactEmail = (msg.direction === 'in' ? msg.from_email : msg.to_email).toLowerCase()
      if (contactEmail && !threadContacts.has(tid)) {
        threadContacts.set(tid, {
          email:   contactEmail,
          name:    msg.direction === 'in' ? msg.from_name : (e.lead?.firstName || ''),
          company: e.lead?.company || '',
        })
      }
    }

    // HubSpot outbound: si no existe thread del contacto, crear "hs_<email>"
    for (const m of hubspot) {
      // Buscar thread Instantly del contacto
      let foundTid: string | null = null
      for (const [tid, info] of threadContacts.entries()) {
        if (info.email === m.to_email) { foundTid = tid; break }
      }
      const tid = foundTid || `hs_${m.to_email}`
      if (!threads.has(tid)) threads.set(tid, [])
      threads.get(tid)!.push(m)
      if (!threadContacts.has(tid)) {
        threadContacts.set(tid, { email: m.to_email, name: '', company: '' })
      }
    }

    // 5. Construir array de conversaciones
    // FILTRO PRINCIPAL: solo incluir hilos donde el contacto al menos ha respondido
    // una vez. Los contactos a los que solo enviamos outreach (sin respuesta de
    // ellos) NO son "conversaciones" — viven en el Funnel como contactado/abierto.
    const conversations: Conversation[] = []
    for (const [tid, msgs] of threads.entries()) {
      const info = threadContacts.get(tid)
      if (!info || !info.email) continue

      msgs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      const inbound = msgs.filter(m => m.direction === 'in')

      // Filtro: si el contacto NO ha respondido nunca, no es una conversación
      if (inbound.length === 0) continue

      const outbound = msgs.filter(m => m.direction === 'out')
      const last_in_at  = inbound.at(-1)?.timestamp  || ''
      const last_out_at = outbound.at(-1)?.timestamp || ''
      const last_activity_at = msgs.at(-1)!.timestamp

      // Resolver estado:
      //   pendiente = me han escrito y no he contestado todavía
      //   esperando = ya respondí, espero su réplica (= "Conversación abierta" en UI)
      //   override manual: cerrada / no_interesado / mail_obsoleto
      let status: ConvStatus = 'pendiente'
      const e = info.email
      if (mailObsoletoEmails.has(e))     status = 'mail_obsoleto'
      else if (noIntEmails.has(e))       status = 'no_interesado'
      else if (cerradaEmails.has(e))     status = 'cerrada'
      else if (esperandoEmails.has(e))   status = 'esperando'   // override manual
      else if (last_out_at > last_in_at) status = 'esperando'   // ya respondimos, conversación abierta
      else                               status = 'pendiente'   // me toca responder

      const aiScores = msgs
        .map(() => 0)
        .filter(s => s > 0)
      const ai = instantly
        .filter(e => (e.thread_id || e.id) === tid && typeof e.ai_interest_value === 'number')
        .map(e => e.ai_interest_value as number)
      const ai_score = ai.length > 0 ? Math.max(...ai) : 0

      conversations.push({
        thread_id:        tid,
        contact_email:    info.email,
        contact_name:     info.name,
        company:          info.company,
        messages:         msgs,
        last_in_at,
        last_out_at,
        last_activity_at,
        status,
        has_inbound:      inbound.length > 0,
        unread:           false,  // TODO: unread tracking
        ai_score,
      })
    }

    // 6. Sort: pendiente primero, luego por last_activity desc
    const STATUS_ORDER: Record<ConvStatus, number> = {
      pendiente:     0,
      esperando:     1,
      cerrada:       3,
      no_interesado: 4,
      mail_obsoleto: 5,
    }
    conversations.sort((a, b) => {
      const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (so !== 0) return so
      return b.last_activity_at.localeCompare(a.last_activity_at)
    })

    const counts: Record<ConvStatus | 'total', number> = {
      total: conversations.length, pendiente: 0, esperando: 0, cerrada: 0, no_interesado: 0, mail_obsoleto: 0,
    }
    for (const c of conversations) counts[c.status]++

    return NextResponse.json({
      conversations,
      counts,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
