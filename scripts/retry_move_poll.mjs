/**
 * retry_move_poll.mjs
 *
 * Retry the /leads/move with active polling + different options.
 * Also try querying background job status.
 */

const API_KEY  = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

const JOBS = [
  { name: 'Distribuidoras',        campaignId: 'b449ca65-1374-4959-bccc-599dbc518032', listId: '8b43760b-04b9-4f66-97eb-854af4898f16' },
  { name: 'Socios ARTE',           campaignId: '4624d916-d31f-47ba-9e95-cfe25c7f0ebc', listId: '2a24e922-1126-4064-a76d-15d507f28042' },
  { name: 'Teatro Danza 2',        campaignId: '24d08469-6e16-413b-bd7a-366b4d1515ee', listId: '252a990b-2802-47f5-bc55-61b15fd897c4' },
  { name: 'Festivales',            campaignId: '54c5c9e8-20e7-4228-967d-f162d2185ac0', listId: '18c9a4aa-aa3b-4a99-b4f6-1a17a3383011' },
]

async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`)
  return data
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function count(campaignId) {
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

async function tryJobStatus(jobId) {
  // Try common job endpoints
  const paths = [
    `/background-jobs/${jobId}`,
    `/jobs/${jobId}`,
    `/leads/move/${jobId}`,
  ]
  for (const p of paths) {
    try {
      const r = await api(p)
      return { path: p, data: r }
    } catch (e) { /* try next */ }
  }
  return null
}

async function main() {
  for (const job of JOBS) {
    console.log('\n─'.repeat(60))
    console.log(`🎯 ${job.name}`)

    // Pause
    try {
      await api(`/campaigns/${job.campaignId}/pause`, { method: 'POST', body: '{}' })
      console.log('   ⏸️  paused')
    } catch (e) { console.log('   pause warn:', e.message.slice(0,80)) }
    await sleep(500)

    // Try move with copy_leads: true
    console.log('   🔗 move (copy=true)...')
    let moveJobId = null
    try {
      const r = await api('/leads/move', {
        method: 'POST',
        body: JSON.stringify({
          list_id: job.listId,
          to_campaign_id: job.campaignId,
          copy_leads: true
        })
      })
      moveJobId = r.id
      console.log(`   job: ${moveJobId} status: ${r.status}`)
    } catch (e) {
      console.log('   ❌ move failed:', e.message.slice(0, 200))
    }

    // Poll job status
    if (moveJobId) {
      for (let i = 0; i < 20; i++) {
        await sleep(3000)
        const st = await tryJobStatus(moveJobId)
        if (st) {
          const data = st.data
          console.log(`   [${i}] status=${data.status} progress=${data.progress} (${st.path})`)
          if (data.status === 'success' || data.status === 'completed' || data.progress === 100) break
          if (data.status === 'failed' || data.status === 'error') {
            console.log(`   ❌ job failed: ${JSON.stringify(data)}`)
            break
          }
        } else {
          console.log(`   [${i}] no job status found`)
        }
      }
    }

    // Count leads in campaign
    const n = await count(job.campaignId)
    console.log(`   ✳️  leads in campaign: ${n}`)

    // Activate regardless
    try {
      await api(`/campaigns/${job.campaignId}/activate`, { method: 'POST', body: '{}' })
      console.log('   ▶️  activated')
    } catch (e) { console.log('   activate warn:', e.message.slice(0,80)) }
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
