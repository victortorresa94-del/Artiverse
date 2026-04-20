/**
 * rebuild_campaigns.mjs
 *
 * PROVEN FIX: For each broken campaign:
 * 1. Fetch sequences (preserve improved emails)
 * 2. Fetch ALL leads from list (preserve contact data)
 * 3. Pause & delete old campaign
 * 4. Delete all old leads from old list
 * 5. Delete old list
 * 6. Create NEW list
 * 7. Upload leads FRESH (status=0, no prior campaign)
 * 8. Create NEW campaign with preserved sequences
 * 9. /leads/move while PENDING
 * 10. Activate
 * 11. Verify leads enrolled
 *
 * This is EXACTLY the Salas Conciertos pattern that works.
 */

const API_KEY   = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE  = 'https://api.instantly.ai/api/v2'
const SEND_EMAIL = 'victor@artiversemail.es'
const CONCURRENCY = 3
const DELAY_MS   = 400

const CAMPAIGNS = [
  {
    name: 'Distribuidoras - Artiverse',
    campaignId: 'b449ca65-1374-4959-bccc-599dbc518032',
    listId: '8b43760b-04b9-4f66-97eb-854af4898f16',
    listName: 'Distribuidoras 1',
  },
  {
    name: 'Socios ARTE - Artiverse',
    campaignId: '4624d916-d31f-47ba-9e95-cfe25c7f0ebc',
    listId: '2a24e922-1126-4064-a76d-15d507f28042',
    listName: 'Socios ARTE 1',
  },
  {
    name: 'Teatro Danza 2',
    campaignId: '24d08469-6e16-413b-bd7a-366b4d1515ee',
    listId: '252a990b-2802-47f5-bc55-61b15fd897c4',
    listName: 'Teatro Danza 2',
  },
  {
    name: 'Festivales - Artiverse',
    campaignId: '54c5c9e8-20e7-4228-967d-f162d2185ac0',
    listId: '18c9a4aa-aa3b-4a99-b4f6-1a17a3383011',
    listName: 'Festivales 1',
  },
]

