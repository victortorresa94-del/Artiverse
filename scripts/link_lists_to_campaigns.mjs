const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

const LINKS = [
  { 
    campaign_id: 'fd6e7810-f4b3-480b-8801-eaf38234d023',
    list_id: '8b43760b-04b9-4f66-97eb-854af4898f16',
    name: 'Distribuidoras'
  },
  {
    campaign_id: 'ab991775-a955-4d53-9b77-298aec13074e',
    list_id: 'b487fd4c-a45a-41b5-96c6-54b452744646',
    name: 'Dance from Spain 2'
  },
  {
    campaign_id: '6e151dbe-f16b-4111-a2b6-cf6a33941967',
    list_id: '18c9a4aa-aa3b-4a99-b4f6-1a17a3383011',
    name: 'Festivales'
  },
  {
    campaign_id: '3a31a680-f37c-4bb8-a39a-eed87e2b1db0',
    list_id: '2a24e922-1126-4064-a76d-15d507f28042',
    name: 'Socios ARTE'
  },
  {
    campaign_id: 'e6e60e78-2246-4b6f-a4d6-d44b605da3a6',
    list_id: '252a990b-2802-47f5-bc55-61b15fd897c4',
    name: 'Teatro Danza 2'
  }
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
  console.log('🔗 Asociando leads a campañas...\n')

  let success = 0, failed = 0

  for (const link of LINKS) {
    try {
      await apiFetch('/leads/move', {
        method: 'POST',
        body: JSON.stringify({
          list_id: link.list_id,
          to_campaign_id: link.campaign_id,
          copy_leads: true
        })
      })

      console.log(`✅ ${link.name}`)
      success++
    } catch (err) {
      console.log(`❌ ${link.name}: ${err.message}`)
      failed++
    }
  }

  console.log(`\n✅ ${success} asociaciones iniciadas`)
  if (failed > 0) console.log(`❌ ${failed} fallidas`)
  console.log('\n⏳ Los leads deberían aparecer en las campañas en 5-10 segundos.')
}

main()
