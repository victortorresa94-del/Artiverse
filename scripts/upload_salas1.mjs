/**
 * upload_salas1.mjs — Sube los 59 leads de Salas 1 a Instantly v2
 * Lead list ID : d66e3e25-6aeb-45aa-9538-7d982a9037ce
 * Campaña      : Salas 1 (93040742-10ba-4e56-849a-df1832e95a4e)
 *
 * Uso: node scripts/upload_salas1.mjs
 */

import { readFileSync } from 'fs'

const API_KEY  = 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const LIST_ID  = 'd66e3e25-6aeb-45aa-9538-7d982a9037ce'
const CSV_PATH = 'C:/Users/Usuario/Downloads/Salas 1 - 59 - Hoja 1.csv'
const CONCURRENCY = 2   // requests en paralelo (más seguro)
const DELAY_MS    = 500 // delay entre batches
const MAX_RETRIES = 3   // reintentos por lead

// ── CSV parser robusto (soporta newlines en quoted fields) ────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function toProper(s) {
  // Title case respetando acentos y chars especiales
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

// ── Single lead upload with retry ────────────────────────────────────────────
async function uploadLead(lead, attempt = 1) {
  const body = {
    list_id:      LIST_ID,
    email:        lead.email,
    first_name:   lead.first_name,
    last_name:    lead.last_name,
    company_name: lead.company_name,
    phone:        lead.phone,
    website:      lead.website,
    personalization: lead.personalization,
  }

  try {
    const res = await fetch('https://api.instantly.ai/api/v2/leads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`)
    return data
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 600 * attempt)) // backoff
      return uploadLead(lead, attempt + 1)
    }
    throw err
  }
}

// ── Parallel batch runner ─────────────────────────────────────────────────────
async function runBatches(leads) {
  let ok = 0, fail = 0, dup = 0

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const chunk = leads.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(l => uploadLead(l)))

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
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  return { ok, fail, dup }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const raw = readFileSync(CSV_PATH, 'utf-8')
  const rows = parseCSV(raw)

  // row[0] = meta header, row[1] = column headers, row[2+] = data
  const headers = rows[1]
  const dataRows = rows.slice(2)

  console.log(`\n📂 CSV: ${dataRows.length} filas`)

  const leads = [], skipped = []

  for (const row of dataRows) {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (row[i] || '').replace(/\s+/g, ' ').trim() })

    const email = firstEmail(obj.email || '')
    if (!email) { skipped.push(obj.companyName || '?'); continue }

    leads.push({
      email,
      first_name:   toProper(obj.firstName),
      last_name:    toProper(obj.lastName),
      company_name: obj.companyName || '',
      phone:        cleanPhone(obj.phone),
      website:      cleanWebsite(obj.website),
      personalization: '',
      variables: {
        city:      toProper(obj.city),
        region:    obj.region    || '',
        province:  obj.province  || '',
        actividad: obj['ACTIVIDAD PRINCIPAL'] || '',
        segment:   'Salas Conciertos',
      }
    })
  }

  console.log(`✅ ${leads.length} válidos | ⚠️  ${skipped.length} sin email`)
  if (skipped.length) console.log('   Omitidos:', skipped.join(', '))

  console.log('\n📋 Preview (3 primeros):')
  leads.slice(0, 3).forEach(l =>
    console.log(`   ${l.first_name} ${l.last_name} | ${l.company_name} | ${l.email}`)
  )

  console.log(`\n🚀 Subiendo a Instantly → Salas 1 (${CONCURRENCY} en paralelo)`)
  console.log('   [. = ok | D = duplicado | E = error]\n   ', )

  const { ok, fail, dup } = await runBatches(leads)

  console.log(`\n\n🎯 Resultado:`)
  console.log(`   ✅ ${ok} creados`)
  if (dup)  console.log(`   ↺  ${dup} duplicados (ya existían)`)
  if (fail) console.log(`   ❌ ${fail} errores`)
  console.log(`\n   → Instantly → Lead Lists → "Salas 1" para verificar`)
}

main().catch(console.error)
