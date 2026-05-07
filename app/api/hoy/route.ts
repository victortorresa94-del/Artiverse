/**
 * GET /api/hoy?token=AETHER2026
 *
 * Aggregates urgent actions for the day:
 *   - Contacts that replied but haven't been classified (needsReply)
 *   - Contacts with 3+ opens and no reply (hotOpened)
 *   - New Artiverse users registered today (newToday)
 *
 * Fetches internally from /api/pipeline and /api/artiverse-users.
 * Cache: 2 minutes in-memory.
 */

import { NextResponse } from 'next/server'

const TOKEN    = 'AETHER2026'
const CACHE_TTL = 2 * 60 * 1000

interface CacheEntry { data: any; ts: number }
let _cache: CacheEntry | null = null

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  if (searchParams.get('token') !== TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  if (_cache && now - _cache.ts < CACHE_TTL) {
    return NextResponse.json({ ..._cache.data, cached: true })
  }

  try {
    const [pipelineRes, usersRes] = await Promise.all([
      fetch(`${origin}/api/pipeline?token=${TOKEN}`, { cache: 'no-store' }),
      fetch(`${origin}/api/artiverse-users`, { cache: 'no-store' }),
    ])

    const pipeline = pipelineRes.ok ? await pipelineRes.json() : { contacts: [], stats: {} }
    const users    = usersRes.ok    ? await usersRes.json()    : { todayUsers: [], stats: {} }

    const contacts: any[] = pipeline.contacts ?? []

    // Today's date (YYYY-MM-DD) for filtering email activity
    const todayStr = new Date().toISOString().slice(0, 10)
    const sentToday   = contacts.filter((c: any) => c.lastContact?.startsWith(todayStr)).length
    const openedToday = contacts.filter((c: any) => c.lastOpen?.startsWith(todayStr)).length

    // Contacts that replied (need manual response)
    const needsReply = contacts
      .filter((c: any) => c.phase === 'contestado')
      .slice(0, 20)
      .map((c: any) => ({
        email:       c.email,
        company:     c.company,
        campaignName: c.campaignName,
        replies:     c.replies,
        lastReply:   c.lastReply,
        phase:       c.phase,
      }))

    // Hot contacts: 3+ opens, no reply
    const hotOpened = contacts
      .filter((c: any) => c.opens >= 3 && c.replies === 0 && c.phase !== 'bounced')
      .sort((a: any, b: any) => (b.opens - a.opens))
      .slice(0, 10)
      .map((c: any) => ({
        email:       c.email,
        company:     c.company,
        campaignName: c.campaignName,
        opens:       c.opens,
        lastOpen:    c.lastOpen,
        phase:       c.phase,
      }))

    // New Artiverse registrations today
    const newToday = (users.todayUsers ?? [])
      .slice(0, 10)
      .map((u: any) => ({
        email:        u.email,
        name:         u.name,
        subscription: u.subscription?.planType ?? u.subscription ?? 'free',
        hasAgency:    (u.agencies ?? []).length > 0,
        createdAt:    u.createdAt,
      }))

    const data = {
      last_updated: new Date().toISOString(),
      needsReply,
      hotOpened,
      newToday,
      stats: {
        totalNeedsReply: needsReply.length,
        totalHot:        hotOpened.length,
        totalNewToday:   newToday.length,
        totalOutbound:   pipeline.stats?.totalOutbound   ?? 0,
        totalInPlatform: pipeline.stats?.totalInPlatform ?? 0,
        artiverseTotal:  users.stats?.total              ?? 0,
        artiverseToday:  users.stats?.today              ?? 0,
        sentToday,
        openedToday,
      },
    }

    _cache = { data, ts: now }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Hoy API Error:', err)
    if (_cache) return NextResponse.json({ ..._cache.data, cached: true, stale: true })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
