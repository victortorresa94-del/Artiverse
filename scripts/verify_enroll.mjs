/**
 * verify_enroll.mjs — espera y verifica leads enrolled
 */

const API_KEY  = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

const TARGETS = [
  { name: 'Distribuidoras',        id: 'b449ca65-1374-4959-bccc-599dbc518032', expected: 501 },
  { name: 'Dance from Spain 2',    id: 'd1bdcacd-6dfb-49f2-996b-6a217ab8e51c', expected: 238 },
  { name: 'Socios ARTE',           id: '4624d916-d31f-47ba-9e95-cfe25c7f0ebc', expected: 260 },
  { name: 'Teatro Danza 2',        id: '24d08469-6e16-413b-bd7a-366b4d1515ee', expected: 482 },
  { name: 'Festivales',            id: '54c5c9e8-20e7-4228-967d-f162d2185ac0', expected: 584 },
  { name: 'Salas Conciertos 1',    id: 'b12e4d84-12b6-4c1f-8d9e-5ed41e6ca2b8', expected: 351 },
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

async function main() {
  console.log('\n📊 Verificación:\n')
  for (const t of TARGETS) {
    const n = await count(t.id)
    const ok = n >= t.expected ? '✅' : n > 0 ? '🟡' : '❌'
    console.log(`   ${ok} ${t.name.padEnd(25)} ${String(n).padStart(4)} / ${t.expected}`)
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
