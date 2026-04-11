/**
 * create_campaign.mjs — Crea una campaña completa en Instantly desde un CSV
 *
 * Uso:
 *   node scripts/create_campaign.mjs \
 *     --csv "C:/ruta/leads.csv" \
 *     --name "Festivales 1" \
 *     --segment "Festivales" \
 *     --email "victor@artiversemail.es" \
 *     [--dry-run]        ← solo parsea y muestra, no llama a la API
 *     [--no-activate]    ← crea pero no activa la campaña
 *
 * Segmentos disponibles y sus copies:
 *   - Salas Conciertos
 *   - Teatros
 *   - Festivales
 *   - Distribuidoras
 *   - Managers
 *   - Instituciones
 *
 * Si el segmento no tiene copy definido, usa el genérico.
 */

import { readFileSync } from 'fs'

// ── Config ────────────────────────────────────────────────────────────────────
const API_KEY     = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE    = 'https://api.instantly.ai/api/v2'
const CONCURRENCY = 2
const DELAY_MS    = 500
const MAX_RETRIES = 3

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(name)
  return i !== -1 ? args[i + 1] : null
}
const CSV_PATH   = getArg('--csv')
const CAMP_NAME  = getArg('--name')
const SEGMENT    = getArg('--segment') || 'General'
const SEND_EMAIL = getArg('--email') || 'victor@artiversemail.es'
const DRY_RUN    = args.includes('--dry-run')
const NO_ACTIVATE = args.includes('--no-activate')

if (!CSV_PATH || !CAMP_NAME) {
  console.error('❌ Uso: node scripts/create_campaign.mjs --csv <ruta> --name <nombre> [--segment <seg>] [--email <email>]')
  process.exit(1)
}

