/**
 * salas_conciertos_full.mjs
 *
 * 1. Pausa la campaña vieja Salas 1 (contactos incorrectos)
 * 2. Crea nueva lead list "Salas Conciertos 1"
 * 3. Parsea el CSV completo (377 venues con email)
 * 4. Sube todos los leads a la nueva lista
 * 5. Crea nueva campaña "Salas Conciertos 1" con copy adaptado a programadores
 *    - 3 variantes step 1, 2 variantes step 2, 2 variantes step 3
 * 6. Mueve leads a campaña y activa
 *
 * Uso: node scripts/salas_conciertos_full.mjs [--no-activate] [--dry-run]
 */

import { readFileSync } from 'fs'

const API_KEY        = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE       = 'https://api.instantly.ai/api/v2'
const CSV_PATH       = 'C:/Users/Usuario/Downloads/2022 SALAS CONCIERTOS.xlsx - SALAS DE CONCIERTOS - Claude Code use.csv'
const OLD_CAMPAIGN   = '93040742-10ba-4e56-849a-df1832e95a4e'   // Salas 1 (contactos incorrectos)
const SEND_EMAIL     = 'victor@artiversemail.es'
const CAMP_NAME      = 'Salas Conciertos 1'
const CONCURRENCY    = 3
const DELAY_MS       = 400
const MAX_RETRIES    = 3

const DRY_RUN    = process.argv.includes('--dry-run')
const NO_ACTIVATE = process.argv.includes('--no-activate')

