const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'
const SEND_EMAIL = 'victor@artiversemail.es'

const CAMPAIGNS_TO_FIX = [
  { name: 'Dance from Spain 2 - Artiverse', id: 'ab991775-a955-4d53-9b77-298aec13074e' },
  { name: 'Festivales - Artiverse', id: '6e151dbe-f16b-4111-a2b6-cf6a33941967' },
  { name: 'Socios ARTE - Artiverse', id: '3a31a680-f37c-4bb8-a39a-eed87e2b1db0' }
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
  console.log('🔧 Fixing missing email_list on 3 campaigns\n')

  for (const camp of CAMPAIGNS_TO_FIX) {
    try {
      const updated = await apiFetch(`/campaigns/${camp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ email_list: [SEND_EMAIL] })
      })

      console.log(`✅ ${camp.name}`)
      console.log(`   Email: ${updated.email_list?.join(', ') || 'NOT SET'}`)
    } catch (err) {
      console.log(`❌ ${camp.name}: ${err.message}`)
    }
  }

  console.log('\n✅ Fix complete')
}

main()
