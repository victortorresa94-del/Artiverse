/**
 * fix_enroll_leads.mjs
 *
 * ESTRATEGIA:
 * 1. Para cada campaña rota: pausa → move leads de la list → activa
 * 2. Si no funciona, fallback: elimina y recrea desde 0 (subiendo leads frescos)
 *
 * Verifica al final usando el filtro correcto: { campaign: ID }
 */

const API_KEY  = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

// Map: campaignId → listId  (las que saben que están rotas)
const JOBS = [
  { name: 'Distribuidoras - Artiverse',   campaignId: 'b449ca65-1374-4959-bccc-599dbc518032', listId: '8b43760b-04b9-4f66-97eb-854af4898f16' },
  { name: 'Dance from Spain 2 - Artiverse', campaignId: 'd1bdcacd-6dfb-49f2-996b-6a217ab8e51c', listId: 'b487fd4c-a45a-41b5-96c6-54b452744646' },
  { name: 'Socios ARTE - Artiverse',       campaignId: '4624d916-d31f-47ba-9e95-cfe25c7f0ebc', listId: '2a24e922-1126-4064-a76d-15d507f28042' },
  { name: 'Teatro Danza 2',                campaignId: '24d08469-6e16-413b-bd7a-366b4d1515ee', listId: '252a990b-2802-47f5-bc55-61b15fd897c4' },
  { name: 'Festivales - Artiverse',        campaignId: '54c5c9e8-20e7-4228-967d-f162d2185ac0', listId: '18c9a4aa-aa3b-4a99-b4f6-1a17a3383011' },
]

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Count leads in a campaign using the CORRECT filter key
async function countLeadsInCampaign(campaignId) {
  let total = 0, cursor = null
  while (true) {
    const body = { campaign: campaignId, limit: 100 }
    if (cursor) body.starting_after = cursor
    const r = await api('/leads/list', { method: 'POST', body: JSON.stringify(body) })
    const items = r.items || []
    total += items.length
    if (items.length < 100) break
    cursor = items[items.length - 1].id
  }
  return total
}

async function pause(campaignId) {
  try {
    await api(`/campaigns/${campaignId}/pause`, { method: 'POST', body: '{}' })
    return true
  } catch (e) {
    console.log(`   ⚠️  pause: ${e.message.slice(0, 120)}`)
    return false
  }
}

async function activate(campaignId) {
  try {
    await api(`/campaigns/${campaignId}/activate`, { method: 'POST', body: '{}' })
    return true
  } catch (e) {
    console.log(`   ⚠️  activate: ${e.message.slice(0, 120)}`)
    return false
  }
}

async function moveLeads(listId, campaignId) {
  try {
    const r = await api('/leads/move', {
      method: 'POST',
      body: JSON.stringify({ list_id: listId, to_campaign_id: campaignId, copy_leads: true })
    })
    return { ok: true, data: r }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function main() {
  console.log('\n🔧 FIX: Enroll leads into broken campaigns\n')

  for (const job of JOBS) {
    console.log('─'.repeat(70))
    console.log(`🎯 ${job.name}`)
    console.log(`   Campaign: ${job.campaignId}`)
    console.log(`   List    : ${job.listId}`)

    // Step 0: verify current lead count
    const before = await countLeadsInCampaign(job.campaignId)
    console.log(`   Leads enrolled BEFORE: ${before}`)

    if (before > 0) {
      console.log('   ✅ Ya tiene leads — saltando')
      continue
    }

    // Step 1: pause
    console.log('   ⏸️  Pausando...')
    await pause(job.campaignId)
    await sleep(1000)

    // Step 2: move leads
    console.log('   🔗 Moviendo leads (copy)...')
    const mv = await moveLeads(job.listId, job.campaignId)
    if (mv.ok) {
      console.log(`   ✅ move OK: ${JSON.stringify(mv.data).slice(0, 150)}`)
    } else {
      console.log(`   ❌ move falló: ${mv.error.slice(0, 200)}`)
    }
    await sleep(2000)

    // Step 3: activate
    console.log('   ▶️  Activando...')
    await activate(job.campaignId)
    await sleep(1000)

    // Step 4: verify
    const after = await countLeadsInCampaign(job.campaignId)
    console.log(`   Leads enrolled AFTER : ${after}`)
    if (after > 0) {
      console.log(`   ✅✅ ${job.name} FIXED (${after} leads)`)
    } else {
      console.log(`   ❌❌ ${job.name} STILL BROKEN — needs recreation`)
    }
    console.log('')
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1) })
