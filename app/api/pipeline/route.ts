/**
 * GET /api/pipeline?token=AETHER2026
 *
 * Unified pipeline data: merges all Instantly contacts with Artiverse platform users.
 * Returns a single array of PipelineContact with funnel phase assigned.
 *
 * Funnel phases (outbound):
 *   sin_contactar       → status === 0, never sent
 *   enviado_no_abierto  → sent (status >= 1), opens === 0
 *   abierto_no_contesta → opens > 0, clicks === 0, replies === 0
 *   clicked_no_registro → clicks > 0, replies === 0
 *   contestado          → replies > 0 (client enriches with interesado/no_interesado from localStorage)
 *   bounced             → status === -1
 *   dentro_plataforma   → email found in Artiverse API (overrides all above)
 *
 * Funnel phases (inbound — Artiverse-only users):
 *   registrado_sin_verificar → emailVerified: false
 *   verificado_sin_perfil    → emailVerified: true, profileComplete: false
 *   perfil_completo          → profileComplete: true
 *
 * Cache: 3 minutes in-memory to respect API rate limits.
 * Rate limits: Artiverse 30 req/min (~2 requests/call), Instantly unlimited but polite.
 */

import { NextResponse } from 'next/server'

const KEY   = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const ART_KEY = process.env.ARTIVERSE_API_KEY || ''
const BASE  = 'https://api.instantly.ai/api/v2'
const ART_BASE = 'https://api.artiverse.es'
const TOKEN = 'AETHER2026'

// ── In-memory cache (3 min) ────────────────────────────────────────────────────

interface CacheEntry { data: PipelineResponse; ts: number }
let _cache: CacheEntry | null = null
const CACHE_TTL = 3 * 60 * 1000

// ── Types ──────────────────────────────────────────────────────────────────────

export type PipelinePhase =
  | 'sin_contactar'
  | 'enviado_no_abierto'
  | 'abierto_no_contesta'
  | 'clicked_no_registro'
  | 'contestado'
  | 'bounced'
  | 'dentro_plataforma'
  | 'registrado_sin_verificar'
  | 'verificado_sin_perfil'
  | 'perfil_completo'

export interface PipelineContact {
  id: string
  email: string
  company: string
  contact: string
  phone: string
  website: string
  city: string
  campaignId: string
  campaignName: string
  segment: string
  // Funnel
  phase: PipelinePhase
  emailStatus: 'not_sent' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced'
  opens: number
  clicks: number
  replies: number
  lastContact: string
  lastOpen: string
  lastClick: string
  lastReply: string
  lastStep: string
  // Artiverse enrichment
  artiverseUser?: {
    name: string
    subscription: string
    hasAgency: boolean
    agencyName: string
    profileComplete: boolean
    emailVerified: boolean
    registeredAt: string
  }
  source: 'outbound' | 'inbound_only'
}

interface PipelineStats {
  totalOutbound: number
  totalInPlatform: number
  needsReply: number
  openedNoReply: number
  clicked: number
  bounced: number
  notContacted: number
  inboundOnly: number
}

interface PipelineResponse {
  contacts: PipelineContact[]
  stats: PipelineStats
  campaigns: { id: string; name: string }[]
  updatedAt: string
}

// ── Instantly helpers ──────────────────────────────────────────────────────────

