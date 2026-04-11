/**
 * create_distribuidoras.mjs
 * Crea campaña "Distribuidoras - Artiverse" en Instantly.ai API v2
 * - Lead list "Distribuidoras 1"
 * - 3-step email sequence
 * - Sube 520 contactos desde contacts_distribuidoras.json
 * - Concurrencia de 5 con delay de 100ms entre lotes
 */

import { readFileSync } from 'fs'

// ── Config ─────────────────────────────────────────────────────────────────────
const API_KEY     = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const API_BASE    = 'https://api.instantly.ai/api/v2'
const SENDER      = 'victor@artiverse.online'
const CONTACTS_FILE = 'C:/Users/Usuario/Downloads/contacts_distribuidoras.json'
const CONCURRENCY = 5
const DELAY_MS    = 100

// ── Email Sequence ──────────────────────────────────────────────────────────────
const SEQUENCE = [
  {
    type: 'email',
    delay: 0,
    variants: [{
      subject: 'Todos los programadores de España, en un solo lugar.',
      body: `Hola,

Si distribuyes artistas en gira, la parte difícil no es encontrar el artista. Es saber con quién hablar en cada sala o festival de cada ciudad. Quién programa, qué géneros acepta, cuándo cierra su temporada.

Hemos creado Artiverse para resolver exactamente eso.

Una plataforma donde están todos los actores del sector escénico español: salas de conciertos, teatros, festivales, auditorios y centros culturales. Con perfil verificado y contacto directo dentro de la plataforma.

Si distribuyes artistas y quieres que tu cartera sea visible para todos ellos: → artiverse.es

Es gratuito para distribuidoras.

Víctor
Artiverse`
    }]
  },
  {
    type: 'email',
    delay: 5,
    variants: [{
      subject: 'Más de 130 compañías buscan distribuidora',
      body: `Hola,

Te escribí hace unos días. Por si no te llegó:

Artiverse es la primera plataforma del sector escénico español donde distribuidoras, salas y compañías se conectan directamente.

Más de 130 compañías ya tienen perfil. Cada semana entran más programadores buscando propuestas para su temporada.

Es gratuito. → artiverse.es

Víctor`
    }]
  },
  {
    type: 'email',
    delay: 4,
    variants: [{
      subject: 'Último mensaje — acceso abierto',
      body: `Hola,

Este es mi último contacto.

Las distribuidoras que ya están en Artiverse tienen visibilidad directa frente a salas, teatros y festivales de todo el país.

Si en algún momento te interesa: artiverse.es

Mucho ánimo con la temporada.

Víctor
Artiverse`
    }]
  }
]

// ── Helpers ─────────────────────────────────────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${API_BASE}${path}`, opts)
  const text = await res.text()

  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }

  if (!res.ok) {
    throw new Error(`[${res.status}] ${path} → ${text}`)
  }
  return json
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runBatch(items, fn, concurrency, delayMs) {
  let success = 0
  let failed = 0
  const errors = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const results = await Promise.allSettled(batch.map(fn))
    for (const r of results) {
      if (r.status === 'fulfilled') success++
      else {
        failed++
        errors.push(r.reason?.message || String(r.reason))
      }
    }
    if (i + concurrency < items.length) await sleep(delayMs)
    process.stdout.write(`\r  Progreso: ${Math.min(i + concurrency, items.length)}/${items.length} leads`)
  }
  console.log('') // newline
  return { success, failed, errors }
}

function parseEmail(raw) {
  if (!raw) return null
  // Si hay múltiples emails separados por \n, tomar el primero
  const first = raw.split('\n')[0].trim()
  return first || null
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Artiverse — Campaña Distribuidoras ===\n')

  // ── 1. Usar Lead List ya creada ────────────────────────────────────────────────
  // Lead list "Distribuidoras 1" ya fue creada en ejecución previa
  const listId = '8b43760b-04b9-4f66-97eb-854af4898f16'
  console.log(`1. Usando lead list "Distribuidoras 1" existente: ${listId}`)

  // ── 2. Crear Campaña ──────────────────────────────────────────────────────────
  console.log('\n2. Creando campaña "Distribuidoras - Artiverse"...')
  const campaignRes = await apiFetch('/campaigns', 'POST', {
    name: 'Distribuidoras - Artiverse',
    email_list: [SENDER],
    campaign_schedule: {
      schedules: [{
        name: 'Weekdays',
        timing: { from: '09:00', to: '18:00' },
        days: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
        timezone: 'Etc/GMT+12'
      }]
    },
    sequences: [{
      steps: SEQUENCE
    }]
  })
  const campaignId = campaignRes.id
  console.log(`   ✓ Campaña creada: ${campaignId}`)

  // ── 3. Leer contactos ─────────────────────────────────────────────────────────
  console.log('\n3. Leyendo contactos...')
  const raw = JSON.parse(readFileSync(CONTACTS_FILE, 'utf-8'))
  console.log(`   Total en archivo: ${raw.length}`)

  // Filtrar y parsear emails
  const contacts = []
  let skipped = 0
  for (const c of raw) {
    const email = parseEmail(c.email)
    if (!email || !email.includes('@')) { skipped++; continue }
    contacts.push({
      email,
      first_name: c.first_name && c.first_name !== '#ERROR!' ? c.first_name : '',
      last_name:  c.last_name  && c.last_name  !== '#ERROR!' ? c.last_name  : '',
      company_name: c.company_name && c.company_name !== '#ERROR!' ? c.company_name : '',
      phone: c.phone || '',
      city:  c.city  || ''
    })
  }
  console.log(`   Válidos: ${contacts.length} | Saltados (sin email): ${skipped}`)

  // ── 4. Subir leads ────────────────────────────────────────────────────────────
  console.log(`\n4. Subiendo leads (concurrencia: ${CONCURRENCY}, delay: ${DELAY_MS}ms)...`)

  const uploadLead = async (contact) => {
    return apiFetch('/leads', 'POST', {
      campaign_id: campaignId,
      list_id: listId,
      email: contact.email,
      first_name: contact.first_name,
      last_name: contact.last_name,
      company_name: contact.company_name,
      phone: contact.phone,
      city: contact.city
    })
  }

  const { success, failed, errors } = await runBatch(contacts, uploadLead, CONCURRENCY, DELAY_MS)

  // ── Reporte Final ─────────────────────────────────────────────────────────────
  console.log('\n=== REPORTE FINAL ===')
  console.log(`Campaign ID:            ${campaignId}`)
  console.log(`Lead List ID:           ${listId}`)
  console.log(`Leads subidos OK:       ${success}`)
  console.log(`Leads fallidos:         ${failed}`)
  if (errors.length > 0) {
    console.log(`\nPrimeros errores (max 5):`)
    errors.slice(0, 5).forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
  }
  console.log('\n✓ Script completado.')
}

main().catch(err => {
  console.error('\n[FATAL]', err.message)
  process.exit(1)
})
