/**
 * diagnose_current_state.mjs
 *
 * Diagnóstico completo: lista todas las campañas, sus estados,
 * lead lists asociadas, y cuántos leads tiene cada cosa.
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

async function countLeadsInList(listId) {
  try {
    const r = await api('/leads/list', {
      method: 'POST',
      body: JSON.stringify({ list_id: listId, limit: 1 })
    })
    // Use different techniques to count
    let total = 0, hasMore = true, cursor = null
    while (hasMore) {
      const body = { list_id: listId, limit: 100 }
      if (cursor) body.starting_after = cursor
      const batch = await api('/leads/list', { method: 'POST', body: JSON.stringify(body) })
      const items = batch.items || []
      total += items.length
      cursor = items.length ? items[items.length - 1].id : null
      hasMore = items.length === 100 && cursor
    }
    return total
  } catch (e) {
    return -1
  }
}

async function countLeadsInCampaign(campaignId) {
  try {
    let total = 0, cursor = null, hasMore = true
    while (hasMore) {
      const body = { campaign_id: campaignId, limit: 100 }
      if (cursor) body.starting_after = cursor
      const batch = await api('/leads/list', { method: 'POST', body: JSON.stringify(body) })
      const items = batch.items || []
      total += items.length
      cursor = items.length ? items[items.length - 1].id : null
      hasMore = items.length === 100 && cursor
    }
    return total
  } catch (e) {
    return -1
  }
}

async function main() {
  console.log('\n🔍 Diagnóstico de campañas y leads\n')

  // 1. Get all campaigns
  const campData = await api('/campaigns?limit=100')
  const campaigns = (campData.items || []).filter(c => !c.name.includes('[AI SDR]'))

  console.log(`📊 ${campaigns.length} campañas (sin AI SDR)\n`)

  // 2. Get all lead lists
  const listData = await api('/lead-lists?limit=100')
  const lists = listData.items || []
  console.log(`📋 ${lists.length} lead lists\n`)

  console.log('═'.repeat(85))
  console.log('CAMPAÑAS')
  console.log('═'.repeat(85))

  const statusMap = { 0: 'DRAFT', 1: 'ACTIVE', 2: 'PAUSED', 3: 'COMPLETED', 4: 'EVERGREEN' }

  for (const c of campaigns) {
    const leadsInCampaign = await countLeadsInCampaign(c.id)
    const flag = leadsInCampaign === 0 ? '❌' : leadsInCampaign > 0 ? '✅' : '⚠️'
    console.log(`\n${flag} ${c.name}`)
    console.log(`   ID     : ${c.id}`)
    console.log(`   Status : ${statusMap[c.status] || c.status}`)
    console.log(`   Leads  : ${leadsInCampaign}`)
  }

  console.log('\n' + '═'.repeat(85))
  console.log('LEAD LISTS')
  console.log('═'.repeat(85))

  for (const l of lists) {
    const count = await countLeadsInList(l.id)
    console.log(`\n📋 ${l.name}`)
    console.log(`   ID    : ${l.id}`)
    console.log(`   Leads : ${count}`)
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
