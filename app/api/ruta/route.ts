/**
 * GET /api/ruta?token=AETHER2026
 *
 * Aggregates the full Artiverse growth funnel:
 *   - Excel contact universe (data/contactos.json) — 2,494 contacts
 *   - Instantly email campaigns — sent / opened / replied / bounced
 *   - Artiverse platform users — registered / verified / profileComplete / pro
 *
 * Returns node counts, conversion rates, and contact previews (first 80 per node).
 * Cache: 5 minutes in-memory.
 */

import { NextResponse } from 'next/server'
import contactosRaw from '@/data/contactos.json'

const TOKEN    = 'AETHER2026'
const INST_KEY = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const ART_KEY  = process.env.ARTIVERSE_API_KEY || ''
const INST_BASE = 'https://api.instantly.ai/api/v2'
const ART_BASE  = 'https://api.artiverse.es'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RutaContact {
  email: string
  company: string
  contact: string
  phone: string
  website: string
  city: string
  segment: string
  // Instantly enrichment
  campaignName?: string
  lastContact?: string
  opens?: number
  replies?: number
  // Artiverse enrichment
  artName?: string
  subscription?: string
  hasAgency?: boolean
  agencyName?: string
  registeredAt?: string
  // Source
  source: 'excel' | 'instantly' | 'artiverse'
}

export interface RutaNode {
  count: number
  breakdown: Record<string, number>   // by segment/campaign
  contacts: RutaContact[]             // first 80
  hasMore: boolean
}

export interface RutaResponse {
  last_updated: string
  total_base: number                  // Excel universe
  nodes: Record<string, RutaNode>
  conversion_rates: Record<string, number | null>
  campaigns: { id: string; name: string; sent: number; opened: number; replied: number; bounced: number }[]
  usersFromCampaigns: number          // Artiverse users who were in an Instantly campaign
  fromCampaignsList: RutaContact[]    // full contact list for the above
  cached?: boolean
  stale?: boolean
}

// ── Cache ──────────────────────────────────────────────────────────────────────

interface CacheEntry { data: RutaResponse; ts: number }
let _cache: CacheEntry | null = null
const CACHE_TTL = 5 * 60 * 1000

// ── Instantly helpers ──────────────────────────────────────────────────────────

function instHeaders() {
  return { Authorization: `Bearer ${INST_KEY}`, 'Content-Type': 'application/json' }
}

async function fetchInstantlyCampaigns() {
  const res = await fetch(`${INST_BASE}/campaigns?limit=100`, {
    headers: instHeaders(), next: { revalidate: 0 },
  })
  if (!res.ok) return []
  const d = await res.json()
  const items: any[] = d.items ?? d ?? []
  return items.filter((c: any) => !c.name.includes('[AI SDR]'))
}

