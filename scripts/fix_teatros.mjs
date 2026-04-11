/**
 * fix_teatros.mjs — Fix Teatros campaign + Create Teatro Danza 2
 *
 * CRITICAL: Teatros campaign (status 1) has WRONG copy targeting companies.
 * Need to:
 * 1. Update Teatros campaign sequences with CORRECT copy (target programmers)
 * 2. Create Teatro Danza 2 campaign from list 252a990b with same copy
 *
 * Uso:
 *   node scripts/fix_teatros.mjs [--dry-run]
 */

const API_KEY = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE = 'https://api.instantly.ai/api/v2'
const SEND_EMAIL = 'victor@artiversemail.es'
const DRY_RUN = process.argv.includes('--dry-run')

// ── CORRECT Teatros copy (targets programmers/decision makers at theaters) ─────
const TEATROS_COPY = {
  step1: [
    {
      subject: 'La gestión de teatros no tiene que ser tan complicada.',
      body: `<p>Hola {{firstName}},</p>
<p>Programar una temporada en {{companyName}} implica coordinar con compañías, gestionar dossieres, negociar condiciones… todo por email y teléfono.</p>
<p>Artiverse es la plataforma B2B donde teatros, auditorios y compañías escénicas se conectan directamente. Perfiles verificados, portfolios, contacto directo.</p>
<p>Más de 130 organizaciones ya dentro. Gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor<br>Artiverse</p>`
    },
    {
      subject: '¿Cuántos dossieres recibís a la semana en {{companyName}}?',
      body: `<p>Hola {{firstName}},</p>
<p>Los programadores de teatro reciben docenas de dossieres a la semana. La mayoría se pierden en el email.</p>
<p>Artiverse centraliza todo: las compañías tienen su perfil con vídeos, fichas técnicas y disponibilidad. Vosotros buscáis por especialidad, aforo o fechas.</p>
<p>Registro gratuito en <a href="https://artiverse.es">artiverse.es</a>. Ya somos +130 organizaciones.</p>
<p>Víctor</p>`
    },
    {
      subject: 'Teatros + Compañías en un mismo lugar.',
      body: `<p>Hola {{firstName}},</p>
<p>La realidad del sector: {{companyName}} busca compañías, pero ellas os buscan a vosotros. Los dossieres llegan, pero desordenados.</p>
<p>Artiverse ordena todo. Un perfil para cada compañía, un buscador para {{companyName}}. Sin spam, sin ruido.</p>
<p>Pruebalo gratis en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor</p>`
    }
  ],
  step2: `<p>Hola {{firstName}},</p>
<p>Os escribía sobre Artiverse la semana pasada. ¿Pudisteis echarle un vistazo?</p>
<p>Si queréis, en <a href="https://artiverse.es">artiverse.es</a> el perfil de {{companyName}} está en 5 minutos y es completamente gratuito.</p>
<p>Víctor</p>`,
  step3: `<p>Hola {{firstName}},</p>
<p>Último intento. Si en algún momento buscáis compañías o queréis que {{companyName}} aparezca en la red de programadores más activa de España, en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor</p>`
}

// ── API helpers ───────────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log('🔍 Fetching all campaigns...')
    const campaigns = await getAllCampaigns()

    const teatros = campaigns.find(c => c.name === 'Teatros')
    if (!teatros) {
      console.error('❌ Teatros campaign not found!')
      process.exit(1)
    }

    const teatroDanza2ListId = '252a990b'

    console.log(`\n📋 Found Teatros campaign:`)
    console.log(`   ID: ${teatros.id}`)
    console.log(`   Status: ${teatros.status} (${teatros.status === 1 ? 'ACTIVE' : 'INACTIVE'})`)
    console.log(`   Email list: ${JSON.stringify(teatros.email_list)}`)

    if (DRY_RUN) {
      console.log('\n[DRY RUN] Would perform:')
      console.log(`1. Update Teatros campaign ${teatros.id} with CORRECT sequences`)
      console.log(`2. Create "Teatro Danza 2" campaign from list ${teatroDanza2ListId}`)
      process.exit(0)
    }

    // ── Step 1: Update Teatros campaign ───────────────────────────────────────
    console.log(`\n✏️  Updating Teatros campaign ${teatros.id}...`)

    const updatePayload = {
      sequences: [{
        steps: [
          {
            type: 'email',
            delay: 0,
            variants: TEATROS_COPY.step1
          },
          {
            type: 'email',
            delay: 4,
            variants: [{ subject: '', body: TEATROS_COPY.step2 }]
          },
          {
            type: 'email',
            delay: 4,
            variants: [{ subject: '', body: TEATROS_COPY.step3 }]
          }
        ]
      }]
    }

    const updateRes = await apiFetch(`/campaigns/${teatros.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updatePayload)
    })

    console.log(`✅ Teatros campaign updated successfully`)

    // ── Step 2: Create Teatro Danza 2 campaign ────────────────────────────────
    console.log(`\n✏️  Creating Teatro Danza 2 campaign...`)

    const createPayload = {
      name: 'Teatro Danza 2',
      email_list: [SEND_EMAIL],
      lead_list_ids: [teatroDanza2ListId],
      campaign_schedule: {
        schedules: [{
          name: 'Weekdays',
          timing: { from: '09:00', to: '18:00' },
          days: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
          timezone: 'Etc/GMT+12'
        }]
      },
      sequences: [{
        steps: [
          {
            type: 'email',
            delay: 0,
            variants: TEATROS_COPY.step1
          },
          {
            type: 'email',
            delay: 4,
            variants: [{ subject: '', body: TEATROS_COPY.step2 }]
          },
          {
            type: 'email',
            delay: 4,
            variants: [{ subject: '', body: TEATROS_COPY.step3 }]
          }
        ]
      }]
    }

    const createRes = await apiFetch('/campaigns', {
      method: 'POST',
      body: JSON.stringify(createPayload)
    })

    console.log(`✅ Teatro Danza 2 campaign created`)
    console.log(`   Campaign ID: ${createRes.id}`)
    console.log(`   List ID: ${teatroDanza2ListId}`)
    console.log(`   Status: ${createRes.status}`)

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log(`\n🎉 CRÍTICA fixes completed:`)
    console.log(`   1. ✅ Teatros campaign updated with CORRECT copy (targets programmers)`)
    console.log(`   2. ✅ Teatro Danza 2 campaign created (493 leads)`)
    console.log(`\n📝 Next steps:`)
    console.log(`   1. Review email content in Instantly UI`)
    console.log(`   2. Fix systematic issues across all 7 campaigns (Step 2/3 {{firstName}}, subjects, etc.)`)
    console.log(`   3. Activate 4 new campaigns (Distribuidoras, Dance 2, Festivales, Socios ARTE)`)

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

main()
