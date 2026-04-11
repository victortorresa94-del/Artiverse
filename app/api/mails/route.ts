import { NextRequest } from 'next/server'

const API_KEY = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

async function instantly(path: string, options: RequestInit = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`)
  return data
}

// GET /api/mails — fetch all campaigns with full sequences
export async function GET() {
  try {
    const data = await instantly('/campaigns?limit=50')
    const campaigns = (data.items || [])
      .filter((c: any) => !c.name.includes('[AI SDR]'))
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        email_list: c.email_list || [],
        sequences: c.sequences || [],
      }))
    return Response.json({ campaigns })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/mails — update sequences for a campaign
export async function PATCH(req: NextRequest) {
  try {
    const { campaignId, sequences } = await req.json()
    if (!campaignId || !sequences) {
      return Response.json({ error: 'campaignId and sequences required' }, { status: 400 })
    }
    const updated = await instantly(`/campaigns/${campaignId}`, {
      method: 'PATCH',
      body: JSON.stringify({ sequences }),
    })
    return Response.json({ ok: true, campaign: updated })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
