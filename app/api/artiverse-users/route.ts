/**
 * /api/artiverse-users
 *
 * Conecta con la API real de Artiverse para obtener usuarios registrados.
 * Endpoints de Artiverse:
 *   GET https://api.artiverse.es/admin/marketing/users?limit=N&cursor=X
 *   GET https://api.artiverse.es/admin/marketing/users/by-email/:email
 *
 * Estructura real de la respuesta:
 *   { data: [...], nextCursor: string|null, hasMore: boolean, count: number }
 *
 * Cada usuario:
 *   { name, email, emailVerified, profile, promoter, subscription: { planType },
 *     agencies: [{ displayName, artists: [...] }], createdAt, updatedAt }
 *
 * Rate limit: 30 req/min — this route fetches at most ceil(total/100) pages per call.
 * With ~124 users that's 2 requests. We cache-bust with revalidate:0 per call,
 * but the dashboard only polls every 5 min so we stay well within limits.
 */
import { NextRequest, NextResponse } from 'next/server'

const ARTIVERSE_KEY = process.env.ARTIVERSE_API_KEY || ''
const ARTIVERSE_API = 'https://api.artiverse.es'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function artiverse(path: string) {
  const res = await fetch(`${ARTIVERSE_API}${path}`, {
    headers: { 'x-api-key': ARTIVERSE_KEY, 'Content-Type': 'application/json' },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Artiverse API ${res.status}: ${body}`)
  }
  return res.json()
}

async function fetchPage(cursor?: string, limit = 100) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return artiverse(`/admin/marketing/users?${params}`)
}

async function fetchAllUsers(maxUsers = 500) {
  const users: ArtiverseUser[] = []
  let cursor: string | undefined

  do {
    const data = await fetchPage(cursor, 100)

    // API returns users under "data" key
    const items: ArtiverseUser[] =
      data.data ?? data.users ?? data.items ?? data.results ?? []

    users.push(...items)

    // API uses nextCursor for pagination
    cursor = data.nextCursor ?? data.cursor ?? data.next_cursor ?? undefined

    if (!cursor || !data.hasMore || items.length === 0 || users.length >= maxUsers) break
  } while (true)

  return users
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArtiverseSubscription {
  planType?: string       // 'free' | 'pro' | 'business'
  entityType?: string     // 'promoter' | 'agency' | 'artist'
  billingCycle?: string | null
  status?: string
  currentPeriodEnd?: string | null
  createdAt?: string
}

interface ArtiverseArtist {
  artistName?: string
  email?: string
}

interface ArtiverseAgency {
  displayName?: string
  legalName?: string
  city?: string
  country?: string
  subscription?: ArtiverseSubscription
  artists?: ArtiverseArtist[]
}

interface ArtiverseUser {
  name?: string
  email?: string
  emailVerified?: boolean
  profile?: unknown
  promoter?: unknown
  subscription?: ArtiverseSubscription | string
  agencies?: ArtiverseAgency[]
  createdAt?: string
  updatedAt?: string
  // legacy / fallback fields
  id?: string
  _id?: string
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  company?: string
  companyName?: string
  role?: string
  plan?: string
  email_verified?: boolean
  profileComplete?: boolean
  profile_complete?: boolean
  hasAgency?: boolean
  agencyName?: string
  [key: string]: unknown
}

function getPlanType(subscription: ArtiverseSubscription | string | undefined): string {
  if (!subscription) return 'free'
  if (typeof subscription === 'string') return subscription
  return subscription.planType ?? 'free'
}

function normalizeUser(u: ArtiverseUser) {
  const registeredAt = u.createdAt ?? ''
  const agencies = u.agencies ?? []
  const hasAgency = agencies.length > 0
  const agency = agencies[0]
  const agencyName = agency?.displayName ?? agency?.legalName ?? ''
  const company = agencyName || (u.company ?? u.companyName ?? '')

  // profileComplete: true if the user has a promoter or profile filled in
  const profileComplete =
    u.profile != null ||
    u.promoter != null ||
    (u.profileComplete ?? u.profile_complete ?? false)

  const planType = getPlanType(u.subscription as ArtiverseSubscription | string)

  return {
    id: u.id ?? u._id ?? u.email ?? '',
    email: u.email ?? '',
    name: u.name ?? `${u.firstName ?? u.first_name ?? ''} ${u.lastName ?? u.last_name ?? ''}`.trim(),
    company,
    role: u.role ?? 'user',
    subscription: planType,
    registeredAt,
    registeredDate: registeredAt ? registeredAt.slice(0, 10) : '',
    emailVerified: u.emailVerified ?? u.email_verified ?? false,
    profileComplete,
    hasAgency,
    agencyName,
    city: agency?.city ?? '',
    country: agency?.country ?? '',
  }
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const today = new Date().toISOString().slice(0, 10)
  return dateStr.startsWith(today)
}

function isThisWeek(dateStr: string): boolean {
  if (!dateStr) return false
  const now = new Date()
  const d = new Date(dateStr)
  const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  return diff <= 7
}

// Count unique agencies and artists across all users
function computeEntityCounts(rawUsers: ArtiverseUser[]) {
  // Track unique agencies by displayName/legalName to avoid duplicates
  const agencyNames = new Set<string>()
  let artistCount = 0

  for (const u of rawUsers) {
    const agencies = u.agencies ?? []
    for (const a of agencies) {
      const key = a.displayName ?? a.legalName ?? ''
      if (key) agencyNames.add(key)
      artistCount += (a.artists ?? []).length
    }
  }

  return {
    agencyCount: agencyNames.size,
    artistCount,
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') // 'page' | 'all' | 'stats'
  const cursor = searchParams.get('cursor') || undefined
  const limit = Number(searchParams.get('limit') || 50)

  if (!ARTIVERSE_KEY) {
    return NextResponse.json({ error: 'ARTIVERSE_API_KEY not configured' }, { status: 500 })
  }

  try {
    if (mode === 'page') {
      // Single page — for the usuarios page infinite scroll
      const data = await fetchPage(cursor, limit)
      const items: ArtiverseUser[] = data.data ?? data.users ?? data.items ?? data.results ?? []
      const normalized = items.map(normalizeUser)
      return NextResponse.json({
        users: normalized,
        cursor: data.nextCursor ?? data.cursor ?? data.next_cursor ?? null,
        total: data.count ?? data.total ?? null,
      })
    }

    // Default: fetch all (up to 500) and compute stats
    const rawUsers = await fetchAllUsers(500)
    const users = rawUsers.map(normalizeUser)

    // Entity counts (agencies, artists) from raw data before normalization
    const { agencyCount, artistCount } = computeEntityCounts(rawUsers)

    // Compute daily registration stats (last 14 days)
    const dailyMap: Record<string, number> = {}
    users.forEach(u => {
      const date = u.registeredDate
      if (date) dailyMap[date] = (dailyMap[date] ?? 0) + 1
    })

    // Sort dates desc
    const daily = Object.entries(dailyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 14)
      .map(([date, count]) => ({ date, count }))

    const todayUsers = users.filter(u => isToday(u.registeredAt))
    const weekUsers  = users.filter(u => isThisWeek(u.registeredAt))

    const freeUsers = users.filter(u => u.subscription === 'free')
    const proUsers  = users.filter(u => u.subscription !== 'free')

    return NextResponse.json({
      users,
      stats: {
        total: users.length,
        today: todayUsers.length,
        thisWeek: weekUsers.length,
        verified: users.filter(u => u.emailVerified).length,
        profileComplete: users.filter(u => u.profileComplete).length,
        withAgency: users.filter(u => u.hasAgency).length,
        free: freeUsers.length,
        pro: proUsers.length,
        // Platform entity counts
        agencyCount,
        artistCount,
      },
      daily,
      todayUsers,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const msg = String(err)
    const status = msg.includes('401') ? 401 : msg.includes('403') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
