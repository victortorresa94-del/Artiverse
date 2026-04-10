import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function readSavedStats(): Record<string, any> {
  const f = join(process.cwd(), 'data', 'stats.json')
  if (!existsSync(f)) return {}
  try { return JSON.parse(readFileSync(f, 'utf-8')) } catch { return {} }
}

const KEY = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='

async function instantly(path: string, body?: object) {
  const res = await fetch(`https://api.instantly.ai${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    next: { revalidate: 0 },
  })
  return res.json()
}

async function getAllLeadsForList(listId: string) {
  const leads: any[] = []
  let cursor: string | null = null
  do {
    const body: any = { limit: 100, list_id: listId }
    if (cursor) body.starting_after = cursor
    const r = await instantly('/api/v2/leads/list', body)
    if (!r.items) break
    leads.push(...r.items)
    cursor = r.next_starting_after || null
  } while (cursor)
  return leads
}

async function getAllLeads() {
  const leads: any[] = []
  let cursor: string | null = null
  do {
    const body: any = { limit: 100 }
    if (cursor) body.starting_after = cursor
    const r = await instantly('/api/v2/leads/list', body)
    if (!r.items) break
    leads.push(...r.items)
    cursor = r.next_starting_after || null
  } while (cursor)
  return leads
}

function computeStats(leads: any[]) {
  const total = leads.length
  const sent = leads.filter(l => l.status >= 1 && l.status !== -1).length
  const opened = leads.filter(l => l.status >= 3).length
  const replied = leads.filter(l => l.status === 4).length
  const bounced = leads.filter(l => l.status === -1).length
  const openRate = sent > 0 ? +((opened / sent) * 100).toFixed(1) : 0
  const replyRate = sent > 0 ? +((replied / sent) * 100).toFixed(1) : 0
  return { total, sent, opened, replied, bounced, openRate, replyRate }
}

export async function GET() {
  try {
    // 1. Get all campaigns — filter out AI SDR (Aether Labs) campaigns, this dashboard is Artiverse only
    const campData = await instantly('/api/v2/campaigns?limit=50')
    const campaigns = (campData.items || []).filter((c: any) =>
      !c.name.includes('[AI SDR]') && !c.name.toLowerCase().includes('ai sdr')
    )

    // 2. Get all lead lists
    const listData = await instantly('/api/v2/lead-lists?limit=50')
    const lists: any[] = listData.items || []

    // 3. Get ALL leads (for NO_LIST ones = Teatros + Calentamiento)
    const allLeads = await getAllLeads()

    // 4. Build stats per campaign
    // Map: campaign name -> lead list
    const listByName: Record<string, any> = {}
    lists.forEach(l => { listByName[l.name] = l })

    const result = await Promise.all(campaigns.map(async (c: any) => {
      // Find associated lead list by matching names
      const matchedList = lists.find(l =>
        l.name === c.name ||
        l.name.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(l.name.toLowerCase())
      )

      let leads: any[]
      if (matchedList) {
        leads = allLeads.filter(l => l.list_id === matchedList.id)
      } else {
        // Campaign has no list — leads are in NO_LIST pool
        // We can't precisely map them, so return aggregate of NO_LIST
        leads = [] // Will be handled separately
      }

      const stats = computeStats(leads)
      const steps = c.sequences?.[0]?.steps || []

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        emailList: c.email_list || [],
        listId: matchedList?.id || null,
        ...stats,
        steps: steps.map((s: any, i: number) => ({
          step: i + 1,
          delayDays: s.delay || 0,
          subject: s.variants?.[0]?.subject || '',
          body: s.variants?.[0]?.body || '',
        })),
      }
    }))

    // 5. Handle the NO_LIST leads (old campaigns: Teatros, Calentamiento)
    // NOTE: We do NOT distribute NO_LIST aggregate to per-campaign stats because:
    // - The NO_LIST pool includes leads from other workspaces/campaigns we can't distinguish
    // - stats.json (CSV imports) is the source of truth for these campaigns (see step 5b below)
    // Campaigns without a list keep their computed stats (0 if no leads found) — CSV import overrides below

    // 5b. Merge saved stats (from CSV imports) — overrides computed stats
    const savedStats = readSavedStats()
    result.forEach(c => {
      const saved = savedStats[c.id] || savedStats[c.name]
      if (saved) {
        c.sent = saved.sent ?? c.sent
        c.opened = saved.opened ?? c.opened
        c.replied = saved.replied ?? c.replied
        c.openRate = saved.openRate ?? c.openRate
        c.replyRate = saved.replyRate ?? c.replyRate
        c._statsSource = 'csv'
      }
    })

    // 6. Global summary
    const totalSent = result.reduce((s, c) => s + c.sent, 0)
    const totalContacts = result.reduce((s, c) => s + c.total, 0)
    const activeCamps = result.filter(c => c.sent > 0)
    const avgOpenRate = activeCamps.length > 0
      ? +(activeCamps.reduce((s, c) => s + c.openRate, 0) / activeCamps.length).toFixed(1)
      : 0
    const avgReplyRate = activeCamps.length > 0
      ? +(activeCamps.reduce((s, c) => s + c.replyRate, 0) / activeCamps.length).toFixed(1)
      : 0

    return NextResponse.json({
      campaigns: result,
      summary: {
        totalEmailsSent: totalSent,
        totalContacts,
        avgOpenRate,
        avgReplyRate,
        emailsPending: totalContacts - totalSent,
      },
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