// ── Email copies por segmento ─────────────────────────────────────────────────
const COPIES = {
  'Salas Conciertos': {
    step1: [
      {
        subject: 'Ya está bien de gestionar el arte por WhatsApp.',
        body: `<p>Hola {{firstName}},</p>
<p>¿Cuánto tiempo lleváis gestionando actuaciones por email, WhatsApp y Excel? En {{companyName}} seguramente conocéis bien ese caos.</p>
<p>Artiverse es la plataforma B2B que conecta salas de conciertos y promotores con compañías y artistas de artes escénicas. Todo en un sitio: perfiles, contratación, agenda.</p>
<p>Ya hay +130 organizaciones dentro. Registro gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>¿Le dais un ojo?</p>
<p>Víctor<br>Aether Labs</p>`
      },
      {
        subject: 'Lleváis años mandando dossieres. Hay una forma mejor.',
        body: `<p>Hola {{firstName}},</p>
<p>Cada vez que {{companyName}} busca un artista nuevo, empieza la misma historia: PDFs por email, llamadas, Excel de seguimiento.</p>
<p>Artiverse elimina ese proceso. Una plataforma donde salas, promotores y artistas conectan directamente. Perfiles completos, contratación, historial.</p>
<p>Gratuito para empezar. Más de 130 organizaciones ya dentro.</p>
<p><a href="https://artiverse.es">artiverse.es</a> — ¿Lo probáis?</p>
<p>Víctor</p>`
      }
    ],
    step2: `<p>Hola {{firstName}},</p>
<p>Te escribía la semana pasada sobre Artiverse. ¿Tuviste un momento de verlo?</p>
<p>Si te viene bien, en <a href="https://artiverse.es">artiverse.es</a> el registro es gratuito y en 5 minutos tenéis el perfil de {{companyName}} dentro de la red.</p>
<p>Víctor</p>`,
    step3: `<p>Hola {{firstName}},</p>
<p>Último mensaje, lo prometo.</p>
<p>Si en algún momento os interesa tener {{companyName}} en Artiverse y conectar con compañías y artistas sin el caos habitual, estáis en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Suerte con la programación.</p>
<p>Víctor</p>`
  },

  'Teatros': {
    step1: [
      {
        subject: 'La gestión de teatros no tiene que ser tan complicada.',
        body: `<p>Hola {{firstName}},</p>
<p>Programar una temporada en {{companyName}} implica coordinar con compañías, gestionar dossieres, negociar condiciones… todo por email y teléfono.</p>
<p>Artiverse es la plataforma B2B donde teatros, auditorios y compañías escénicas se conectan directamente. Perfiles verificados, portfolios, contacto directo.</p>
<p>Más de 130 organizaciones ya dentro. Gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor<br>Aether Labs</p>`
      },
      {
        subject: '¿Cuántos dossieres recibís a la semana en {{companyName}}?',
        body: `<p>Hola {{firstName}},</p>
<p>Los programadores de teatro reciben docenas de dossieres a la semana. La mayoría se pierden en el email.</p>
<p>Artiverse centraliza todo: las compañías tienen su perfil con vídeos, fichas técnicas y disponibilidad. Vosotros buscáis por especialidad, aforo o fechas.</p>
<p>Registro gratuito en <a href="https://artiverse.es">artiverse.es</a>. Ya somos +130 organizaciones.</p>
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
  },

  'Festivales': {
    step1: [
      {
        subject: 'Programar un festival tiene que ser más ágil.',
        body: `<p>Hola {{firstName}},</p>
<p>Montar la programación de {{companyName}} implica semanas de contactos, propuestas y negociaciones. Todo manual.</p>
<p>Artiverse es la plataforma donde festivales y promotores encuentran directamente a artistas y compañías verificadas. Perfiles con riders, vídeos y disponibilidad.</p>
<p>+130 organizaciones dentro. Gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor<br>Aether Labs</p>`
      },
      {
        subject: '¿Cómo gestionáis las propuestas artísticas en {{companyName}}?',
        body: `<p>Hola {{firstName}},</p>
<p>La mayoría de festivales gestionan las propuestas por email, con el consiguiente caos de seguimiento y comparación.</p>
<p>Artiverse centraliza todo en una plataforma B2B: artistas con perfil completo, festivales con su programación. Búsqueda por estilo, formato y fechas.</p>
<p>Gratuito. <a href="https://artiverse.es">artiverse.es</a></p>
<p>Víctor</p>`
      }
    ],
    step2: `<p>Hola {{firstName}},</p>
<p>Te escribía sobre Artiverse. ¿Tuviste un momento?</p>
<p>Si os viene bien para la próxima programación, el registro de {{companyName}} es gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor</p>`,
    step3: `<p>Hola {{firstName}},</p>
<p>Última vez, lo prometo. Si en algún momento necesitáis encontrar artistas o compañías para {{companyName}}, artiverse.es está ahí.</p>
<p>Víctor</p>`
  },

  'Distribuidoras': {
    step1: [
      {
        subject: 'Vuestro catálogo merece llegar a más programadores.',
        body: `<p>Hola {{firstName}},</p>
<p>En {{companyName}} tenéis compañías y espectáculos que merecen llegar a más teatros, festivales y auditorios. El problema es siempre el mismo: contactar con todos ellos.</p>
<p>Artiverse es la red B2B de las artes escénicas en España. Distribuidoras, compañías y programadores en un mismo sitio.</p>
<p>+130 organizaciones. Gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor<br>Aether Labs</p>`
      },
      {
        subject: '¿Cómo hacéis el outreach con vuestro catálogo?',
        body: `<p>Hola {{firstName}},</p>
<p>Las distribuidoras de artes escénicas pasan mucho tiempo mandando dossieres y siguiendo a programadores por email.</p>
<p>Artiverse lo automatiza: vuestro catálogo en un perfil accesible para todos los programadores de España. Ellos os encuentran a vosotros.</p>
<p>Gratuito. <a href="https://artiverse.es">artiverse.es</a></p>
<p>Víctor</p>`
      }
    ],
    step2: `<p>Hola {{firstName}},</p>
<p>Os escribía sobre Artiverse la semana pasada. ¿Pudisteis verlo?</p>
<p>El perfil de {{companyName}} estaría visible para todos los programadores de la plataforma. Registro gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor</p>`,
    step3: `<p>Hola {{firstName}},</p>
<p>Último mensaje. Si en algún momento queréis dar más visibilidad al catálogo de {{companyName}}, en <a href="https://artiverse.es">artiverse.es</a> estamos.</p>
<p>Víctor</p>`
  },

  'General': {
    step1: [
      {
        subject: 'La red B2B de las artes escénicas en España.',
        body: `<p>Hola {{firstName}},</p>
<p>Os escribo porque {{companyName}} encaja perfectamente en Artiverse, la plataforma B2B que conecta a los actores clave de las artes escénicas en España.</p>
<p>Teatros, salas, festivales, distribuidoras, compañías y artistas — todo en un sitio. Más de 130 organizaciones ya dentro.</p>
<p>Registro gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor<br>Aether Labs</p>`
      },
      {
        subject: '¿Conocéis Artiverse?',
        body: `<p>Hola {{firstName}},</p>
<p>Artiverse es la plataforma donde las artes escénicas en España se conectan: programadores, compañías, distribuidoras, festivales.</p>
<p>{{companyName}} podría tener su perfil visible para toda la red. Gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor</p>`
      }
    ],
    step2: `<p>Hola {{firstName}},</p>
<p>Te escribía sobre Artiverse. ¿Tuviste un momento de verlo?</p>
<p>Registro gratuito en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor</p>`,
    step3: `<p>Hola {{firstName}},</p>
<p>Último intento. Si en algún momento queréis que {{companyName}} aparezca en la red de artes escénicas más activa de España, en <a href="https://artiverse.es">artiverse.es</a>.</p>
<p>Víctor</p>`
  }
}

// ── CSV parser robusto (soporta newlines en quoted fields) ─────────────────────
function parseCSV(raw) {
  const rows = []
  let row = [], field = '', inQuote = false

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i], next = raw[i + 1]

    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"') inQuote = false
      else field += ch
    } else {
      if (ch === '"') { inQuote = true }
      else if (ch === ',') { row.push(field.trim()); field = '' }
      else if ((ch === '\r' && next === '\n') || ch === '\n' || ch === '\r') {
        row.push(field.trim()); rows.push(row); row = []; field = ''
        if (ch === '\r' && next === '\n') i++
      } else field += ch
    }
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row) }
  return rows.filter(r => r.length > 1)
}

function toProper(s) {
  if (!s) return ''
  return s.toLowerCase()
    .replace(/(^|\s|-)([a-záéíóúüñàèìòùâêîôûäëïöü])/gu, (_, pre, ch) => pre + ch.toUpperCase())
    .trim()
}

function firstEmail(raw) {
  return (raw || '').split(/[\s,;]+/).find(e => e.includes('@') && e.includes('.')) || ''
}

function cleanPhone(p) {
  return ((p || '').split(/[\n\r]/)[0]).split(/\s{2,}/)[0].replace(/\s+/g, ' ').trim()
}

function cleanWebsite(w) {
  if (!w) return ''
  const url = w.split(/\s+/)[0].trim()
  if (!url) return ''
  return url.startsWith('http') ? url : `https://${url}`
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}, attempt = 1) {
  try {
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
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await sleep(600 * attempt)
      return apiFetch(path, options, attempt + 1)
    }
    throw err
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Step 1: Create campaign with sequences ─────────────────────────────────────
async function createCampaign(name, segment, sendEmail) {
  const copy = COPIES[segment] || COPIES['General']

  const payload = {
    name,
    email_list: [sendEmail],
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
          variants: copy.step1
        },
        {
          type: 'email',
          delay: 4,
          variants: [{ subject: '', body: copy.step2 }]
        },
        {
          type: 'email',
          delay: 4,
          variants: [{ subject: '', body: copy.step3 }]
        }
      ]
    }]
  }

  return await apiFetch('/campaigns', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

// ── Step 2: Create lead list ──────────────────────────────────────────────────
async function createLeadList(name) {
  return await apiFetch('/lead-lists', {
    method: 'POST',
    body: JSON.stringify({ name })
  })
}

// ── Step 3: Upload leads to list ──────────────────────────────────────────────
async function uploadLead(lead, listId, attempt = 1) {
  return await apiFetch('/leads', {
    method: 'POST',
    body: JSON.stringify({
      list_id: listId,
      email: lead.email,
      first_name: lead.first_name,
      last_name: lead.last_name,
      company_name: lead.company_name,
      phone: lead.phone,
      website: lead.website,
      personalization: lead.personalization || '',
    })
  }, attempt)
}

async function uploadLeads(leads, listId) {
  let ok = 0, fail = 0, dup = 0

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const chunk = leads.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(l => uploadLead(l, listId)))

    for (let j = 0; j < results.length; j++) {
      const r = results[j]
      const lead = chunk[j]
      if (r.status === 'fulfilled') {
        ok++
        process.stdout.write('.')
      } else {
        const msg = r.reason?.message || ''
        if (msg.includes('duplicate') || msg.includes('already')) {
          dup++
          process.stdout.write('D')
        } else {
          fail++
          process.stdout.write('E')
          if (fail <= 3) console.error(`\n   ❌ ${lead.email}: ${msg}`)
        }
      }
    }

    if (i + CONCURRENCY < leads.length) {
      await sleep(DELAY_MS)
    }
  }

  return { ok, fail, dup }
}

