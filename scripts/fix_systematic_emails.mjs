/**
 * fix_systematic_emails.mjs — Apply systematic email fixes across all 7 campaigns
 *
 * Issues to fix:
 * 1. ✏️ Add {{firstName}} to Step 2/3 (currently missing)
 * 2. ✏️ Remove subjects from Step 2/3 (breaks email threading)
 * 3. ✏️ Fix "Aether Labs" → "Artiverse" branding
 * 4. ✏️ Make CTAs more direct (remove "si en algún momento")
 * 5. ✏️ Improve passive language
 *
 * Campañas affected: All 7 + Calentamiento (8 total)
 *
 * Uso:
 *   node scripts/fix_systematic_emails.mjs [--dry-run]
 */

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'
const DRY_RUN = process.argv.includes('--dry-run')

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

// ── Fix functions ─────────────────────────────────────────────────────────────
function fixStep2Body(original) {
  return original
    .replace(/Víctor\n?<br\s*\/?>Aether Labs/gi, 'Víctor')
    .replace(/Víctor<br\s*\/>Aether Labs/gi, 'Víctor')
    .replace(/Aether Labs/gi, 'Artiverse')
    .replace(/si en algún momento/gi, 'cuando')
}

function addFirstNameToStep2(step2Content) {
  if (!step2Content.includes('{{firstName}}')) {
    return step2Content.replace(
      /<p>Hola <\/p>/,
      '<p>Hola {{firstName}},</p>'
    ).replace(
      /<p>Hola\s*<\/p>/,
      '<p>Hola {{firstName}},</p>'
    ).replace(
      /<p>Hola<\/p>/,
      '<p>Hola {{firstName}},</p>'
    )
  }
  return step2Content
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log('🔍 Fetching all campaigns...')
    const campaigns = await getAllCampaigns()

    // Filter relevant campaigns (exclude AI SDR)
    const targetCampaigns = campaigns.filter(c =>
      !c.name.includes('[AI SDR]') && !c.name.toLowerCase().includes('ai sdr')
    )

    console.log(`\n📋 Found ${targetCampaigns.length} campaigns to review:`)
    targetCampaigns.forEach(c => {
      console.log(`   - ${c.name} (ID: ${c.id.slice(0, 8)}...)`)
    })

    const updates = []

    for (const campaign of targetCampaigns) {
      if (!campaign.sequences || !campaign.sequences[0] || !campaign.sequences[0].steps) {
        console.log(`⏭️  Skipping ${campaign.name} (no sequences)`)
        continue
      }

      const seq = campaign.sequences[0]
      const steps = [...seq.steps]
      let needsUpdate = false

      // Fix Step 2 (index 1)
      if (steps[1]) {
        if (steps[1].variants && steps[1].variants[0]) {
          const step2 = steps[1].variants[0]
          let newBody = fixStep2Body(step2.body || '')
          newBody = addFirstNameToStep2(newBody)

          if (newBody !== (step2.body || '')) {
            steps[1].variants[0] = { ...step2, body: newBody }
            needsUpdate = true
          }

          // Ensure Step 2 has empty subject (for threading)
          if (step2.subject && step2.subject.trim()) {
            steps[1].variants[0] = { ...steps[1].variants[0], subject: '' }
            needsUpdate = true
          }
        }
      }

      // Fix Step 3 (index 2)
      if (steps[2]) {
        if (steps[2].variants && steps[2].variants[0]) {
          const step3 = steps[2].variants[0]
          let newBody = fixStep2Body(step3.body || '')
          newBody = addFirstNameToStep2(newBody)

          if (newBody !== (step3.body || '')) {
            steps[2].variants[0] = { ...step3, body: newBody }
            needsUpdate = true
          }

          // Ensure Step 3 has empty subject
          if (step3.subject && step3.subject.trim()) {
            steps[2].variants[0] = { ...steps[2].variants[0], subject: '' }
            needsUpdate = true
          }
        }
      }

      if (needsUpdate) {
        updates.push({
          id: campaign.id,
          name: campaign.name,
          payload: { sequences: [{ ...seq, steps }] }
        })
      }
    }

    console.log(`\n📊 Found ${updates.length} campaigns needing updates`)

    if (DRY_RUN) {
      console.log('\n[DRY RUN] Would update:')
      updates.forEach(u => {
        console.log(`   - ${u.name}`)
      })
      process.exit(0)
    }

    // Apply updates
    let success = 0, failed = 0
    for (const update of updates) {
      try {
        await apiFetch(`/campaigns/${update.id}`, {
          method: 'PATCH',
          body: JSON.stringify(update.payload)
        })
        console.log(`✅ ${update.name}`)
        success++
      } catch (err) {
        console.log(`❌ ${update.name}: ${err.message}`)
        failed++
      }
    }

    console.log(`\n🎉 Systematic email fixes completed:`)
    console.log(`   ✅ ${success} campaigns updated`)
    if (failed > 0) console.log(`   ❌ ${failed} campaigns failed`)
    console.log(`\n📝 Next: Activate 4 new campaigns`)

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

main()
