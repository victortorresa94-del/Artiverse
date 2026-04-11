/**
 * audit_contacts.mjs — Audita validación de contactos
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

async function getLeadsFromList(listId) {
  const leads = []
  let cursor = null
  while (true) {
    const res = await apiFetch(`/leads/list?list_id=${listId}&cursor=${cursor || ''}`)
    if (!res.data || res.data.length === 0) break
    leads.push(...res.data)
    if (!res.cursor) break
    cursor = res.cursor
  }
  return leads
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function main() {
  const campaigns = await getAllCampaigns()
  const filtered = campaigns.filter(c => !c.name.includes('[AI SDR]'))

  const results = {
    campaigns: [],
    summary: {
      total_leads: 0,
      invalid_emails: 0,
      duplicates_detected: [],
      campaigns_with_issues: 0
    }
  }

  for (const campaign of filtered) {
    const emailsSeen = new Set()
    let totalLeads = 0, invalidEmails = 0, duplicates = 0
    const issues = []

    try {
      // Intentar fetch leads desde campaign (si tiene list_id)
      if (!campaign.lead_list_ids || campaign.lead_list_ids.length === 0) {
        issues.push('no_lead_lists')
      } else {
        for (const listId of campaign.lead_list_ids) {
          const leads = await getLeadsFromList(listId)
          totalLeads += leads.length

          for (const lead of leads) {
            if (!isValidEmail(lead.email)) {
              invalidEmails++
            } else if (emailsSeen.has(lead.email)) {
              duplicates++
              if (!results.summary.duplicates_detected.includes(lead.email)) {
                results.summary.duplicates_detected.push(lead.email)
              }
            }
            emailsSeen.add(lead.email)
          }
        }
      }
    } catch (err) {
      issues.push(`fetch_error: ${err.message.slice(0, 50)}`)
    }

    results.campaigns.push({
      name: campaign.name,
      id: campaign.id,
      total_leads: totalLeads,
      invalid_emails: invalidEmails,
      duplicate_count: duplicates,
      issues: issues
    })

    results.summary.total_leads += totalLeads
    results.summary.invalid_emails += invalidEmails
    if (issues.length > 0) results.summary.campaigns_with_issues++
  }

  console.log(JSON.stringify(results, null, 2))
}

main().catch(err => console.error('Error:', err.message))
