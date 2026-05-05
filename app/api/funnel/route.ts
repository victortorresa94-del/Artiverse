/**
 * GET /api/funnel
 *
 * Devuelve todos los contactos de Instantly clasificados en fases del funnel.
 * Combina:
 *   - Instantly leads (auto-clasifica por status, opens, clicks, replies)
 *   - Artiverse users API (fase "registrado")
 *   - Listas HubSpot "Funnel: <fase>" (overrides manuales: interesado, no_interesado)
 *
 * Las listas HubSpot se crean automáticamente en la primera llamada si no existen.
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

export const PHASES = [
  'contactado',
  'abierto',
  'respondio',
  'interesado',
  'registrado',
  'no_interesado',
  'mail_erroneo',
] as const

export type Phase = typeof PHASES[number]

const MANUAL_PHASES: Phase[] = ['interesado', 'no_interesado']
const FUNNEL_LIST_PREFIX = 'Funnel: '
const FUNNEL_LIST_NAMES: Record<string, string> = {
  interesado:     `${FUNNEL_LIST_PREFIX}Interesado`,
  no_interesado:  `${FUNNEL_LIST_PREFIX}No interesado`,
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
  phase:    Phase
  source:   'auto' | 'manual' | 'platform'  // de dónde viene la fase
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
      // Create the list
      const res = await fetch(`${HS}/contacts/v1/lists`, {
        method: 'POST',
        headers: hsHeaders(),
        body:   JSON.stringify({ name: targetName, dynamic: false }),
      })
      if (res.ok) {
        const d = await res.json()
        result[phase] = d.listId
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

// ─── Artiverse users (registered) ────────────────────────────────────────────

async function fetchArtiverseEmails(): Promise<Set<string>> {
  if (!ARTIVERSE_KEY) return new Set()
  try {
    const emails = new Set<string>()
    let cursor: string | null = null
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
      const users = d.data || d.users || []
      users.forEach((u: any) => {
        if (u.email) emails.add(String(u.email).toLowerCase())
      })
      cursor = d.nextCursor
      if (!cursor || !d.hasMore) break
    }
    return emails
  } catch {
    return new Set()
  }
}

// ─── Phase computation ────────────────────────────────────────────────────────

function autoPhase(lead: InstantlyLead): Phase {
  // Bounced
  if (lead.status === -1 || lead.verification_status === -1) return 'mail_erroneo'
  // Replied
  if ((lead.email_reply_count ?? 0) > 0) return 'respondio'
  // Opened (descartamos clicks: data poco fiable en muchas campañas)
  if ((lead.email_open_count ?? 0) > 0) return 'abierto'
  // Default: contactado (sent or in sequence)
  return 'contactado'
}

function buildContact(lead: InstantlyLead, phase: Phase, source: FunnelContact['source']): FunnelContact {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim()
  return {
    email:   lead.email || '',
    name:    name || lead.email?.split('@')[0] || '',
    company: lead.company_name || lead.company_domain || '',
    job:     lead.job_title || '',
    city:    lead.payload?.location || '',
    opens:   lead.email_open_count   ?? 0,
    clicks:  lead.email_click_count  ?? 0,
    replies: lead.email_reply_count  ?? 0,
    updated: lead.timestamp_updated  ?? '',
    phase,
    source,
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Ensure funnel lists exist + get their IDs
    const listIds = await ensureFunnelLists()

    // 2. Load data in parallel
    const [leads, registeredEmails, interestedEmails, notInterestedEmails] = await Promise.all([
      fetchAllInstantlyLeads(),
      fetchArtiverseEmails(),
      listIds.interesado    ? getListMemberEmails(listIds.interesado)    : Promise.resolve(new Set<string>()),
      listIds.no_interesado ? getListMemberEmails(listIds.no_interesado) : Promise.resolve(new Set<string>()),
    ])

    // 3. Classify each lead
    const contacts: FunnelContact[] = leads
      .filter(l => l.email)
      .map(l => {
        const emailLower = l.email.toLowerCase()

        // Manual override: HubSpot list (interesado / no_interesado)
        if (notInterestedEmails.has(emailLower)) {
          return buildContact(l, 'no_interesado', 'manual')
        }
        if (interestedEmails.has(emailLower)) {
          return buildContact(l, 'interesado', 'manual')
        }
        // Platform: registrado en Artiverse
        if (registeredEmails.has(emailLower)) {
          return buildContact(l, 'registrado', 'platform')
        }
        // Auto from Instantly
        return buildContact(l, autoPhase(l), 'auto')
      })

    // 4. Group by phase
    const byPhase: Record<string, FunnelContact[]> = {}
    PHASES.forEach(p => { byPhase[p] = [] })

    for (const c of contacts) byPhase[c.phase].push(c)

    // Sort each phase by most recent activity
    for (const p of PHASES) {
      byPhase[p].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
    }

    const counts: Record<string, number> = {}
    PHASES.forEach(p => { counts[p] = byPhase[p].length })

    return NextResponse.json({
      phases: byPhase,
      counts,
      total:  contacts.length,
      list_ids: listIds,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
