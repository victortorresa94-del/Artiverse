/**
 * audit_config.mjs — Audita configuración de campañas
 */

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`)
  return data
}

async function getAllCampaigns() {
  const campaigns = []
  let offset = 0
  const limit = 50
  while (true) {
    const res = await apiFetch(`/campaigns?limit=${limit}&skip=${offset}`)
    if (!res.items || res.items.length === 0) break
    campaigns.push(...res.items)
    if (res.items.length < limit) break
    offset += limit
  }
  return campaigns
}

async function main() {
  const campaigns = await getAllCampaigns()
  const filtered = campaigns.filter(c => !c.name.includes('[AI SDR]'))

  const results = {
    campaigns: filtered.map(c => {
      const issues = []
      if (!c.email_list || c.email_list.length === 0) issues.push('missing_email_list')
      if (!c.campaign_schedule) issues.push('missing_campaign_schedule')
      if (!c.sequences || c.sequences.length === 0) issues.push('missing_sequences')

      return {
        name: c.name,
        id: c.id,
        status: c.status === 1 ? 'ACTIVE' : 'PENDING',
        email_list_count: c.email_list ? c.email_list.length : 0,
        sequence_steps: c.sequences ? c.sequences[0]?.steps?.length || 0 : 0,
        has_schedule: !!c.campaign_schedule,
        issues: issues
      }
    }),
    summary: {
      total_campaigns: filtered.length,
      active: filtered.filter(c => c.status === 1).length,
      pending: filtered.filter(c => c.status === 0).length,
      missing_config: 0
    }
  }

  results.summary.missing_config = results.campaigns.filter(c => c.issues.length > 0).length

  console.log(JSON.stringify(results, null, 2))
}

main().catch(err => console.error('Error:', err.message))