async function fetchCampaignLeads(campaignId: string): Promise<any[]> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${INST_BASE}/leads/list`, {
      method: 'POST',
      headers: instHeaders(),
      body: JSON.stringify({ campaign: campaignId, limit: 100 }),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) return []
    const d = await res.json()
    return d.items ?? []
  } catch { return [] }
  finally { clearTimeout(t) }
}

// ── Artiverse helpers ──────────────────────────────────────────────────────────

async function fetchArtiverseUsers(): Promise<any[]> {
  if (!ART_KEY) return []
  const users: any[] = []
  let cursor: string | undefined

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
    users.push(...items)
    cursor = d.nextCursor ?? undefined
    if (!cursor || !d.hasMore || users.length >= 500) break
  } while (true)

  return users
}

function artPlanType(sub: any): string {
  if (!sub) return 'free'
  if (typeof sub === 'string') return sub
  return sub.planType ?? 'free'
}

// ── Main builder ───────────────────────────────────────────────────────────────

function makeNode(): RutaNode {
  return { count: 0, breakdown: {}, contacts: [], hasMore: false }
}

function addContact(node: RutaNode, c: RutaContact, segKey: string) {
  node.count++
  node.breakdown[segKey] = (node.breakdown[segKey] ?? 0) + 1
  if (node.contacts.length < 80) node.contacts.push(c)
  else node.hasMore = true
}

async function buildRuta(): Promise<RutaResponse> {
  // ── 1. Load static Excel contacts ──────────────────────────────────────────
  const excelContacts: any[] = contactosRaw as any[]
  const excelByEmail = new Map<string, any>()
  for (const c of excelContacts) {
    if (c.email) excelByEmail.set(c.email.toLowerCase(), c)
  }

  // ── 2. Fetch Instantly campaigns + leads in parallel ───────────────────────
  const [campaigns, artUsers] = await Promise.all([
    fetchInstantlyCampaigns(),
    fetchArtiverseUsers(),
  ])

  const leadsPerCampaign = await Promise.all(
    campaigns.map((c: any) =>
      fetchCampaignLeads(c.id).then(leads => ({ campaign: c, leads }))
    )
  )

  // ── 3. Build email sets from Instantly leads ───────────────────────────────
  interface InstLead {
    email: string
    company: string
    campaignName: string
    sent: boolean
    opened: boolean
    replied: boolean
    bounced: boolean
    lastContact: string
    opens: number
    replies: number
  }

  const instByEmail = new Map<string, InstLead>()
  const campaignStats: RutaResponse['campaigns'] = []

  for (const { campaign, leads } of leadsPerCampaign) {
    let sent = 0, opened = 0, replied = 0, bounced = 0
    for (const lead of leads) {
      const email = (lead.email ?? '').toLowerCase()
      if (!email) continue
      const isSent    = lead.status >= 1
      const isOpened  = (lead.email_open_count ?? 0) > 0
      const isReplied = (lead.email_reply_count ?? 0) > 0
      const isBounced = lead.status === -1
      if (isSent)    sent++
      if (isOpened)  opened++
      if (isReplied) replied++
      if (isBounced) bounced++

      if (!instByEmail.has(email)) {
        instByEmail.set(email, {
          email,
          company: lead.company_name || lead.company_domain || '',
          campaignName: campaign.name.replace(/ - [Aa]rtiverse/, ''),
          sent: isSent,
          opened: isOpened,
          replied: isReplied,
          bounced: isBounced,
          lastContact: lead.timestamp_last_contact ?? '',
          opens: lead.email_open_count ?? 0,
          replies: lead.email_reply_count ?? 0,
        })
      }
    }
    campaignStats.push({
      id: campaign.id,
      name: campaign.name.replace(/ - [Aa]rtiverse/, ''),
      sent, opened, replied, bounced,
    })
  }

  // ── 4. Build Artiverse email map ───────────────────────────────────────────
  const artByEmail = new Map<string, any>()
  for (const u of artUsers) {
    if (u.email) artByEmail.set(u.email.toLowerCase(), u)
  }

  // ── 5. Initialize nodes ────────────────────────────────────────────────────
  const nodes: Record<string, RutaNode> = {
    base_contactos:         makeNode(),
    sin_contactar:          makeNode(),
    enviado:                makeNode(),
    abierto:                makeNode(),
    respondido:             makeNode(),
    bounced:                makeNode(),
    registrado:             makeNode(),
    verificado:             makeNode(),
    perfil_completo:        makeNode(),
    agencia_registrada:     makeNode(),
    programador_explorando: makeNode(),
    pro_agencia:            makeNode(),
    pro_programador:        makeNode(),
    total_pro:              makeNode(),
  }

  // ── 6. Process Excel contacts — base universe + Instantly enrichment ────────
  for (const ec of excelContacts) {
    const email = (ec.email ?? '').toLowerCase()
    if (!email) continue
    const seg = ec.segment ?? 'Otros'
    const il  = instByEmail.get(email)
    const av  = artByEmail.get(email)

    const base: RutaContact = {
      email,
      company:  ec.company  || il?.company || '',
      contact:  ec.contact  || '',
      phone:    ec.phone    || '',
      website:  ec.website  || '',
      city:     ec.city     || '',
      segment:  seg,
      source:   'excel',
      ...(il ? {
        campaignName: il.campaignName,
        lastContact:  il.lastContact,
        opens:        il.opens,
        replies:      il.replies,
      } : {}),
      ...(av ? {
        artName:      av.name ?? '',
        subscription: artPlanType(av.subscription),
        hasAgency:    (av.agencies ?? []).length > 0,
        agencyName:   av.agencies?.[0]?.displayName ?? '',
        registeredAt: av.createdAt ?? '',
      } : {}),
    }

    addContact(nodes.base_contactos, base, seg)

    if (!il) {
      // Not in any Instantly campaign → sin contactar
      addContact(nodes.sin_contactar, base, seg)
    } else if (il.bounced) {
      addContact(nodes.bounced, base, il.campaignName)
    } else if (il.replied) {
      addContact(nodes.respondido, base, il.campaignName)
    } else if (il.opened) {
      addContact(nodes.abierto, base, il.campaignName)
    } else if (il.sent) {
      addContact(nodes.enviado, base, il.campaignName)
    }
  }

  // ── 7. Instantly leads NOT in Excel (added directly to campaigns) ──────────
  for (const [email, il] of Array.from(instByEmail)) {
    if (excelByEmail.has(email)) continue   // already counted above
    const av   = artByEmail.get(email)
    const base: RutaContact = {
      email,
      company:     il.company,
      contact:     '',
      phone:       '',
      website:     '',
      city:        '',
      segment:     'Instantly',
      source:      'instantly',
      campaignName: il.campaignName,
      lastContact:  il.lastContact,
      opens:        il.opens,
      replies:      il.replies,
      ...(av ? {
        artName:      av.name ?? '',
        subscription: artPlanType(av.subscription),
        hasAgency:    (av.agencies ?? []).length > 0,
        agencyName:   av.agencies?.[0]?.displayName ?? '',
        registeredAt: av.createdAt ?? '',
      } : {}),
    }

    // Still add to base (they exist somewhere)
    addContact(nodes.base_contactos, base, 'Instantly')

    if (il.bounced)      addContact(nodes.bounced,    base, il.campaignName)
    else if (il.replied) addContact(nodes.respondido,  base, il.campaignName)
    else if (il.opened)  addContact(nodes.abierto,     base, il.campaignName)
    else if (il.sent)    addContact(nodes.enviado,     base, il.campaignName)
  }

  // ── 8. Artiverse users (platform funnel) ──────────────────────────────────
  for (const u of artUsers) {
    const email     = (u.email ?? '').toLowerCase()
    if (!email) continue
    const agencies  = u.agencies ?? []
    const hasAgency = agencies.length > 0
    const plan      = artPlanType(u.subscription)
    const profComp  = u.profile != null || u.promoter != null
    const verified  = u.emailVerified ?? false
    const agName    = agencies[0]?.displayName ?? agencies[0]?.legalName ?? ''
    const excelC    = excelByEmail.get(email)
    const seg       = excelC?.segment ?? (hasAgency ? 'Agencia' : 'Programador')

    const artC: RutaContact = {
      email,
      company:     agName || u.name || '',
      contact:     u.name ?? '',
      phone:       '',
      website:     agencies[0]?.website ?? '',
      city:        agencies[0]?.city ?? '',
      segment:     seg,
      artName:     u.name ?? '',
      subscription: plan,
      hasAgency,
      agencyName:  agName,
      registeredAt: u.createdAt ?? '',
      source:      'artiverse',
    }

    addContact(nodes.registrado, artC, seg)

    if (verified) {
      addContact(nodes.verificado, artC, seg)
      if (profComp) {
        addContact(nodes.perfil_completo, artC, seg)
        if (hasAgency) {
          addContact(nodes.agencia_registrada, artC, seg)
          if (plan !== 'free') {
            addContact(nodes.pro_agencia, artC, 'Agencia Pro')
            addContact(nodes.total_pro,   artC, 'Agencia Pro')
          }
        } else {
          addContact(nodes.programador_explorando, artC, seg)
          if (plan !== 'free') {
            addContact(nodes.pro_programador, artC, 'Programador Pro')
            addContact(nodes.total_pro,       artC, 'Programador Pro')
          }
        }
      }
    }
  }

  // ── 9. Conversion rates ────────────────────────────────────────────────────
  // Platform users who were originally contacted via our campaigns
  let usersFromCampaigns = 0
  const fromCampaignsList: RutaContact[] = []
  for (const u of artUsers) {
    const email = (u.email ?? '').toLowerCase()
    if (!email || !instByEmail.has(email)) continue
    usersFromCampaigns++
    const il       = instByEmail.get(email)!
    const excelC   = excelByEmail.get(email)
    const agencies = u.agencies ?? []
    const plan     = artPlanType(u.subscription)
    fromCampaignsList.push({
      email,
      company:     agencies[0]?.displayName ?? agencies[0]?.legalName ?? il.company ?? excelC?.company ?? '',
      contact:     u.name ?? '',
      phone:       '',
      website:     agencies[0]?.website ?? excelC?.website ?? '',
      city:        agencies[0]?.city ?? excelC?.city ?? '',
      segment:     excelC?.segment ?? (agencies.length > 0 ? 'Agencia' : 'Programador'),
      source:      'artiverse',
      campaignName:  il.campaignName,
      lastContact:   il.lastContact,
      opens:         il.opens,
      replies:       il.replies,
      artName:       u.name ?? '',
      subscription:  plan,
      hasAgency:     agencies.length > 0,
      agencyName:    agencies[0]?.displayName ?? agencies[0]?.legalName ?? '',
      registeredAt:  u.createdAt ?? '',
    })
  }

  function rate(a: number, b: number): number | null {
    if (!b) return null
    return Math.round((a / b) * 1000) / 1000
  }

  const conversion_rates = {
    base_to_enviado:           rate(nodes.enviado.count,                nodes.base_contactos.count),
    enviado_to_abierto:        rate(nodes.abierto.count,                nodes.enviado.count),
    abierto_to_respondido:     rate(nodes.respondido.count,             nodes.abierto.count),
    respondido_to_registrado:  rate(nodes.registrado.count,             nodes.respondido.count),
    registrado_to_verificado:  rate(nodes.verificado.count,             nodes.registrado.count),
    verificado_to_perfil:      rate(nodes.perfil_completo.count,        nodes.verificado.count),
    perfil_to_agencia:         rate(nodes.agencia_registrada.count,     nodes.perfil_completo.count),
    perfil_to_programador:     rate(nodes.programador_explorando.count,  nodes.perfil_completo.count),
    registrado_to_pro:         rate(nodes.total_pro.count,              nodes.registrado.count),
    base_to_pro:               rate(nodes.total_pro.count,              nodes.base_contactos.count),
  }

  return {
    last_updated:  new Date().toISOString(),
    total_base:    nodes.base_contactos.count,
    nodes,
    conversion_rates,
    campaigns:     campaignStats,
    usersFromCampaigns,
    fromCampaignsList,
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
    const data = await buildRuta()
    _cache = { data, ts: now }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Ruta API Error:', err)
    if (_cache) return NextResponse.json({ ..._cache.data, cached: true, stale: true })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