function instHeaders() {
  return { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
}

async function fetchCampaigns(): Promise<{ id: string; name: string; status: number }[]> {
  const res = await fetch(`${BASE}/campaigns?limit=100`, {
    headers: instHeaders(),
    next: { revalidate: 0 },
  })
  if (!res.ok) return []
  const d = await res.json()
  const items: { id: string; name: string; status: number }[] = d.items ?? d ?? []
  return items.filter(c => !c.name.includes('[AI SDR]'))
}

async function fetchCampaignLeads(campaignId: string): Promise<any[]> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${BASE}/leads/list`, {
      method: 'POST',
      headers: instHeaders(),
      body: JSON.stringify({ campaign: campaignId, limit: 100 }),
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) return []
    const d = await res.json()
    return d.items ?? []
  } catch { return [] }
  finally { clearTimeout(tid) }
}

// ── Artiverse helpers ──────────────────────────────────────────────────────────

async function fetchArtiverseUsers(): Promise<Map<string, any>> {
  const emailMap = new Map<string, any>()
  if (!ART_KEY) return emailMap

  let cursor: string | undefined
  let fetched = 0

  do {
    const params = new URLSearchParams({ limit: '100' })
    if (cursor) params.set('cursor', cursor)

    const res = await fetch(`${ART_BASE}/admin/marketing/users?${params}`, {
      headers: { 'x-api-key': ART_KEY, 'Content-Type': 'application/json' },
      next: { revalidate: 0 },
    })
    if (!res.ok) break

    const d = await res.json()
    const items: any[] = d.data ?? []
    for (const u of items) {
      if (u.email) emailMap.set(u.email.toLowerCase(), u)
    }
    fetched += items.length
    cursor = d.nextCursor ?? undefined
    if (!cursor || !d.hasMore || fetched >= 500) break
  } while (true)

  return emailMap
}

// ── Campaign name → segment mapping ───────────────────────────────────────────

function inferSegment(campaignName: string): string {
  const n = campaignName.toLowerCase()
  if (n.includes('teatro') || n.includes('danza') || n.includes('dance')) return 'Teatro-Danza'
  if (n.includes('salas') || n.includes('concierto'))                      return 'Salas Conciertos'
  if (n.includes('festival'))                                               return 'Festivales'
  if (n.includes('distribu'))                                               return 'Distribuidoras'
  if (n.includes('socios') || n.includes('arte'))                          return 'Socios ARTE'
  if (n.includes('calentamiento') || n.includes('warmup'))                 return 'Calentamiento'
  return 'Otros'
}

// ── Phase logic ────────────────────────────────────────────────────────────────

function getPhase(lead: any, inArtiverse: boolean): PipelinePhase {
  if (inArtiverse)                     return 'dentro_plataforma'
  if (lead.status === -1)              return 'bounced'
  if ((lead.email_reply_count ?? 0) > 0) return 'contestado'
  if ((lead.email_click_count ?? 0) > 0) return 'clicked_no_registro'
  if ((lead.email_open_count  ?? 0) > 0) return 'abierto_no_contesta'
  if (lead.status >= 1)                return 'enviado_no_abierto'
  return 'sin_contactar'
}

function getEmailStatus(lead: any): PipelineContact['emailStatus'] {
  if (lead.status === -1)                    return 'bounced'
  if ((lead.email_reply_count ?? 0) > 0)    return 'replied'
  if ((lead.email_click_count ?? 0) > 0)    return 'clicked'
  if ((lead.email_open_count  ?? 0) > 0)    return 'opened'
  if (lead.status >= 1)                      return 'sent'
  return 'not_sent'
}

// ── Normalize Instantly lead → PipelineContact ────────────────────────────────

function normalizeInstantlyLead(
  lead: any,
  campaign: { id: string; name: string },
  artiverseMap: Map<string, any>
): PipelineContact {
  const email   = (lead.email ?? '').toLowerCase()
  const artUser = artiverseMap.get(email)
  const inArtiverse = !!artUser
  const phase   = getPhase(lead, inArtiverse)

  // Normalize Artiverse user if present
  const agencies = artUser?.agencies ?? []
  const agency   = agencies[0]
  const sub      = artUser?.subscription
  const planType = typeof sub === 'string' ? sub : (sub?.planType ?? 'free')

  const artiverseUser = artUser ? {
    name: artUser.name ?? '',
    subscription: planType,
    hasAgency: agencies.length > 0,
    agencyName: agency?.displayName ?? agency?.legalName ?? '',
    profileComplete: artUser.profile != null || artUser.promoter != null,
    emailVerified: artUser.emailVerified ?? false,
    registeredAt: artUser.createdAt ?? '',
  } : undefined

  return {
    id: lead.id ?? email,
    email: lead.email ?? '',
    company: lead.company_name || lead.payload?.companyName || lead.company_domain || '',
    contact: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
    phone: lead.phone || lead.payload?.phone || '',
    website: lead.website || lead.payload?.website || '',
    city: lead.city || lead.payload?.city || '',
    campaignId: campaign.id,
    campaignName: campaign.name.replace(' - Artiverse', '').replace(' - artiverse', ''),
    segment: inferSegment(campaign.name),
    phase,
    emailStatus: getEmailStatus(lead),
    opens: lead.email_open_count ?? 0,
    clicks: lead.email_click_count ?? 0,
    replies: lead.email_reply_count ?? 0,
    lastContact: lead.timestamp_last_contact ?? lead.timestamp_last_touch ?? '',
    lastOpen: lead.timestamp_last_open ?? '',
    lastClick: lead.timestamp_last_click ?? '',
    lastReply: lead.timestamp_last_reply ?? '',
    lastStep: lead.status_summary?.lastStep?.stepID ?? '',
    artiverseUser,
    source: 'outbound',
  }
}

// ── Inbound-only Artiverse users ───────────────────────────────────────────────

function artiverseInboundContact(artUser: any, seenEmails: Set<string>): PipelineContact | null {
  const email = (artUser.email ?? '').toLowerCase()
  if (!email || seenEmails.has(email)) return null

  const agencies = artUser.agencies ?? []
  const agency   = agencies[0]
  const sub      = artUser.subscription
  const planType = typeof sub === 'string' ? sub : (sub?.planType ?? 'free')
  const profileComplete = artUser.profile != null || artUser.promoter != null

  let phase: PipelinePhase
  if (!artUser.emailVerified) phase = 'registrado_sin_verificar'
  else if (!profileComplete)  phase = 'verificado_sin_perfil'
  else                        phase = 'perfil_completo'

  return {
    id: email,
    email: artUser.email ?? '',
    company: agency?.displayName ?? agency?.legalName ?? artUser.name ?? '',
    contact: artUser.name ?? '',
    phone: '',
    website: agency?.website ?? '',
    city: agency?.city ?? '',
    campaignId: '',
    campaignName: '',
    segment: 'Inbound',
    phase,
    emailStatus: 'not_sent',
    opens: 0, clicks: 0, replies: 0,
    lastContact: '', lastOpen: '', lastClick: '', lastReply: '', lastStep: '',
    artiverseUser: {
      name: artUser.name ?? '',
      subscription: planType,
      hasAgency: agencies.length > 0,
      agencyName: agency?.displayName ?? agency?.legalName ?? '',
      profileComplete,
      emailVerified: artUser.emailVerified ?? false,
      registeredAt: artUser.createdAt ?? '',
    },
    source: 'inbound_only',
  }
}

// ── Phase sort order (urgency) ─────────────────────────────────────────────────

const PHASE_ORDER: Record<PipelinePhase, number> = {
  contestado:               0,
  clicked_no_registro:      1,
  abierto_no_contesta:      2,
  dentro_plataforma:        3,
  perfil_completo:          4,
  verificado_sin_perfil:    5,
  registrado_sin_verificar: 6,
  enviado_no_abierto:       7,
  sin_contactar:            8,
  bounced:                  9,
}

// ── Main builder ───────────────────────────────────────────────────────────────

async function buildPipeline(): Promise<PipelineResponse> {
  // Fetch campaigns + Artiverse users in parallel
  const [campaigns, artiverseMap] = await Promise.all([
    fetchCampaigns(),
    fetchArtiverseUsers(),
  ])

  // Fetch all campaign leads in parallel
  const leadsPerCampaign = await Promise.all(
    campaigns.map(c => fetchCampaignLeads(c.id).then(leads => ({ campaign: c, leads })))
  )

  const contacts: PipelineContact[] = []
  const seenEmails = new Set<string>()

  // Normalize outbound contacts (deduplicate by email, keep latest activity)
  for (const { campaign, leads } of leadsPerCampaign) {
    for (const lead of leads) {
      const email = (lead.email ?? '').toLowerCase()
      if (!email) continue
      if (seenEmails.has(email)) continue  // first campaign wins (sorted by date desc)
      seenEmails.add(email)
      contacts.push(normalizeInstantlyLead(lead, campaign, artiverseMap))
    }
  }

  // Add inbound-only Artiverse users (not in any Instantly campaign)
  for (const [, artUser] of artiverseMap) {
    const c = artiverseInboundContact(artUser, seenEmails)
    if (c) {
      seenEmails.add((artUser.email ?? '').toLowerCase())
      contacts.push(c)
    }
  }

  // Sort by urgency
  contacts.sort((a, b) => (PHASE_ORDER[a.phase] ?? 99) - (PHASE_ORDER[b.phase] ?? 99))

  // Compute stats
  const stats: PipelineStats = {
    totalOutbound:    contacts.filter(c => c.source === 'outbound').length,
    totalInPlatform:  contacts.filter(c => c.phase === 'dentro_plataforma').length,
    needsReply:       contacts.filter(c => c.phase === 'contestado').length,
    openedNoReply:    contacts.filter(c => c.phase === 'abierto_no_contesta').length,
    clicked:          contacts.filter(c => c.phase === 'clicked_no_registro').length,
    bounced:          contacts.filter(c => c.phase === 'bounced').length,
    notContacted:     contacts.filter(c => c.phase === 'sin_contactar').length,
    inboundOnly:      contacts.filter(c => c.source === 'inbound_only').length,
  }

  return {
    contacts,
    stats,
    campaigns: campaigns.map(c => ({
      id: c.id,
      name: c.name.replace(' - Artiverse', '').replace(' - artiverse', ''),
    })),
    updatedAt: new Date().toISOString(),
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  if (_cache && now - _cache.ts < CACHE_TTL) {
    return NextResponse.json({ ..._cache.data, cached: true })
  }

  try {
    const data = await buildPipeline()
    _cache = { data, ts: now }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Pipeline API Error:', err)
    if (_cache) return NextResponse.json({ ..._cache.data, cached: true, stale: true })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
