/**
 * /api/registrados
 *
 * Fuente de verdad: la lista platformUsers de mock.ts (115 usuarios reales de Artiverse).
 * Cruza esa lista con Instantly para saber cuántos de los 2597 contactos de email
 * ya están dentro de la plataforma.
 *
 * Responde rápido (mock data inmediata) + enriquece con datos live de Instantly.
 */
import { NextResponse } from 'next/server'
import { platformUsers } from '@/data/mock'

const KEY = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='

// ── Email lookup set for fast O(1) cross-reference ───────────────────────────
const PLATFORM_EMAILS = new Map<string, typeof platformUsers[0]>()
for (const u of platformUsers) {
  PLATFORM_EMAILS.set(u.email.toLowerCase().trim(), u)
}

async function fetchInstantlyLeads(limit = 500): Promise<{ items: any[]; total: number }> {
  const items: any[] = []
  let cursor: string | null = null
  let pages = 0
  const maxPages = Math.ceil(limit / 100)

  while (pages < maxPages) {
    const body: Record<string, unknown> = { limit: 100 }
    if (cursor) body.starting_after = cursor
    const res = await fetch('https://api.instantly.ai/api/v2/leads/list', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    })
    if (!res.ok) break
    const data = await res.json()
    if (!data.items?.length) break
    items.push(...data.items)
    cursor = data.next_starting_after || null
    pages++
    if (!cursor || items.length >= limit) break
  }

  return { items, total: items.length }
}

export async function GET() {
  // ── Fast response from static data ──────────────────────────────────────────
  const fromCampaign = platformUsers.filter(u => u.source === 'outreach')
  const fromOrganic  = platformUsers.filter(u => u.source === 'organic' || u.source === 'referral')
  const total        = platformUsers.length

  // Build sorted list: outreach first, then others
  const sortedUsers = [
    ...fromCampaign.map(u => ({
      email: u.email,
      name: u.name,
      company: u.company || u.agencyName || '',
      source: u.source,
      inboundStage: u.inboundStage,
      subscription: u.subscription,
      emailVerified: u.emailVerified,
    })),
    ...platformUsers
      .filter(u => u.source !== 'outreach')
      .slice(0, 5)
      .map(u => ({
        email: u.email,
        name: u.name,
        company: u.company || u.agencyName || '',
        source: u.source,
        inboundStage: u.inboundStage,
        subscription: u.subscription,
        emailVerified: u.emailVerified,
      })),
  ]

  try {
    // ── Live cross-reference with Instantly leads ────────────────────────────
    // Fetch first 500 leads to find cross-over users
    const { items: instantlyLeads, total: fetched } = await fetchInstantlyLeads(500)

    // Build set of Instantly emails for cross-reference
    const instantlyEmailSet = new Set(instantlyLeads.map(l => (l.email || '').toLowerCase().trim()))

    // Count how many platformUsers are in Instantly's lead list
    let confirmedInInstantly = 0
    const confirmedList: string[] = []
    for (const [email, user] of PLATFORM_EMAILS) {
      if (instantlyEmailSet.has(email)) {
        confirmedInInstantly++
        confirmedList.push(user.company || user.email)
      }
    }

    return NextResponse.json({
      registeredCount: total,
      fromCampaign: fromCampaign.length,
      fromOrganic: fromOrganic.length,
      confirmedInInstantly,
      confirmedList: confirmedList.slice(0, 10),
      instantlyLeadsFetched: fetched,
      registeredUsers: sortedUsers,
      updatedAt: new Date().toISOString(),
    })
  } catch {
    // Fallback: return platformUsers data without Instantly cross-reference
    return NextResponse.json({
      registeredCount: total,
      fromCampaign: fromCampaign.length,
      fromOrganic: fromOrganic.length,
      confirmedInInstantly: null,
      confirmedList: [],
      instantlyLeadsFetched: 0,
      registeredUsers: sortedUsers,
      updatedAt: new Date().toISOString(),
      _fallback: true,
    })
  }
}