// ── Email copy — programadores de salas de conciertos ─────────────────────────
// Ellos son los COMPRADORES. Buscan artistas. Reciben dossieres sin parar.
// Artiverse les da un catálogo filtrable de artistas verificados.
const SEQUENCES = [{
  steps: [
    // STEP 1 — 3 variantes
    {
      type: 'email',
      delay: 0,
      variants: [
        // Variant A — El problema: demasiadas propuestas no cualificadas
        {
          subject: '¿Cuántos dossieres de artistas revisáis al mes en {{companyName}}?',
          body: `<p>Hola {{firstName}},</p>

<p>Los programadores de salas reciben decenas de propuestas de artistas cada semana. La mayoría no encajan: formato equivocado, rider inasumible, o simplemente no es el estilo de la sala.</p>

<p>Artiverse es la plataforma donde <strong>vosotros buscáis</strong> en vez de recibir. Un catálogo de compañías y artistas verificados, filtrable por género, formato, aforo mínimo y disponibilidad.</p>

<p>Ya están dentro MPC Management, Meteórica, Darlalata, Calaverita Records y más de 130 organizaciones del sector.</p>

<p>El registro para salas es gratuito: <a href="https://artiverse.es">artiverse.es</a></p>

<p>¿Le dais un ojo?</p>

<p>Víctor<br>Aether Labs</p>`
        },
        // Variant B — La oportunidad: descubrir nuevo talento
        {
          subject: 'El próximo artista que llene {{companyName}} puede estar ya en Artiverse',
          body: `<p>Hola {{firstName}},</p>

<p>Artiverse es la red B2B de las artes escénicas en España. Del lado de los artistas y compañías, del lado de las salas: vosotros.</p>

<p>En vez de esperar a que os lleguen propuestas, buscáis directamente por lo que necesitáis: género, tamaño, disponibilidad, presupuesto. Perfiles completos con vídeos y riders técnicos.</p>

<p>130+ organizaciones ya dentro. El registro para programadores es gratuito.</p>

<p><a href="https://artiverse.es">artiverse.es</a> — cinco minutos para tener {{companyName}} dentro.</p>

<p>Víctor</p>`
        },
        // Variant C — Control y eficiencia para el programador
        {
          subject: 'Programar {{companyName}} sin depender de lo que os llegue al email',
          body: `<p>Hola {{firstName}},</p>

<p>La programación de una sala no debería depender de qué propuestas os llegan por email esa semana.</p>

<p>Artiverse invierte eso: vosotros abrís la plataforma, filtráis por lo que buscáis y contactáis directamente. Compañías y artistas de toda España con ficha técnica, vídeos y disponibilidad real.</p>

<p>Gratuito para salas. Más de 130 organizaciones del sector ya dentro, entre ellas agencias como MPC Management, Meteórica y Subterfuge Events.</p>

<p><a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor<br>Aether Labs</p>`
        }
      ]
    },
    // STEP 2 — 2 variantes (delay 4 días)
    {
      type: 'email',
      delay: 4,
      variants: [
        // Variant A — Follow-up directo
        {
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Te escribía la semana pasada sobre Artiverse. ¿Tuviste un momento de echarle un vistazo?</p>

<p>Si os interesa tener acceso al catálogo para la próxima temporada de {{companyName}}, en <a href="https://artiverse.es">artiverse.es</a> el registro es gratuito y en cinco minutos estáis dentro.</p>

<p>Víctor</p>`
        },
        // Variant B — Ángulo diferente: lo que ya usan los competidores
        {
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Vuelvo a escribiros porque cada semana se suman más salas a Artiverse, y no quiero que {{companyName}} se quede fuera cuando los artistas empiecen a buscar por ciudad y aforo.</p>

<p>El modelo es sencillo: artistas y compañías suben sus perfiles, las salas y programadores los encuentran. Sin intermediarios, sin esperar a que os llegue una propuesta.</p>

<p><a href="https://artiverse.es">artiverse.es</a> — gratuito para salas.</p>

<p>Víctor</p>`
        }
      ]
    },
    // STEP 3 — 2 variantes (delay 4 días)
    {
      type: 'email',
      delay: 4,
      variants: [
        // Variant A — Cierre con prueba social
        {
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Último mensaje, lo prometo.</p>

<p>Artiverse ya tiene más de 130 organizaciones del sector escénico español: agencias de booking, managers, compañías de teatro y danza, salas. El catálogo crece cada semana.</p>

<p>Si en algún momento buscáis artistas para {{companyName}} o queréis estar en el radar de las compañías que programan en vuestra zona, en <a href="https://artiverse.es">artiverse.es</a>.</p>

<p>Víctor</p>`
        },
        // Variant B — Cierre directo
        {
          subject: '',
          body: `<p>Hola {{firstName}},</p>

<p>Última vez. Si en algún momento en {{companyName}} necesitáis encontrar artistas sin el proceso habitual de dossieres y llamadas, Artiverse está ahí.</p>

<p>Gratuito. <a href="https://artiverse.es">artiverse.es</a></p>

<p>Víctor</p>`
        }
      ]
    }
  ]
}]

// ── CSV parser robusto ────────────────────────────────────────────────────────
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
      if (ch === '"') inQuote = true
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
  return (raw || '').split(/[\s\n\r,;]+/).find(e => e.includes('@') && e.includes('.')) || ''
}

// Prefer programacion@ or booking@ over info@ or generic
function bestEmail(raw) {
  if (!raw) return ''
  const emails = raw.split(/[\s\n\r,;]+/).filter(e => e.includes('@') && e.includes('.'))
  const priority = ['programacion', 'booking', 'contratacion', 'programación']
  for (const p of priority) {
    const found = emails.find(e => e.toLowerCase().includes(p))
    if (found) return found
  }
  return emails[0] || ''
}

function cleanPhone(p) {
  if (!p) return ''
  return p.split(/[\n\r]/)[0].split(/\s{2,}/)[0].replace(/\s+/g, ' ').trim()
}

function cleanWeb(w) {
  if (!w) return ''
  const url = w.split(/\s+/)[0].trim()
  if (!url) return ''
  return url.startsWith('http') ? url : `https://${url}`
}

// Priority scoring for CRM
function getPriority(aforo, email, asociacion) {
  const cap = parseInt(aforo) || 0
  if (cap >= 1000) return 'high'
  if (cap >= 400) return 'medium'
  if (email.includes('programacion') || email.includes('booking')) return 'medium'
  return 'low'
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

async function uploadLead(lead, listId) {
  return apiFetch('/leads', {
    method: 'POST',
    body: JSON.stringify({
      list_id:      listId,
      email:        lead.email,
      first_name:   lead.first_name,
      last_name:    lead.last_name,
      company_name: lead.company_name,
      phone:        lead.phone,
      website:      lead.website,
      personalization: lead.personalization || '',
    })
  })
}

async function uploadLeads(leads, listId) {
  let ok = 0, fail = 0, dup = 0
  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const chunk = leads.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(l => uploadLead(l, listId)))
    for (let j = 0; j < results.length; j++) {
      const r = results[j], lead = chunk[j]
      if (r.status === 'fulfilled') { ok++; process.stdout.write('.') }
      else {
        const msg = r.reason?.message || ''
        if (msg.includes('duplicate') || msg.includes('already')) { dup++; process.stdout.write('D') }
        else { fail++; process.stdout.write('E'); if (fail <= 5) console.error(`\n   ❌ ${lead.email}: ${msg}`) }
      }
    }
    if (i + CONCURRENCY < leads.length) await sleep(DELAY_MS)
  }
  return { ok, fail, dup }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎯 Salas Conciertos — Full Campaign Setup')
  if (DRY_RUN) console.log('   ⚠️  DRY RUN\n')

  // 1. Parse CSV
  const raw = readFileSync(CSV_PATH, 'utf-8')
  const rows = parseCSV(raw)
  const headers = rows[0]
  const dataRows = rows.slice(1)

  const leads = [], skipped = [], highPriority = []

  for (const row of dataRows) {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (row[i] || '').replace(/\s+/g, ' ').trim() })

    const email = bestEmail(obj['EMAIL'] || '')
    if (!email) { skipped.push(obj['SALA'] || '?'); continue }

    const aforo   = (obj['AFORO'] || '').replace(/[^\d]/g, '') || ''
    const ciudad  = obj['LOCALIDAD'] || ''
    const prov    = obj['PROVINCIA'] || ''
    const sala    = obj['SALA'] || ''
    const contacto = obj['CONTACTO'] || ''
    const assoc   = obj['ASOCIACIÓN'] || ''
    const priority = getPriority(aforo, email, assoc)

    // Split contacto into first/last name
    const nameParts = toProper(contacto).split(' ')
    const firstName = nameParts[0] || ''
    const lastName  = nameParts.slice(1).join(' ') || ''

    const lead = {
      email,
      first_name:   firstName,
      last_name:    lastName,
      company_name: sala,
      phone:        cleanPhone(obj['TELEFONO'] || ''),
      website:      cleanWeb(obj['WEB'] || ''),
      personalization: '',
      // Extra for CRM
      _ciudad: ciudad,
      _provincia: prov,
      _aforo: aforo,
      _priority: priority,
      _asociacion: assoc,
    }

    leads.push(lead)
    if (priority === 'high') highPriority.push({ sala, ciudad, aforo, email })
  }

  console.log(`📂 CSV: ${dataRows.length} venues → ${leads.length} con email (${skipped.length} sin email)`)
  console.log(`⭐ High priority (1000+ aforo): ${highPriority.length}`)

  console.log('\n📋 Preview (primeros 5):')
  leads.slice(0, 5).forEach(l =>
    console.log(`   [${l._priority.toUpperCase()}] ${l.company_name} | ${l._ciudad} | ${l.email} | aforo: ${l._aforo}`)
  )

  console.log('\n⭐ Top priority venues:')
  highPriority.slice(0, 15).forEach(v =>
    console.log(`   ${v.sala} (${v.ciudad}) — ${v.aforo} cap — ${v.email}`)
  )

  console.log('\n📧 Email copy:')
  console.log('   Step 1 (3 variantes):')
  SEQUENCES[0].steps[0].variants.forEach((v, i) =>
    console.log(`     [${i+1}] "${v.subject}"`)
  )
  console.log('   Step 2 (2 variantes, +4 días)')
  console.log('   Step 3 (2 variantes, +4 días)')

  if (DRY_RUN) {
    console.log('\n✅ Dry run OK. Quita --dry-run para ejecutar.')
    return { leads, highPriority }
  }

  // 2. Pause old Salas 1 campaign
  console.log('\n⏸️  Pausando campaña vieja Salas 1...')
  try {
    await apiFetch('/campaigns/' + OLD_CAMPAIGN + '/pause', { method: 'POST', body: '{}' })
    console.log('   ✅ Pausada')
  } catch (e) {
    console.log('   ⚠️  No se pudo pausar (quizás ya estaba):', e.message.slice(0, 80))
  }

  // 3. Create new lead list
  console.log('\n📋 Creando lead list "' + CAMP_NAME + '"...')
  const list = await apiFetch('/lead-lists', {
    method: 'POST',
    body: JSON.stringify({ name: CAMP_NAME })
  })
  console.log('   ✅ List ID:', list.id)

  // 4. Create campaign with sequences
  console.log('\n🚀 Creando campaña "' + CAMP_NAME + '"...')
  const campaign = await apiFetch('/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: CAMP_NAME,
      email_list: [SEND_EMAIL],
      campaign_schedule: {
        schedules: [{
          name: 'Weekdays',
          timing: { from: '09:00', to: '18:00' },
          days: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
          timezone: 'Etc/GMT+12'
        }]
      },
      sequences: SEQUENCES
    })
  })
  console.log('   ✅ Campaign ID:', campaign.id)

  // 5. Upload leads
  console.log(`\n⬆️  Subiendo ${leads.length} leads (${CONCURRENCY} en paralelo)...`)
  console.log('   [. = ok | D = dup | E = error]\n   ')
  const { ok, fail, dup } = await uploadLeads(leads, list.id)
  console.log(`\n   ✅ ${ok} creados${dup ? ` | ↺ ${dup} dups` : ''}${fail ? ` | ❌ ${fail} errores` : ''}`)

  // 6. Move list to campaign
  console.log('\n🔗 Asociando leads a la campaña...')
  try {
    const mv = await apiFetch('/leads/move', {
      method: 'POST',
      body: JSON.stringify({ list_id: list.id, to_campaign_id: campaign.id, copy_leads: true })
    })
    console.log('   ✅ Movidos (job:', mv.id || 'ok', ')')
  } catch (e) {
    console.error('   ⚠️  move falló:', e.message.slice(0, 100))
  }

  // 7. Activate
  if (!NO_ACTIVATE) {
    console.log('\n▶️  Activando campaña...')
    const activated = await apiFetch('/campaigns/' + campaign.id + '/activate', {
      method: 'POST', body: '{}'
    })
    console.log('   ✅ ACTIVA (status:', activated.status, ')')
  }

  // Summary
  console.log('\n' + '─'.repeat(55))
  console.log(`✅ "${CAMP_NAME}" configurada y lista`)
  console.log(`   Campaign ID  : ${campaign.id}`)
  console.log(`   List ID      : ${list.id}`)
  console.log(`   Leads        : ${ok} salas de conciertos`)
  console.log(`   High priority: ${highPriority.length} venues (1000+ aforo)`)
  console.log(`   Email desde  : ${SEND_EMAIL}`)
  console.log(`   Estado       : ${NO_ACTIVATE ? 'PAUSADA' : 'ACTIVA'}`)
  console.log('─'.repeat(55))

  return { campaign, list, ok, highPriority, leads }
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message)
  process.exit(1)
})
