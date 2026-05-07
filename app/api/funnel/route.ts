/**
 * GET /api/funnel
 *
 * Devuelve el funnel completo en 2 vistas: OUTBOUND e INBOUND.
 *   - Outbound: leads de Instantly clasificados por fase (contactado, abierto,
 *     respondio, interesado, registrado, no_interesado, mail_erroneo)
 *     con override manual desde listas HubSpot "Funnel: Interesado/No interesado"
 *     y fase "registrado" si están en Artiverse.
 *   - Inbound: usuarios registrados en Artiverse, clasificados por estado de
 *     plataforma (registrado / perfil_basico / perfil_completo / pro / agencia)
 *
 * Cada contacto incluye su `conv_status` (pendiente/esperando/cerrada/...) si
 * pertenece a alguna lista Conv: de HubSpot.
 */
import { NextResponse } from 'next/server'
import { INSTANTLY_API_KEY } from '@/lib/instantly'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HS_TOKEN = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS       = 'https://api.hubapi.com'

const ARTIVERSE_API = 'https://api.artiverse.es'
const ARTIVERSE_KEY = process.env.ARTIVERSE_API_KEY || ''

// ─── Phase definitions ────────────────────────────────────────────────────────

export const OUTBOUND_PHASES = [
  'contactado',
  'abierto',
  'respondio',
  'interesado',
  'registrado',
  'no_interesado',
  'mail_erroneo',
] as const
export type OutboundPhase = typeof OUTBOUND_PHASES[number]

export const INBOUND_PHASES = [
  'registrado',
  'perfil_basico',
  'perfil_completo',
  'pro',
  'agencia',
] as const
export type InboundPhase = typeof INBOUND_PHASES[number]

// Backwards compat
export const PHASES = OUTBOUND_PHASES
export type Phase = OutboundPhase

const MANUAL_PHASES: OutboundPhase[] = ['interesado', 'no_interesado']
const FUNNEL_LIST_PREFIX = 'Funnel: '
const FUNNEL_LIST_NAMES: Record<string, string> = {
  interesado:     `${FUNNEL_LIST_PREFIX}Interesado`,
  no_interesado:  `${FUNNEL_LIST_PREFIX}No interesado`,
}

