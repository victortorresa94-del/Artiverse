/**
 * Mail (draft) storage — separado de Templates (builtin, read-only).
 *
 * Estructura en Redis:
 *   mail:<id>          → HTML del mail
 *   mail:<id>:meta     → MailMeta (JSON)
 *   mail:_index        → MailMeta[] (lista para UI)
 *   newsletter:<id>:mail → mailId vinculado (puntero)
 */
import { loadTemplate as loadTemplateRaw } from './templateStorage'

const KV_REST_URL   = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const KV_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
const REDIS_TCP_URL = process.env.REDIS_URL || process.env.KV_URL || ''

let _ioRedis: any = null
async function getRedis(): Promise<any> {
  if (KV_REST_URL && KV_REST_TOKEN) {
    const { Redis } = await import('@upstash/redis')
    const c = new Redis({ url: KV_REST_URL, token: KV_REST_TOKEN })
    return {
      async get(k: string) { return c.get(k) },
      async set(k: string, v: any) { return c.set(k, typeof v === 'string' ? v : JSON.stringify(v)) },
      async del(k: string) { return c.del(k) },
    }
  }
  if (REDIS_TCP_URL) {
    if (!_ioRedis) {
      const { default: IORedis } = await import('ioredis')
      _ioRedis = new IORedis(REDIS_TCP_URL, { lazyConnect: false, maxRetriesPerRequest: 2, enableReadyCheck: false })
    }
    return {
      async get(k: string) {
        const v = await _ioRedis.get(k)
        if (v == null) return null
        try { return JSON.parse(v) } catch { return v }
      },
      async set(k: string, v: any) { return _ioRedis.set(k, typeof v === 'string' ? v : JSON.stringify(v)) },
      async del(k: string) { return _ioRedis.del(k) },
    }
  }
  return null
}

export interface MailMeta {
  id:              string
  name:            string
  description?:    string
  basedOnTemplate?: string  // 'welcome', 'digest', etc.
  newsletterId?:   string   // 'bienvenida', 'licitaciones', etc.
  createdAt:       string
  updatedAt:       string
  size?:           number
}

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function listMails(): Promise<MailMeta[]> {
  const r = await getRedis()
  if (!r) return []
  const idx = await r.get('mail:_index')
  return Array.isArray(idx) ? idx.sort((a:any, b:any) => b.updatedAt.localeCompare(a.updatedAt)) : []
}

// ── Get ──────────────────────────────────────────────────────────────────────

export async function getMail(id: string): Promise<{ meta: MailMeta; html: string } | null> {
  const r = await getRedis()
  if (!r) return null
  const html = await r.get(`mail:${id}`)
  const meta = await r.get(`mail:${id}:meta`)
  if (!html || !meta) return null
  return { meta, html: typeof html === 'string' ? html : JSON.stringify(html) }
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createMail(opts: {
  name: string
  description?: string
  basedOnTemplate?: string
  newsletterId?: string
  html?: string
}): Promise<MailMeta> {
  const r = await getRedis()
  if (!r) throw new Error('Storage no configurado')

  // HTML: del template si se especifica, o vacío
  let html = opts.html || ''
  if (!html && opts.basedOnTemplate) {
    html = await loadTemplateRaw(opts.basedOnTemplate)
  }
  if (!html) {
    html = '<!DOCTYPE html><html><body><h1>Nuevo mail</h1><p>Edita este contenido.</p></body></html>'
  }

  const id = `${slugify(opts.name)}_${Date.now().toString(36)}`
  const now = new Date().toISOString()
  const meta: MailMeta = {
    id,
    name:        opts.name,
    description: opts.description,
    basedOnTemplate: opts.basedOnTemplate,
    newsletterId: opts.newsletterId,
    createdAt:   now,
    updatedAt:   now,
    size:        html.length,
  }

  await r.set(`mail:${id}`, html)
  await r.set(`mail:${id}:meta`, meta)

  // Update index
  const index: MailMeta[] = (await r.get('mail:_index')) || []
  index.push(meta)
  await r.set('mail:_index', index)

  // Si vincula newsletter → setear puntero
  if (opts.newsletterId) {
    await r.set(`newsletter:${opts.newsletterId}:mail`, id)
  }

  return meta
}

// ── Save (update HTML) ───────────────────────────────────────────────────────

export async function saveMail(id: string, html: string): Promise<MailMeta> {
  const r = await getRedis()
  if (!r) throw new Error('Storage no configurado')
  const meta: MailMeta | null = await r.get(`mail:${id}:meta`)
  if (!meta) throw new Error(`Mail '${id}' no existe`)

  await r.set(`mail:${id}`, html)
  meta.updatedAt = new Date().toISOString()
  meta.size      = html.length
  await r.set(`mail:${id}:meta`, meta)

  // Update index
  const index: MailMeta[] = (await r.get('mail:_index')) || []
  const i = index.findIndex(m => m.id === id)
  if (i >= 0) { index[i] = meta; await r.set('mail:_index', index) }

  return meta
}

// ── Update meta (name, description, link) ────────────────────────────────────

export async function updateMailMeta(id: string, patch: Partial<MailMeta>): Promise<MailMeta> {
  const r = await getRedis()
  if (!r) throw new Error('Storage no configurado')
  const meta: MailMeta | null = await r.get(`mail:${id}:meta`)
  if (!meta) throw new Error(`Mail '${id}' no existe`)

  // Si cambia newsletter vinculada
  if (patch.newsletterId !== undefined && patch.newsletterId !== meta.newsletterId) {
    if (meta.newsletterId) await r.del(`newsletter:${meta.newsletterId}:mail`)
    if (patch.newsletterId) await r.set(`newsletter:${patch.newsletterId}:mail`, id)
  }

  Object.assign(meta, patch, { updatedAt: new Date().toISOString() })
  await r.set(`mail:${id}:meta`, meta)

  const index: MailMeta[] = (await r.get('mail:_index')) || []
  const i = index.findIndex(m => m.id === id)
  if (i >= 0) { index[i] = meta; await r.set('mail:_index', index) }

  return meta
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMail(id: string): Promise<void> {
  const r = await getRedis()
  if (!r) return
  const meta: MailMeta | null = await r.get(`mail:${id}:meta`)
  if (meta?.newsletterId) await r.del(`newsletter:${meta.newsletterId}:mail`)
  await r.del(`mail:${id}`)
  await r.del(`mail:${id}:meta`)
  await r.del(`mail:${id}:chat`)
  const index: MailMeta[] = (await r.get('mail:_index')) || []
  await r.set('mail:_index', index.filter(m => m.id !== id))
}

// ── Newsletter → Mail link ───────────────────────────────────────────────────

export async function getMailForNewsletter(newsletterId: string): Promise<string | null> {
  const r = await getRedis()
  if (!r) return null
  return await r.get(`newsletter:${newsletterId}:mail`)
}

export async function loadMailForNewsletter(newsletterId: string): Promise<string | null> {
  const mailId = await getMailForNewsletter(newsletterId)
  if (!mailId) return null
  const m = await getMail(mailId)
  return m?.html || null
}
