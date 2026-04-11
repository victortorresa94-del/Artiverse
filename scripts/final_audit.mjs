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

async function main() {
  console.log('🔍 AUDITORÍA FINAL — Estado de campañas\n')
  console.log('='*60)

  const campaigns = []
  let offset = 0
  while (true) {
    const res = await apiFetch(`/campaigns?limit=50&skip=${offset}`)
    if (!res.items || res.items.length === 0) break
    campaigns.push(...res.items)
    if (res.items.length < 50) break
    offset += 50
  }

  const filtered = campaigns.filter(c => !c.name.includes('[AI SDR]'))

  const audit = {
    timestamp: new Date().toISOString(),
    campaigns: [],
    summary: {
      total: filtered.length,
      active: 0,
      pending: 0,
      with_email_list: 0,
      quality_score: 0
    }
  }

  for (const camp of filtered) {
    const status = camp.status === 1 ? 'ACTIVE' : 'PENDING'
    const hasEmailList = camp.email_list && camp.email_list.length > 0
    const sequenceSteps = camp.sequences ? camp.sequences[0]?.steps?.length || 0 : 0
    const hasSchedule = !!camp.campaign_schedule

    const quality = (hasEmailList ? 1 : 0) + (hasSchedule ? 1 : 0) + (sequenceSteps >= 3 ? 1 : 0)

    audit.campaigns.push({
      name: camp.name,
      id: camp.id,
      status: status,
      email_list: camp.email_list || [],
      sequence_steps: sequenceSteps,
      has_schedule: hasSchedule,
      quality_score: quality / 3 * 10
    })

    if (status === 'ACTIVE') audit.summary.active++
    else audit.summary.pending++
    if (hasEmailList) audit.summary.with_email_list++
    audit.summary.quality_score += quality
  }

  audit.summary.quality_score = Math.round((audit.summary.quality_score / filtered.length) * 10 / 3)

  console.log('\n📋 CAMPAÑAS:\n')
  audit.campaigns.forEach(c => {
    console.log(`${c.name}`)
    console.log(`  Status: ${c.status} | Quality: ${c.quality_score}/10`)
    console.log(`  Email: ${c.email_list.join(', ') || 'MISSING'}`)
    console.log(`  Steps: ${c.sequence_steps} | Schedule: ${c.has_schedule ? '✅' : '❌'}`)
    console.log()
  })

  console.log('='*60)
  console.log('\n📊 RESUMEN:\n')
  console.log(`  Total campañas: ${audit.summary.total}`)
  console.log(`  ✅ Activas: ${audit.summary.active}`)
  console.log(`  ⏳ Pending: ${audit.summary.pending}`)
  console.log(`  📧 Con email list: ${audit.summary.with_email_list}`)
  console.log(`  📈 Calidad promedio: ${audit.summary.quality_score}/10`)
  console.log()
  console.log('='*60)
}

main().catch(e => console.error('Error:', e.message))
