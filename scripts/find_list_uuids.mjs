const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

const SHORT_IDS = ['8b43760b', 'b487fd4c', '18c9a4aa', '2a24e922', '252a990b']

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
  console.log('🔍 Buscando IDs completos de listas...\n')

  try {
    const res = await apiFetch('/lead-lists')
    console.log(JSON.stringify(res, null, 2))
  } catch (err) {
    console.error('Error:', err.message)
  }
}

main()
