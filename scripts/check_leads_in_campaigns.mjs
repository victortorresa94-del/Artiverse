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
  // Fetch todas las listas
  const lists = []
  let offset = 0
  while (true) {
    const res = await apiFetch(`/lead-lists?limit=50&skip=${offset}`)
    if (!res.items || res.items.length === 0) break
    lists.push(...res.items)
    if (res.items.length < 50) break
    offset += 50
  }

  console.log('📋 Lead Lists encontradas:\n')
  for (const list of lists) {
    // Fetch leads de esta lista
    let leads = []
    let cursor = null
    while (true) {
      const res = await apiFetch(`/leads/list?list_id=${list.id}&cursor=${cursor || ''}`)
      if (!res.data) break
      leads = leads.concat(res.data)
      if (!res.cursor) break
      cursor = res.cursor
    }

    console.log(`${list.name}`)
    console.log(`  List ID: ${list.id}`)
    console.log(`  Leads en la lista: ${leads.length}`)
    console.log()
  }
}

main().catch(e => console.error('Error:', e.message))