async function api(path, options = {}, attempt = 1) {
  try {
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    })
    // DELETE endpoints may return empty body
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    if (!res.ok) throw new Error(`${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
    return data
  } catch (err) {
    if (attempt < 3) {
      await sleep(800 * attempt)
      return api(path, options, attempt + 1)
    }
    throw err
  }
}

// DELETE with NO body and NO Content-Type
async function apiDelete(path, attempt = 1) {
  try {
    const res = await fetch(API_BASE + path, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    if (!res.ok) throw new Error(`${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
    return data
  } catch (err) {
    if (attempt < 3) {
      await sleep(800 * attempt)
      return apiDelete(path, attempt + 1)
    }
    throw err
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Fetch ALL leads from a list
async function fetchAllLeads(listId) {
  const all = []
  let cursor = null
  while (true) {
    const body = { list_id: listId, limit: 100 }
    if (cursor) body.starting_after = cursor
    const r = await api('/leads/list', { method: 'POST', body: JSON.stringify(body) })
    const items = r.items || []
    all.push(...items)
    if (items.length < 100) break
    cursor = items[items.length - 1].id
    await sleep(200)
  }
  return all
}

// Count leads enrolled in a campaign (using correct filter)
async function countInCampaign(campaignId) {
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

// Upload single lead
async function uploadLead(lead, listId) {
  return api('/leads', {
    method: 'POST',
    body: JSON.stringify({
      list_id:      listId,
      email:        lead.email,
      first_name:   lead.first_name || '',
      last_name:    lead.last_name || '',
      company_name: lead.company_name || '',
      phone:        lead.phone || '',
      website:      lead.website || '',
    })
  })
}

// Upload leads with concurrency
async function uploadLeads(leads, listId) {
  let ok = 0, fail = 0, dup = 0
  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const chunk = leads.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(l => uploadLead(l, listId)))
    for (const r of results) {
      if (r.status === 'fulfilled') { ok++; process.stdout.write('.') }
      else {
        const msg = r.reason?.message || ''
        if (msg.includes('duplicate') || msg.includes('already')) { dup++; process.stdout.write('D') }
        else { fail++; process.stdout.write('E') }
      }
    }
    if (i + CONCURRENCY < leads.length) await sleep(DELAY_MS)
  }
  return { ok, fail, dup }
}

// Poll background job
async function pollJob(jobId, maxWait = 60) {
  for (let i = 0; i < maxWait; i++) {
    await sleep(2000)
    try {
      const r = await api(`/background-jobs/${jobId}`)
      if (r.status === 'success' || r.status === 'completed') return { ok: true, data: r }
      if (r.status === 'failed' || r.status === 'error') return { ok: false, data: r }
      process.stdout.write('.')
    } catch { process.stdout.write('?') }
  }
  return { ok: false, data: 'timeout' }
}

async function rebuildCampaign(c) {
  console.log('\n' + '═'.repeat(70))
  console.log(`🔧 REBUILDING: ${c.name}`)
  console.log('═'.repeat(70))

  // STEP 1: Fetch sequences from current campaign
  console.log('\n📧 Step 1: Fetching sequences...')
  const campDetail = await api(`/campaigns/${c.campaignId}`)
  const sequences = campDetail.sequences
  const schedule = campDetail.campaign_schedule
  console.log(`   ✅ ${sequences[0]?.steps?.length || 0} steps preserved`)

  // STEP 2: Fetch ALL leads from current list
  console.log('\n📋 Step 2: Fetching all leads...')
  const leads = await fetchAllLeads(c.listId)
  console.log(`   ✅ ${leads.length} leads backed up`)

  if (leads.length === 0) {
    console.log('   ❌ No leads found — skipping')
    return { ok: false, reason: 'no leads' }
  }

  // STEP 3: Pause & delete old campaign
  console.log('\n🗑️  Step 3: Deleting old campaign...')
  try {
    await api(`/campaigns/${c.campaignId}/pause`, { method: 'POST', body: '{}' })
    await sleep(500)
  } catch (e) { /* might already be paused */ }
  try {
    await apiDelete(`/campaigns/${c.campaignId}`)
    console.log('   ✅ Campaign deleted')
  } catch (e) {
    console.log('   ⚠️  Delete campaign:', e.message.slice(0, 120))
  }
  await sleep(500)

  // STEP 4: Delete all leads from old list
  console.log(`\n🗑️  Step 4: Deleting ${leads.length} old leads...`)
  let deleted = 0, delFail = 0
  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const chunk = leads.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(l => apiDelete(`/leads/${l.id}`)))
    for (const r of results) {
      if (r.status === 'fulfilled') { deleted++; process.stdout.write('.') }
      else { delFail++; process.stdout.write('x') }
    }
    if (i + CONCURRENCY < leads.length) await sleep(300)
  }
  console.log(`\n   ✅ ${deleted} deleted, ${delFail} failed`)
  await sleep(500)

  // STEP 5: Delete old list
  console.log('\n🗑️  Step 5: Deleting old list...')
  try {
    await apiDelete(`/lead-lists/${c.listId}`)
    console.log('   ✅ List deleted')
  } catch (e) {
    console.log('   ⚠️  Delete list:', e.message.slice(0, 120))
  }
  await sleep(500)

  // STEP 6: Create NEW list
  console.log(`\n📋 Step 6: Creating new list "${c.listName}"...`)
  const newList = await api('/lead-lists', {
    method: 'POST',
    body: JSON.stringify({ name: c.listName })
  })
  console.log(`   ✅ New list ID: ${newList.id}`)

  // STEP 7: Upload leads FRESH
  console.log(`\n⬆️  Step 7: Uploading ${leads.length} FRESH leads...`)
  process.stdout.write('   ')
  const { ok: uploaded, fail: upFail, dup } = await uploadLeads(leads, newList.id)
  console.log(`\n   ✅ ${uploaded} uploaded, ${dup} dups, ${upFail} failed`)
  await sleep(1000)

  // STEP 8: Create NEW campaign
  console.log(`\n🚀 Step 8: Creating new campaign "${c.name}"...`)
  const newCampaign = await api('/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: c.name,
      email_list: [SEND_EMAIL],
      campaign_schedule: schedule || {
        schedules: [{
          name: 'Weekdays',
          timing: { from: '09:00', to: '18:00' },
          days: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
          timezone: 'Etc/GMT+12'
        }]
      },
      sequences: sequences
    })
  })
  console.log(`   ✅ New campaign ID: ${newCampaign.id}`)

  // STEP 9: Move leads BEFORE activation (campaign is PENDING)
  console.log('\n🔗 Step 9: Moving leads to campaign (PENDING state)...')
  try {
    const mv = await api('/leads/move', {
      method: 'POST',
      body: JSON.stringify({
        list_id: newList.id,
        to_campaign_id: newCampaign.id,
        copy_leads: true
      })
    })
    console.log(`   Job ID: ${mv.id} — polling...`)
    process.stdout.write('   ')
    const result = await pollJob(mv.id, 30)
    console.log(`\n   Move result: ${result.ok ? '✅ SUCCESS' : '❌ FAILED'}`)
    if (!result.ok) console.log('   Data:', JSON.stringify(result.data).slice(0, 200))
  } catch (e) {
    console.log(`   ❌ Move error: ${e.message.slice(0, 200)}`)
  }
  await sleep(2000)

  // STEP 10: Activate
  console.log('\n▶️  Step 10: Activating...')
  try {
    const act = await api(`/campaigns/${newCampaign.id}/activate`, { method: 'POST', body: '{}' })
    console.log(`   ✅ Status: ${act.status}`)
  } catch (e) {
    console.log(`   ⚠️  Activate: ${e.message.slice(0, 120)}`)
  }
  await sleep(3000)

  // STEP 11: Verify
  console.log('\n🔍 Step 11: Verifying...')
  const enrolled = await countInCampaign(newCampaign.id)
  console.log(`   Leads enrolled: ${enrolled} / ${leads.length}`)

  if (enrolled > 0) {
    console.log(`\n   ✅✅✅ ${c.name} FIXED! ${enrolled} leads enrolled`)
  } else {
    console.log(`\n   ❌❌❌ ${c.name} STILL EMPTY`)
  }

  return { ok: enrolled > 0, campaignId: newCampaign.id, listId: newList.id, enrolled, total: leads.length }
}

async function main() {
  console.log('\n🔧 REBUILD ALL BROKEN CAMPAIGNS')
  console.log('   Using the PROVEN Salas Conciertos pattern\n')

  const results = []

  for (const c of CAMPAIGNS) {
    try {
      const r = await rebuildCampaign(c)
      results.push({ name: c.name, ...r })
    } catch (e) {
      console.error(`\n❌ FATAL for ${c.name}: ${e.message}`)
      results.push({ name: c.name, ok: false, reason: e.message })
    }
  }

  // Summary
  console.log('\n\n' + '═'.repeat(70))
  console.log('📊 RESUMEN FINAL')
  console.log('═'.repeat(70))
  for (const r of results) {
    const flag = r.ok ? '✅' : '❌'
    console.log(`   ${flag} ${r.name}: ${r.enrolled || 0}/${r.total || '?'} leads`)
    if (r.campaignId) console.log(`      New Campaign: ${r.campaignId}`)
    if (r.listId) console.log(`      New List:     ${r.listId}`)
  }
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1) })
