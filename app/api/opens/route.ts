/**
 * /api/opens
 *
 * Obtiene los leads que han abierto (status=3) o respondido (status=4)
 * emails de las campañas de Artiverse en Instantly.
 *
 * Instantly lead status codes:
 *   0 = not contacted
 *   1 = sending
 *   2 = sent
 *   3 = opened
 *   4 = replied
 *  -1 = bounced
 */
import { NextResponse } from 'next/server'

const KEY = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='

async function getLeadsByStatus(status: number, limit = 100) {
  const res = await fetch('https://api.instantly.ai/api/v2/leads/list', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit, status }),
    next: { revalidate: 0 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.items || []
}

async function getCampaignName(campaignId: string): Promise<string> {
  if (!campaignId) return ''
  const res = await fetch(`https://api.instantly.ai/api/v2/campaigns/${campaignId}`, {
    headers: { 'Authorization': `Bearer ${KEY}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) return campaignId.slice(0, 8)
  const data = await res.json()
  return data.name || ''
}

function shortName(name: string): string {
  return name.replace(' - Artiverse', '').replace(' - artiverse', '')
}

export async function GET() {
  try {
    // Fetch opened and replied leads in parallel
    const [opened, replied] = await Promise.all([
      getLeadsByStatus(3, 100),
      getLeadsByStatus(4, 100),
    ])

    // Merge and deduplicate by email (replied leads also count as opened)
    const seen = new Set<string>()
    const allOpened: {
      email: string
      company: string
      firstName: string
      status: 'replied' | 'opened'
      campaignId: string
      updatedAt: string
    }[] = []

    for (const lead of replied) {
      const email = (lead.email || '').toLowerCase()
      if (!seen.has(email)) {
        seen.add(email)
        allOpened.push({
          email: lead.email,
          company: lead.company_name || '',
          firstName: lead.first_name || '',
          status: 'replied',
          campaignId: lead.campaign_id || '',
          updatedAt: lead.timestamp_updated || lead.timestamp_created || '',
        })
      }
    }

    for (const lead of opened) {
      const email = (lead.email || '').toLowerCase()
      if (!seen.has(email)) {
        seen.add(email)
        allOpened.push({
          email: lead.email,
          company: lead.company_name || '',
          firstName: lead.first_name || '',
          status: 'opened',
          campaignId: lead.campaign_id || '',
          updatedAt: lead.timestamp_updated || lead.timestamp_created || '',
        })
      }
    }

    // Resolve unique campaign IDs to names (max 10 unique campaigns)
    const uniqueCampaignIds = [...new Set(allOpened.map(l => l.campaignId).filter(Boolean))].slice(0, 10)
    const campaignNameMap: Record<string, string> = {}
    await Promise.all(
      uniqueCampaignIds.map(async id => {
        const name = await getCampaignName(id)
        campaignNameMap[id] = shortName(name)
      })
    )

    // Attach campaign names
    const leads = allOpened.map(l => ({
      ...l,
      campaign: campaignNameMap[l.campaignId] || '',
    }))

    // Aggregate stats
    const totalOpened = leads.length
    const totalReplied = replied.length
    const totalSent = 75 // From stats.json — will be updated when more campaigns have stats

    return NextResponse.json({
      totalOpened,
      totalReplied,
      openRate: totalSent > 0 ? +((totalOpened / totalSent) * 100).toFixed(1) : 0,
      replyRate: totalSent > 0 ? +((totalReplied / totalSent) * 100).toFixed(1) : 0,
      leads,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      totalOpened: 0,
      totalReplied: 0,
      openRate: 0,
      replyRate: 0,
      leads: [],
      error: String(err),
    })
  }
}
