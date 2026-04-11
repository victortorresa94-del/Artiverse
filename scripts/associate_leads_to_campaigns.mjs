const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

const CAMPAIGNS_WITH_LISTS = [
  { campaign_id: 'fd6e7810-f4b3-480b-8801-eaf38234d023', list_id: '8b43760b', name: 'Distribuidoras' },
  { campaign_id: 'ab991775-a955-4d53-9b77-298aec13074e', list_id: 'b487fd4c', name: 'Dance from Spain 2' },
  { campaign_id: '6e151dbe-f16b-4111-a2b6-cf6a33941967', list_id: '18c9a4aa', name: 'Festivales' },
  { campaign_id: '3a31a680-f37c-4bb8-a39a-eed87e2b1db0', list_id: '2a24e922', name: 'Socios ARTE' },
  { campaign_id: 'e6e60e78-2246-4b6f-a4d6-d44b605da3a6', list_id: '252a990b', name: 'Teatro Danza 2' }
]

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
  console.log('🔗 Asociando leads a campañas via /leads/move\n')

  for (const item of CAMPAIGNS_WITH_LISTS) {
    try {
      const res = await apiFetch('/leads/move', {
        method: 'POST',
        body: JSON.stringify({
          list_id: item.list_id,
          to_campaign_id: item.campaign_id,
          copy_leads: true
        })
      })

      console.log(`✅ ${item.name}`)
      console.log(`   Campaign: ${item.campaign_id}`)
      console.log(`   List: ${item.list_id}`)
      console.log(`   Job ID: ${res.id || 'ok'}`)
      console.log()
    } catch (err) {
      console.log(`❌ ${item.name}: ${err.message}`)
    }
  }

  console.log('✅ Move jobs initiated. Leads should appear in campaigns within seconds.')
}

main()
