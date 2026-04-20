/**
 * diagnose_v2.mjs — Mejor diagnóstico usando el endpoint correcto
 */

const API_KEY  = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

async function api(path, options = {}) {
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

// Sample 5 leads from a campaign and show their details
async function sampleLeads(campaignId, label) {
  console.log(`\n🔎 Muestra de leads para "${label}"`)
  try {
    const res = await api('/leads/list', {
      method: 'POST',
      body: JSON.stringify({ campaign: campaignId, limit: 5 })
    })
    console.log('   items.length:', (res.items || []).length)
    console.log('   first item:', JSON.stringify((res.items || [])[0] || {}, null, 2).slice(0, 500))
  } catch (e) {
    console.log('   ❌', e.message.slice(0, 200))
  }
}

// Try variations of the filter
async function tryFilters(campaignId, label) {
  console.log(`\n🧪 Filtros para "${label}"`)
  const variants = [
    { campaign: campaignId },
    { campaign_id: campaignId },
    { filter: 'FILTER_VAL_CONTACTED', campaign: campaignId },
  ]
  for (const variant of variants) {
    try {
      const res = await api('/leads/list', {
        method: 'POST',
        body: JSON.stringify({ ...variant, limit: 2 })
      })
      const items = res.items || []
      console.log(`   ${JSON.stringify(variant)} → ${items.length} items`)
      if (items[0]) {
        console.log(`     sample: ${items[0].email} | campaign: ${items[0].campaign}`)
      }
    } catch (e) {
      console.log(`   ${JSON.stringify(variant)} → ❌ ${e.message.slice(0, 100)}`)
    }
  }
}

async function main() {
  // Fetch all campaigns
  const campData = await api('/campaigns?limit=100')
  const campaigns = (campData.items || []).filter(c => !c.name.includes('[AI SDR]'))

  // Focus on 2 campaigns: Salas (working) and Distribuidoras (broken)
  const target = campaigns.filter(c =>
    c.name.includes('Salas Conciertos 1') ||
    c.name.includes('Distribuidoras') ||
    c.name.includes('Festivales')
  )

  for (const c of target) {
    console.log('\n' + '═'.repeat(60))
    console.log(`🎯 ${c.name}`)
    console.log('   id:', c.id)
    console.log('   status:', c.status)
    // Show FULL campaign object to see lead_count fields
    console.log('   keys:', Object.keys(c).join(', '))
    // Look for leads-related fields
    for (const k of Object.keys(c)) {
      if (k.toLowerCase().includes('lead') || k.toLowerCase().includes('count') || k.toLowerCase().includes('stat')) {
        console.log(`   ${k}:`, JSON.stringify(c[k]))
      }
    }
    await tryFilters(c.id, c.name)
  }

  // Also fetch a full campaign detail directly
  console.log('\n' + '═'.repeat(60))
  console.log('🔍 Campaign detail endpoints')
  const distribCampaign = target.find(c => c.name.includes('Distribuidoras'))
  if (distribCampaign) {
    try {
      const detail = await api('/campaigns/' + distribCampaign.id)
      console.log('   keys:', Object.keys(detail).join(', '))
      console.log('   lead_list_ids:', JSON.stringify(detail.lead_list_ids || 'N/A'))
    } catch (e) {
      console.log('   ❌', e.message.slice(0, 200))
    }
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
