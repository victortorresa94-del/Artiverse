/**
 * audit_emails.mjs — Audita calidad de emails en todas las campañas
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

function auditEmail(campaign) {
  const issues = []
  const sequences = campaign.sequences || []

  if (!sequences.length) {
    issues.push({ type: 'no_sequences', severity: 'critical' })
    return { quality_score: 0, issues }
  }

  for (let stepIdx = 0; stepIdx < sequences[0].steps.length; stepIdx++) {
    const step = sequences[0].steps[stepIdx]
    const variants = step.variants || []

    // Step 1: debe tener subjects
    if (stepIdx === 0) {
      if (variants.length === 0) {
        issues.push({ type: 'step1_no_variants', severity: 'critical' })
      }
      variants.forEach((v, vIdx) => {
        if (!v.subject || v.subject.trim().length < 5) {
          issues.push({ type: 'step1_weak_subject', variant: vIdx, severity: 'high' })
        }
        if (!v.body.includes('{{firstName}}') && !v.body.includes('{{companyName}}')) {
          issues.push({ type: 'step1_missing_personalization', variant: vIdx, severity: 'medium' })
        }
        if (v.body.includes('Aether Labs') && !v.body.includes('Artiverse')) {
          issues.push({ type: 'step1_wrong_signature', variant: vIdx, severity: 'medium' })
        }
      })
    }
    // Step 2+: NO debe tener subjects (para threading)
    else if (stepIdx >= 1) {
      variants.forEach((v, vIdx) => {
        if (v.subject && v.subject.trim().length > 0) {
          issues.push({ type: `step${stepIdx + 1}_unexpected_subject`, variant: vIdx, severity: 'low' })
        }
        if (!v.body.includes('{{firstName}}')) {
          issues.push({ type: `step${stepIdx + 1}_missing_personalization`, variant: vIdx, severity: 'medium' })
        }
      })
    }
  }

  const quality_score = Math.max(0, 10 - (issues.length * 0.5))
  return { quality_score: Math.round(quality_score), issues }
}

async function main() {
  const campaigns = await getAllCampaigns()
  const filtered = campaigns.filter(c => !c.name.includes('[AI SDR]'))

  const results = {
    campaigns: filtered.map(c => {
      const audit = auditEmail(c)
      return {
        name: c.name,
        id: c.id,
        status: c.status,
        quality_score: audit.quality_score,
        issues: audit.issues
      }
    }),
    summary: {
      total_campaigns: filtered.length,
      avg_quality: 0,
      critical_issues: 0
    }
  }

  results.summary.avg_quality = Math.round(
    results.campaigns.reduce((sum, c) => sum + c.quality_score, 0) / results.campaigns.length
  )
  results.summary.critical_issues = results.campaigns.reduce(
    (sum, c) => sum + c.issues.filter(i => i.severity === 'critical').length, 0
  )

  console.log(JSON.stringify(results, null, 2))
}

main().catch(err => console.error('Error:', err.message))
