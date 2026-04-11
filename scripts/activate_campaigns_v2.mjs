/**
 * activate_campaigns_v2.mjs — Activate campaigns with complete payload
 *
 * Intenta activar las campañas enviando un PATCH con todos los campos
 * (campaign_schedule + sequences) en lugar de solo status
 */

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'

const CAMPAIGNS_TO_ACTIVATE = [
  'Distribuidoras - Artiverse',
  'Dance from Spain 2 - Artiverse',
  'Festivales - Artiverse',
  'Socios ARTE - Artiverse'
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

async function getAllCampaigns() {
  const campaigns = []
  let offset = 0
  const limit = 50

  while (true) {
    const res = await apiFetch(`/campaigns?limit=${limit}&skip=${offset}`)
    if (!res.items || res.items.length === 0) break
    campaigns.push(...res.items)
    if (res.items.length < limit) break
    offset += limit
  }

  return campaigns
}

async function main() {
  console.log('🔍 Fetching all campaigns...\n')

  const campaigns = await getAllCampaigns()
  const targetCampaigns = campaigns.filter(c =>
    CAMPAIGNS_TO_ACTIVATE.includes(c.name)
  )

  if (targetCampaigns.length !== CAMPAIGNS_TO_ACTIVATE.length) {
    console.log(`❌ Only found ${targetCampaigns.length}/${CAMPAIGNS_TO_ACTIVATE.length} campaigns`)
    process.exit(1)
  }

  console.log('📋 Attempting activation with complete payload...\n')

  let success = 0, failed = 0

  for (const camp of targetCampaigns) {
    if (camp.status === 1) {
      console.log(`⏭️  ${camp.name} — already active`)
      success++
      continue
    }

    try {
      // Enviar un PATCH con todos los campos (no solo status)
      const payload = {
        status: 1,
        campaign_schedule: camp.campaign_schedule,
        sequences: camp.sequences,
        email_list: camp.email_list
      }

      const res = await apiFetch(`/campaigns/${camp.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })

      if (res.status === 1) {
        console.log(`✅ ${camp.name} — ACTIVATED`)
        success++
      } else {
        console.log(`⚠️  ${camp.name} — status ${res.status}`)
      }
    } catch (err) {
      console.log(`❌ ${camp.name}: ${err.message}`)
      failed++
    }
  }

  console.log(`\n🎉 Result: ${success}✅ ${failed}❌`)
}

main()
