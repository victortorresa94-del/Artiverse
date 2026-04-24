export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const KEY  = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const BASE = 'https://api.instantly.ai/api/v2'

function instHeaders() {
  return { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id
  if (!campaignId) {
    return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 })
  }

  try {
    // Fetch up to 100 leads for the campaign
    const res = await fetch(`${BASE}/leads/list`, {
      method: 'POST',
      headers: instHeaders(),
      body: JSON.stringify({ campaign: campaignId, limit: 100 }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Instantly error: ${res.status} ${errText}` }, { status: 502 })
    }

    const data = await res.json()
    const leads: any[] = data.items ?? []

    const contacts = leads.map((lead: any) => {
      const opens   = lead.email_open_count  ?? 0
      const clicks  = lead.email_click_count ?? 0
      const replies = lead.email_reply_count ?? 0

      let emailStatus: string
      if (lead.status === -1)  emailStatus = 'bounced'
      else if (replies > 0)    emailStatus = 'replied'
      else if (clicks  > 0)    emailStatus = 'clicked'
      else if (opens   > 0)    emailStatus = 'opened'
      else if (lead.status >= 1) emailStatus = 'sent'
      else                     emailStatus = 'not_sent'

      const lastStep = lead.status_summary?.lastStep?.stepID ?? null

      return {
        email:       lead.email ?? '',
        company:     lead.company_name || lead.company_domain || '',
        contact:     [lead.first_name, lead.last_name].filter(Boolean).join(' '),
        emailStatus,
        step:        lastStep ? Number(lastStep) : null,
        opens,
        clicks,
        replies,
        lastContact: lead.timestamp_last_contact ?? lead.timestamp_last_touch ?? null,
        lastOpen:    lead.timestamp_last_open  ?? null,
        lastReply:   lead.timestamp_last_reply ?? null,
        city:        lead.city || lead.payload?.city || '',
      }
    })

    // Sort: replied first, then opened, then sent, etc.
    const ORDER: Record<string, number> = {
      replied: 0, clicked: 1, opened: 2, sent: 3, not_sent: 4, bounced: 5,
    }
    contacts.sort((a, b) => (ORDER[a.emailStatus] ?? 9) - (ORDER[b.emailStatus] ?? 9))

    const stats = {
      total:   contacts.length,
      sent:    contacts.filter(c => c.emailStatus !== 'not_sent' && c.emailStatus !== 'bounced').length,
      opened:  contacts.filter(c => c.emailStatus === 'opened' || c.emailStatus === 'replied' || c.emailStatus === 'clicked').length,
      replied: contacts.filter(c => c.emailStatus === 'replied').length,
      bounced: contacts.filter(c => c.emailStatus === 'bounced').length,
    }

    return NextResponse.json({ contacts, stats })
  } catch (err: any) {
    console.error('Campaign contacts API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
