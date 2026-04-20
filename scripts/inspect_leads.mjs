/**
 * inspect_leads.mjs — check campaign field on leads in each list
 */
const API_KEY  = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

const LISTS = [
  { name: 'Distribuidoras 1', id: '8b43760b-04b9-4f66-97eb-854af4898f16' },
  { name: 'Dance from Spain 2', id: 'b487fd4c-a45a-41b5-96c6-54b452744646' },
  { name: 'Socios ARTE 1', id: '2a24e922-1126-4064-a76d-15d507f28042' },
  { name: 'Teatro Danza 2', id: '252a990b-2802-47f5-bc55-61b15fd897c4' },
  { name: 'Festivales 1', id: '18c9a4aa-aa3b-4a99-b4f6-1a17a3383011' },
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

async function main() {
  for (const l of LISTS) {
    console.log(`\n📋 ${l.name}`)
    const r = await api('/leads/list', {
      method: 'POST',
      body: JSON.stringify({ list_id: l.id, limit: 3 })
    })
    const items = r.items || []
    console.log(`   items: ${items.length}`)
    for (const lead of items.slice(0, 3)) {
      console.log(`   - ${lead.email}`)
      console.log(`       id        : ${lead.id}`)
      console.log(`       campaign  : ${lead.campaign || 'null'}`)
      console.log(`       list_id   : ${lead.list_id || 'null'}`)
      console.log(`       status    : ${lead.status}`)
    }
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
