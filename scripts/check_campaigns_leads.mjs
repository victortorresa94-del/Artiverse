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
  // Fetch campañas
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

  console.log('🎯 Estado de leads en campañas:\n')
  for (const camp of filtered) {
    console.log(`${camp.name}`)
    console.log(`  Campaign ID: ${camp.id}`)
    console.log(`  Status: ${camp.status === 1 ? '✅ ACTIVE' : '⏳ PENDING'}`)
    console.log(`  Email list: ${camp.email_list?.join(', ') || 'NONE'}`)
    console.log()
  }
}

main().catch(e => console.error('Error:', e.message))
