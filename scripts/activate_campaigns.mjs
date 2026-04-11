/**
 * activate_campaigns.mjs — Activate the 4 new campaigns
 *
 * Campaigns to activate by name:
 * 1. Distribuidoras - Artiverse — 520 leads
 * 2. Dance from Spain 2 - Artiverse — 242 leads
 * 3. Festivales - Artiverse — 638 leads
 * 4. Socios ARTE - Artiverse — 280 leads
 *
 * Uso:
 *   node scripts/activate_campaigns.mjs [--dry-run]
 */

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'
const DRY_RUN = process.argv.includes('--dry-run')

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
    console.log('\nAvailable campaigns:')
    campaigns
      .filter(c => !c.name.includes('[AI SDR]'))
      .forEach(c => console.log(`  - ${c.name}`))
    process.exit(1)
  }

  console.log('📋 Campaigns to activate:')
  let totalLeads = 0
  targetCampaigns.forEach(c => {
    const status = c.status === 1 ? '🟢' : '⏳'
    console.log(`${status} ${c.name}`)
    console.log(`   ID: ${c.id}`)
    console.log(`   Status: ${c.status === 1 ? 'ACTIVE' : 'PENDING'}`)
  })

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would activate 4 campaigns')
    process.exit(0)
  }

  console.log('\n⚙️  Activating campaigns...\n')

  let success = 0, failed = 0

  for (const camp of targetCampaigns) {
    if (camp.status === 1) {
      console.log(`⏭️  ${camp.name} — already active`)
      success++
      continue
    }

    try {
      const res = await apiFetch(`/campaigns/${camp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 1 })
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

  console.log(`\n🎉 Activation complete:`)
  console.log(`   ✅ ${success} campaigns active`)
  if (failed > 0) console.log(`   ❌ ${failed} campaigns failed`)
  console.log(`\n📝 Next steps:`)
  console.log(`   1. Monitor email delivery & warmup domains`)
  console.log(`   2. HubSpot sync: upload 2,597 contacts`)
  console.log(`   3. Deploy: vercel --prod`)

}

main()