// ── Step 4: Move list to campaign ─────────────────────────────────────────────
async function moveListToCampaign(listId, campaignId) {
  return await apiFetch('/leads/move', {
    method: 'POST',
    body: JSON.stringify({
      list_id: listId,
      to_campaign_id: campaignId,
      copy_leads: true
    })
  })
}

// ── Step 5: Activate campaign ─────────────────────────────────────────────────
async function activateCampaign(campaignId) {
  return await apiFetch('/campaigns/' + campaignId + '/activate', {
    method: 'POST',
    body: JSON.stringify({})
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎯 Artiverse Campaign Creator`)
  console.log(`   Campaña : ${CAMP_NAME}`)
  console.log(`   Segmento: ${SEGMENT}`)
  console.log(`   Email   : ${SEND_EMAIL}`)
  console.log(`   CSV     : ${CSV_PATH}`)
  if (DRY_RUN) console.log('   ⚠️  DRY RUN — no se llamará a la API')
  console.log()

  // 1. Parse CSV
  const raw = readFileSync(CSV_PATH, 'utf-8')
  const rows = parseCSV(raw)

  // Detect if file has meta-row (row[0] is meta, row[1] is headers) or just headers (row[0])
  // Heuristic: if row[0][0] looks like a column name (email, firstName, etc.), it's headers directly
  let headers, dataRows
  const firstRow = rows[0]
  const hasEmail = firstRow.some(h => h.toLowerCase().includes('email'))
  if (hasEmail) {
    headers = firstRow
    dataRows = rows.slice(1)
  } else {
    headers = rows[1]
    dataRows = rows.slice(2)
  }

  console.log(`📂 CSV: ${dataRows.length} filas`)

  const leads = [], skipped = []

  for (const row of dataRows) {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (row[i] || '').replace(/\s+/g, ' ').trim() })

    const email = firstEmail(obj.email || obj.Email || obj.EMAIL || '')
    if (!email) { skipped.push(obj.companyName || obj.company_name || obj.CompanyName || '?'); continue }

    leads.push({
      email,
      first_name:   toProper(obj.firstName || obj.first_name || obj.FirstName || ''),
      last_name:    toProper(obj.lastName  || obj.last_name  || obj.LastName  || ''),
      company_name: obj.companyName || obj.company_name || obj.CompanyName || '',
      phone:        cleanPhone(obj.phone || obj.Phone || ''),
      website:      cleanWebsite(obj.website || obj.Website || ''),
      personalization: '',
    })
  }

  console.log(`✅ ${leads.length} válidos | ⚠️  ${skipped.length} sin email`)
  if (skipped.length) console.log('   Omitidos:', skipped.slice(0, 5).join(', ') + (skipped.length > 5 ? `... (+${skipped.length - 5})` : ''))

  console.log(`\n📋 Preview (3 primeros):`)
  leads.slice(0, 3).forEach(l =>
    console.log(`   ${l.first_name} ${l.last_name} | ${l.company_name} | ${l.email}`)
  )

  // Show email copy that will be used
  const copy = COPIES[SEGMENT] || COPIES['General']
  console.log(`\n📧 Copy de ${SEGMENT}:`)
  console.log(`   Step 1 Variant A: "${copy.step1[0].subject}"`)
  console.log(`   Step 1 Variant B: "${copy.step1[1].subject}"`)
  console.log(`   Step 2 (4 días): follow-up sin asunto`)
  console.log(`   Step 3 (4 días): cierre sin asunto`)

  if (DRY_RUN) {
    console.log('\n✅ Dry run completado. Usa sin --dry-run para crear la campaña.')
    return
  }

  // 2. Create campaign
  console.log(`\n🚀 Paso 1/4: Creando campaña "${CAMP_NAME}"...`)
  const campaign = await createCampaign(CAMP_NAME, SEGMENT, SEND_EMAIL)
  console.log(`   ✅ Campaña creada: ${campaign.id}`)

  // 3. Create lead list
  console.log(`\n📋 Paso 2/4: Creando lead list "${CAMP_NAME}"...`)
  const list = await createLeadList(CAMP_NAME)
  console.log(`   ✅ Lead list creada: ${list.id}`)

  // 4. Upload leads
  console.log(`\n⬆️  Paso 3/4: Subiendo ${leads.length} leads (${CONCURRENCY} en paralelo)...`)
  console.log('   [. = ok | D = duplicado | E = error]\n   ')
  const { ok, fail, dup } = await uploadLeads(leads, list.id)
  console.log(`\n   ✅ ${ok} creados${dup ? ` | ↺ ${dup} duplicados` : ''}${fail ? ` | ❌ ${fail} errores` : ''}`)

  // 5. Move list to campaign
  console.log(`\n🔗 Paso 4/4: Asociando leads a la campaña...`)
  try {
    const moveResult = await moveListToCampaign(list.id, campaign.id)
    console.log(`   ✅ Leads asociados (job: ${moveResult.id || 'ok'})`)
  } catch (e) {
    console.error(`   ⚠️  move falló: ${e.message} (los leads están en la lista, asócialos manualmente desde Instantly)`)
  }

  // 6. Activate
  if (!NO_ACTIVATE) {
    console.log(`\n▶️  Activando campaña...`)
    const activated = await activateCampaign(campaign.id)
    console.log(`   ✅ Campaña ACTIVA (status: ${activated.status})`)
  } else {
    console.log(`\n⏸️  Campaña creada pero NO activada (--no-activate)`)
  }

  // Summary
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Campaña "${CAMP_NAME}" lista`)
  console.log(`   Campaign ID : ${campaign.id}`)
  console.log(`   List ID     : ${list.id}`)
  console.log(`   Leads       : ${ok} subidos`)
  console.log(`   Email desde : ${SEND_EMAIL}`)
  console.log(`   Estado      : ${NO_ACTIVATE ? 'PAUSADA (activa manualmente)' : 'ACTIVA'}`)
  console.log(`\n   → Instantly → Campaigns → "${CAMP_NAME}"`)
  console.log(`${'─'.repeat(50)}\n`)
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message)
  process.exit(1)
})
