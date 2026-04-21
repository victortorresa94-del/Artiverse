/**
 * GET /api/summary?token=AETHER2026
 *
 * Devuelve stats reales de todas las campañas de Instantly.
 * Estrategia:
 *   1. Fetch all campaigns → filter [AI SDR]
 *   2. Per campaign, fetch up to 100 leads IN PARALLEL → count statuses
 *   3. For campaigns where live leads = 0 (NO_LIST like Teatros), fallback to stats.json
 *   4. In-memory cache 5 min to avoid hammering the Instantly API
 *
 * Lead status codes:
 *   0 = not_contacted | 1 = sending | 2 = sent | 3 = opened | 4 = replied | -1 = bounced
 */

import { NextResponse } from 'next/server'
import statsJson from '@/data/stats.json'

const KEY   = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const BASE  = 'https://api.instantly.ai/api/v2'
const TOKEN = 'AETHER2026'

// ── In-memory cache ────────────────────────────────────────────────────────────

interface CacheEntry { data: SummaryResponse; ts: number }
let _cache: CacheEntry | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ── Types ──────────────────────────────────────────────────────────────────────

interface LeadCounts {
  leads_count: number
  sent:        number
  opened:      number
  replied:     number
  bounced:     number
}

interface CampaignSummary extends LeadCounts {
  id:         string
  name:       string
  status:     string
  open_rate:  number
  reply_rate: number
}

interface SummaryResponse {
  last_updated:             string
  total_campaigns:          number
  campaigns:                CampaignSummary[]
  total_leads:              number
  total_sent:               number
  total_opened:             number
  open_rate:                number
  total_replied:            number
  reply_rate:               number
  top_campaign_by_reply_rate: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function instantlyHeaders() {
  return { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
}

/** Fetch campaign list from Instantly, filter out [AI SDR] campaigns */
async function fetchCampaigns(): Promise<{ id: string; name: string; status: number }[]> {
  const res = await fetch(`${BASE}/campaigns?limit=100`, {
    headers: instantlyHeaders(),
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Campaigns fetch failed: ${res.status}`)
  const data = await res.json()
  const items: { id: string; name: string; status: number }[] = data.items ?? data ?? []
  return items.filter(c => !c.name.includes('[AI SDR]'))
}

/** Fetch up to 100 leads for a campaign and count statuses. 8s timeout. */
async function fetchCampaignLeads(campaignId: string): Promise<LeadCounts> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(`${BASE}/leads/list`, {
      method:  'POST',
      headers: instantlyHeaders(),
      body:    JSON.stringify({ campaign: campaignId, limit: 100 }),
      signal:  controller.signal,
      cache:   'no-store',
    })

    if (!res.ok) return zero()

    const data  = await res.json()
    const items: { status: number }[] = data.items ?? []

    return {
      leads_count: items.length,
      sent:        items.filter(l => l.status >= 1).length,
      opened:      items.filter(l => l.status >= 3).length,
      replied:     items.filter(l => l.status === 4).length,
      bounced:     items.filter(l => l.status === -1).length,
    }
  } catch {
    return zero()
  } finally {
    clearTimeout(tid)
  }
}

function zero(): LeadCounts {
  return { leads_count: 0, sent: 0, opened: 0, replied: 0, bounced: 0 }
}

/** Look up stats.json by campaign name (exact match or partial) */
function statsJsonFallback(name: string): LeadCounts | null {
  const stats = statsJson as Record<string, {
    sent: number; opened: number; replied: number
  }>

  // exact match first
  const entry = stats[name] ?? Object.values(stats).find(
    v => (v as any).campaignName === name
  )

  if (!entry || entry.sent === 0) return null

  return {
    leads_count: entry.sent,
    sent:        entry.sent,
    opened:      entry.opened,
    replied:     entry.replied,
    bounced:     0,
  }
}

function statusLabel(s: number): string {
  if (s === 1) return 'active'
  if (s === 2) return 'paused'
  if (s === 3) return 'completed'
  return 'pending'
}

// ── Main builder ───────────────────────────────────────────────────────────────

async function buildSummary(): Promise<SummaryResponse> {
  const campaigns = await fetchCampaigns()

  // Fetch all campaign leads IN PARALLEL — rate-friendly because each call is
  // a single POST, and we do it once every 5 min thanks to the cache.
  const counts = await Promise.all(
    campaigns.map(c => fetchCampaignLeads(c.id))
  )

  let total_leads   = 0
  let total_sent    = 0
  let total_opened  = 0
  let total_replied = 0
  let top           = ''
  let topRate       = -1

  const summaries: CampaignSummary[] = campaigns.map((c, i) => {
    let lc = counts[i]

    // If live data shows 0 sent, try stats.json fallback (covers NO_LIST campaigns)
    if (lc.sent === 0) {
      const fb = statsJsonFallback(c.name)
      if (fb) lc = fb
    }

    const open_rate  = lc.sent > 0 ? +(lc.opened  / lc.sent).toFixed(3) : 0
    const reply_rate = lc.sent > 0 ? +(lc.replied / lc.sent).toFixed(3) : 0

    total_leads   += lc.leads_count
    total_sent    += lc.sent
    total_opened  += lc.opened
    total_replied += lc.replied

    if (reply_rate > topRate) { topRate = reply_rate; top = c.name }

    return {
      id:         c.id,
      name:       c.name,
      status:     statusLabel(c.status),
      leads_count: lc.leads_count,
      sent:       lc.sent,
      opened:     lc.opened,
      replied:    lc.replied,
      bounced:    lc.bounced,
      open_rate,
      reply_rate,
    }
  })

  return {
    last_updated:               new Date().toISOString(),
    total_campaigns:            campaigns.length,
    campaigns:                  summaries,
    total_leads,
    total_sent,
    total_opened,
    open_rate:   total_sent > 0 ? +(total_opened  / total_sent).toFixed(3) : 0,
    total_replied,
    reply_rate:  total_sent > 0 ? +(total_replied / total_sent).toFixed(3) : 0,
    top_campaign_by_reply_rate: top,
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (token !== TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Serve from cache if fresh
  const now = Date.now()
  if (_cache && now - _cache.ts < CACHE_TTL) {
    return NextResponse.json({ ..._cache.data, cached: true })
  }

  try {
    const data = await buildSummary()
    _cache = { data, ts: now }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Summary API Error:', err)
    // Return stale cache on error rather than failing completely
    if (_cache) return NextResponse.json({ ..._cache.data, cached: true, stale: true })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
