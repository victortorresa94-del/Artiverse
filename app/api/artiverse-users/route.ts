/**
 * /api/artiverse-users
 *
 * Conecta con la API real de Artiverse para obtener usuarios registrados.
 * Endpoints de Artiverse:
 *   GET https://api.artiverse.es/admin/marketing/users?limit=N&cursor=X
 *   GET https://api.artiverse.es/admin/marketing/users/by-email/:email
 *
 * Paginación cursor-based: la respuesta devuelve un campo `cursor` que
 * se usa como query param ?cursor=X en la siguiente petición.
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

async function fetchPage(cursor?: string, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return artiverse(`/admin/marketing/users?${params}`)
}

async function fetchAllUsers(maxUsers = 500) {
  const users: ArtiverseUser[] = []
  let cursor: string | undefined

  do {
    const data = await fetchPage(cursor, 100)

    // Normalize: the API might return users in different keys
    const items: ArtiverseUser[] =
      data.users ?? data.items ?? data.data ?? data.results ?? []

    users.push(...items)

    // The API returns the next cursor in the body
    cursor = data.cursor ?? data.nextCursor ?? data.next_cursor ?? undefined

    if (!cursor || items.length === 0 || users.length >= maxUsers) break
  } while (true)

  return users
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArtiverseUser {
  id?: string
  _id?: string
  email?: string
  name?: string
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  company?: string
  companyName?: string
  company_name?: string
  role?: string
  subscription?: string
  plan?: string
  createdAt?: string
  created_at?: string
  updatedAt?: string
  emailVerified?: boolean
  email_verified?: boolean
  profileComplete?: boolean
  profile_complete?: boolean
  hasAgency?: boolean
  agencyName?: string
  [key: string]: unknown
}

function normalizeUser(u: ArtiverseUser) {
  const registeredAt = u.createdAt ?? u.created_at ?? ''
  return {
    id: u.id ?? u._id ?? '',
    email: u.email ?? '',
    name: u.name ?? `${u.firstName ?? u.first_name ?? ''} ${u.lastName ?? u.last_name ?? ''}`.trim(),
    company: u.company ?? u.companyName ?? u.company_name ?? '',
    role: u.role ?? 'user',
    subscription: u.subscription ?? u.plan ?? 'free',
    registeredAt,
    registeredDate: registeredAt ? registeredAt.slice(0, 10) : '',
    emailVerified: u.emailVerified ?? u.email_verified ?? false,
    profileComplete: u.profileComplete ?? u.profile_complete ?? false,
    hasAgency: u.hasAgency ?? false,
    agencyName: u.agencyName ?? '',
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
      const items: ArtiverseUser[] = data.users ?? data.items ?? data.data ?? data.results ?? []
      const normalized = items.map(normalizeUser)
      return NextResponse.json({
        users: normalized,
        cursor: data.cursor ?? data.nextCursor ?? data.next_cursor ?? null,
        total: data.total ?? data.count ?? null,
      })
    }

    // Default: fetch all (up to 500) and compute stats
    const rawUsers = await fetchAllUsers(500)
    const users = rawUsers.map(normalizeUser)

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

    return NextResponse.json({
      users,
      stats: {
        total: users.length,
        today: todayUsers.length,
        thisWeek: weekUsers.length,
        verified: users.filter(u => u.emailVerified).length,
        profileComplete: users.filter(u => u.profileComplete).length,
        withAgency: users.filter(u => u.hasAgency).length,
        free: users.filter(u => u.subscription === 'free').length,
        pro:  users.filter(u => u.subscription !== 'free').length,
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