const CONV_LIST_NAMES: Record<string, string> = {
  esperando:     'Conv: Esperando respuesta',
  cerrada:       'Conv: Cerrada',
  no_interesado: 'Conv: No interesado',
  mail_obsoleto: 'Conv: Mail obsoleto',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstantlyLead {
  id:                  string
  email:               string
  first_name?:         string
  last_name?:          string
  company_name?:       string
  company_domain?:     string
  job_title?:          string
  status:              number
  email_open_count?:   number
  email_click_count?:  number
  email_reply_count?:  number
  verification_status?: number
  timestamp_updated?:  string
  payload?:            { location?: string; linkedIn?: string; industry?: string }
}

interface ArtiverseUser {
  email:           string
  firstName?:      string
  lastName?:       string
  companyName?:    string
  hasAgency?:      boolean
  agencyName?:     string
  isPro?:          boolean
  profileStatus?:  string
  profileComplete?: boolean
  hasMedia?:       boolean
  hasBio?:         boolean
  createdAt?:      string
  lastLoginAt?:    string
  segment?:        string
}

export type ConvStatus = 'pendiente' | 'esperando' | 'cerrada' | 'no_interesado' | 'mail_obsoleto'

export interface FunnelContact {
  email:    string
  name:     string
  company:  string
  job:      string
  city:     string
  opens:    number
  clicks:   number
  replies:  number
  updated:  string
  phase:    string  // OutboundPhase | InboundPhase
  source:   'auto' | 'manual' | 'platform'
  conv_status?: ConvStatus
}

// ─── HubSpot list helpers ─────────────────────────────────────────────────────

function hsHeaders() {
  return { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' }
}

async function getHubspotLists(): Promise<Array<{ listId: number; name: string }>> {
  const res = await fetch(`${HS}/contacts/v1/lists?count=250`, { headers: hsHeaders() })
  if (!res.ok) return []
  const d = await res.json()
  return (d.lists || []).map((l: any) => ({ listId: l.listId, name: l.name }))
}

async function ensureFunnelLists(): Promise<Record<string, number>> {
  const existing = await getHubspotLists()
  const result: Record<string, number> = {}

  for (const phase of MANUAL_PHASES) {
    const targetName = FUNNEL_LIST_NAMES[phase]
    const found = existing.find(l => l.name === targetName)
    if (found) {
      result[phase] = found.listId
    } else {
      const res = await fetch(`${HS}/contacts/v1/lists`, {
        method: 'POST', headers: hsHeaders(),
        body: JSON.stringify({ name: targetName, dynamic: false }),
      })
      if (res.ok) { const d = await res.json(); result[phase] = d.listId }
    }
  }
  return result
}

async function getConvListIds(existing: Array<{ listId: number; name: string }>): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  for (const [phase, name] of Object.entries(CONV_LIST_NAMES)) {
    const found = existing.find(l => l.name === name)
    if (found) result[phase] = found.listId
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

async function fetchAllInstantlyLeads(): Promise<InstantlyLead[]> {
  const all: InstantlyLead[] = []
  let cursor: string | null = null
  for (let page = 0; page < 30; page++) {
    const body: any = { limit: 100 }
    if (cursor) body.starting_after = cursor
    const res = await fetch('https://api.instantly.ai/api/v2/leads/list', {
      method: 'POST',
      headers: {
        Authorization:   `Bearer ${INSTANTLY_API_KEY}`,
        'Content-Type':  'application/json',
      },
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

// ─── Artiverse users (FULL data, not just emails) ────────────────────────────

async function fetchArtiverseUsers(): Promise<ArtiverseUser[]> {
  if (!ARTIVERSE_KEY) return []
  const all: ArtiverseUser[] = []
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
      const users: ArtiverseUser[] = d.data || d.users || []
      all.push(...users)
      cursor = d.nextCursor
      if (!cursor || !d.hasMore) break
    }
  } catch {}
  return all
}

// ─── Phase computation (Outbound) ─────────────────────────────────────────────

function autoPhaseOutbound(lead: InstantlyLead): OutboundPhase {
  if (lead.status === -1 || lead.verification_status === -1) return 'mail_erroneo'
  if ((lead.email_reply_count ?? 0) > 0) return 'respondio'
  if ((lead.email_open_count ?? 0) > 0) return 'abierto'
  return 'contactado'
}

function buildOutboundContact(
  lead: InstantlyLead,
  phase: string,
  source: FunnelContact['source'],
  convStatus?: ConvStatus,
): FunnelContact {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim()
  return {
    email:        lead.email || '',
    name:         name || lead.email?.split('@')[0] || '',
    company:      lead.company_name || lead.company_domain || '',
    job:          lead.job_title || '',
    city:         lead.payload?.location || '',
    opens:        lead.email_open_count   ?? 0,
    clicks:       lead.email_click_count  ?? 0,
    replies:      lead.email_reply_count  ?? 0,
    updated:      lead.timestamp_updated  ?? '',
    phase,
    source,
    conv_status:  convStatus,
  }
}

// ─── Phase computation (Inbound) ──────────────────────────────────────────────

function inboundPhase(u: ArtiverseUser): InboundPhase {
  if (u.hasAgency)        return 'agencia'
  if (u.isPro)            return 'pro'
  if (u.profileComplete || u.hasMedia) return 'perfil_completo'
  if (u.hasBio || u.companyName) return 'perfil_basico'
  return 'registrado'
}

function buildInboundContact(u: ArtiverseUser, convStatus?: ConvStatus): FunnelContact {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return {
    email:       u.email || '',
    name:        name || u.email?.split('@')[0] || '',
    company:     u.companyName || u.agencyName || '',
    job:         '',
    city:        '',
    opens:       0,
    clicks:      0,
    replies:     0,
    updated:     u.lastLoginAt || u.createdAt || '',
    phase:       inboundPhase(u),
    source:      'platform',
    conv_status: convStatus,
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Asegurar listas funnel
    const listIds = await ensureFunnelLists()

    // 2. Listas conv (estados de conversación)
    const allLists = await getHubspotLists()
    const convListIds = await getConvListIds(allLists)

    // 3. Cargar datos en paralelo
    const [leads, users, interestedEmails, notInterestedEmails, espEmails, cerEmails, noIntCEmails, mObsEmails] = await Promise.all([
      fetchAllInstantlyLeads(),
      fetchArtiverseUsers(),
      listIds.interesado    ? getListMemberEmails(listIds.interesado)    : Promise.resolve(new Set<string>()),
      listIds.no_interesado ? getListMemberEmails(listIds.no_interesado) : Promise.resolve(new Set<string>()),
      convListIds.esperando     ? getListMemberEmails(convListIds.esperando)     : Promise.resolve(new Set<string>()),
      convListIds.cerrada       ? getListMemberEmails(convListIds.cerrada)       : Promise.resolve(new Set<string>()),
      convListIds.no_interesado ? getListMemberEmails(convListIds.no_interesado) : Promise.resolve(new Set<string>()),
      convListIds.mail_obsoleto ? getListMemberEmails(convListIds.mail_obsoleto) : Promise.resolve(new Set<string>()),
    ])

    const registeredSet = new Set(users.map(u => u.email.toLowerCase()))

    function convStatusFor(email: string): ConvStatus | undefined {
      const e = email.toLowerCase()
      if (mObsEmails.has(e))    return 'mail_obsoleto'
      if (noIntCEmails.has(e))  return 'no_interesado'
      if (cerEmails.has(e))     return 'cerrada'
      if (espEmails.has(e))     return 'esperando'
      return undefined  // pendiente o sin estado
    }

    // ── 4. OUTBOUND ──────────────────────────────────────────────────────────
    const outboundContacts: FunnelContact[] = leads
      .filter(l => l.email)
      .map(l => {
        const e = l.email.toLowerCase()
        const cs = convStatusFor(e)
        if (notInterestedEmails.has(e)) return buildOutboundContact(l, 'no_interesado', 'manual', cs)
        if (interestedEmails.has(e))    return buildOutboundContact(l, 'interesado',    'manual', cs)
        if (registeredSet.has(e))       return buildOutboundContact(l, 'registrado',    'platform', cs)
        return buildOutboundContact(l, autoPhaseOutbound(l), 'auto', cs)
      })

    const outbound: Record<string, FunnelContact[]> = {}
    OUTBOUND_PHASES.forEach(p => { outbound[p] = [] })
    for (const c of outboundContacts) {
      if (outbound[c.phase]) outbound[c.phase].push(c)
    }
    for (const p of OUTBOUND_PHASES) {
      outbound[p].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
    }
    const outboundCounts: Record<string, number> = {}
    OUTBOUND_PHASES.forEach(p => { outboundCounts[p] = outbound[p].length })

    // ── 5. INBOUND ───────────────────────────────────────────────────────────
    const inboundContacts: FunnelContact[] = users
      .filter(u => u.email)
      .map(u => buildInboundContact(u, convStatusFor(u.email)))

    const inbound: Record<string, FunnelContact[]> = {}
    INBOUND_PHASES.forEach(p => { inbound[p] = [] })
    for (const c of inboundContacts) {
      if (inbound[c.phase]) inbound[c.phase].push(c)
    }
    for (const p of INBOUND_PHASES) {
      inbound[p].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
    }
    const inboundCounts: Record<string, number> = {}
    INBOUND_PHASES.forEach(p => { inboundCounts[p] = inbound[p].length })

    return NextResponse.json({
      // Backward-compat (lo que tenía antes)
      phases: outbound,
      counts: outboundCounts,
      total:  outboundContacts.length,
      list_ids: listIds,

      // Nuevo
      outbound: { phases: outbound, counts: outboundCounts, total: outboundContacts.length },
      inbound:  { phases: inbound,  counts: inboundCounts,  total: inboundContacts.length  },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
