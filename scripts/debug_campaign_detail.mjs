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
  // Fetch una campaña con todos sus detalles
  const campaigns = []
  let offset = 0
  while (true) {
    const res = await apiFetch(`/campaigns?limit=50&skip=${offset}`)
    if (!res.items || res.items.length === 0) break
    campaigns.push(...res.items)
    if (res.items.length < 50) break
    offset += 50
  }

  // Busca Distribuidoras y muestra TODOS sus campos
  const dist = campaigns.find(c => c.name === 'Distribuidoras - Artiverse')
  if (!dist) {
    console.log('Campaign not found')
    process.exit(1)
  }

  console.log('=== Distribuidoras campaign full details ===')
  console.log(JSON.stringify(dist, null, 2))
  console.log('\n=== Keys present ===')
  console.log(Object.keys(dist).sort())
}

main().catch(e => console.error('Error:', e.message))
