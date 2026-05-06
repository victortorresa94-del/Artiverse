/**
 * Template storage abstraction.
 * Usa Vercel KV si está configurado; si no, lee del archivo en MAILS/ (read-only).
 *
 * Multi-template:
 *   - Templates predefinidos (en MAILS/) se acceden por id si están en TEMPLATES
 *   - Templates custom se guardan en KV con key `tpl:<id>`
 *   - Index de templates: KV key `tpl:_index` (array de TemplateMeta)
 */
import { readFileSync } from 'fs'
import { join } from 'path'

// Soporta múltiples backends:
// - Vercel KV REST (KV_REST_API_URL/TOKEN)
// - Upstash REST (UPSTASH_REDIS_REST_URL/TOKEN)
// - Redis TCP (REDIS_URL) — Vercel Redis nuevo o cualquier Redis estándar
const KV_REST_URL   = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const KV_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
const REDIS_TCP_URL = process.env.REDIS_URL || process.env.KV_URL || ''

const HAS_STORAGE = !!(KV_REST_URL && KV_REST_TOKEN) || !!REDIS_TCP_URL

// Templates predefinidos en el repo
export const TEMPLATES: Record<string, string> = {
  welcome: 'email-bienvenida-v2.html',
}

export interface TemplateMeta {
  id:          string
  name:        string
  description?: string
  createdAt:   string
  updatedAt:   string
  builtin?:    boolean  // true si viene del repo
}

const BUILTIN_META: TemplateMeta[] = [
  {
    id: 'welcome',
    name: 'Bienvenida Artiverse',
    description: 'Email automático para nuevos usuarios registrados',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-06T00:00:00Z',
    builtin: true,
  },
]

// Wrapper unificado de Redis. Devuelve null si no hay backend disponible.
let _ioRedis: any = null
async function getRedis(): Promise<{
  get<T = any>(key: string): Promise<T | null>
  set(key: string, value: any): Promise<any>
  del(key: string): Promise<any>
} | null> {
  if (!HAS_STORAGE) return null

  // Preferir REST (más rápido en serverless, sin cold-start)
  if (KV_REST_URL && KV_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis')
      const redis = new Redis({ url: KV_REST_URL, token: KV_REST_TOKEN })
      return {
        async get(k) { return await redis.get(k) as any },
        async set(k, v) {
          // upstash espera string para valores no-JSON, pero acepta objetos también
          return await redis.set(k, typeof v === 'string' ? v : JSON.stringify(v))
        },
        async del(k) { return await redis.del(k) },
      }
    } catch {}
  }

  // Fallback: TCP via ioredis
  if (REDIS_TCP_URL) {
    try {
      if (!_ioRedis) {
        const { default: IORedis } = await import('ioredis')
        _ioRedis = new IORedis(REDIS_TCP_URL, {
          lazyConnect: false,
          maxRetriesPerRequest: 2,
          enableReadyCheck: false,
        })
      }
      return {
        async get<T>(k: string) {
          const v = await _ioRedis.get(k)
          if (v == null) return null
          try { return JSON.parse(v) as T } catch { return v as any }
        },
        async set(k: string, v: any) {
          const str = typeof v === 'string' ? v : JSON.stringify(v)
          return await _ioRedis.set(k, str)
        },
        async del(k: string) { return await _ioRedis.del(k) },
      }
    } catch {}
  }

  return null
}

// Mantenemos el nombre antiguo para compatibilidad
const getKv = getRedis

export async function listTemplates(): Promise<TemplateMeta[]> {
  const kv = await getKv()
  if (!kv) return BUILTIN_META
  try {
    const stored = await kv.get<TemplateMeta[]>('tpl:_index') || []
    // Merge builtin con custom (custom puede sobrescribir si tiene mismo id)
    const customIds = new Set(stored.map(t => t.id))
    const builtins  = BUILTIN_META.filter(b => !customIds.has(b.id))
    return [...builtins, ...stored].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return BUILTIN_META
  }
}

export async function createTemplate(meta: { name: string; description?: string; html: string }): Promise<TemplateMeta> {
  const kv = await getKv()
  if (!kv) throw new Error('Vercel KV no configurado para guardar templates nuevos')

  const id = meta.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) + '_' + Date.now().toString(36)
  const now = new Date().toISOString()
  const newMeta: TemplateMeta = {
    id,
    name: meta.name,
    description: meta.description,
    createdAt: now,
    updatedAt: now,
  }
  await kv.set(`tpl:${id}`, meta.html)
  const index = (await kv.get<TemplateMeta[]>('tpl:_index')) || []
  index.push(newMeta)
  await kv.set('tpl:_index', index)
  return newMeta
}

export async function loadTemplate(id: string): Promise<string> {
  // 1. Intentar KV
  const kv = await getKv()
  if (kv) {
    const stored = await kv.get<string>(`tpl:${id}`)
    if (stored) return stored
  }
  // 2. Fallback al archivo (solo builtins)
  const filename = TEMPLATES[id]
  if (!filename) throw new Error(`Template '${id}' no existe`)
  return readFileSync(join(process.cwd(), 'MAILS', filename), 'utf-8')
}

export async function saveTemplate(id: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const kv = await getKv()
  if (!kv) {
    return {
      ok: false,
      error: 'Vercel KV no configurado. En Vercel → Storage → Create Database → KV → Connect to project. Hecho eso, redespliega y vuelve a guardar.',
    }
  }
  try {
    await kv.set(`tpl:${id}`, html)
    // Actualizar updatedAt en index si existe
    const index = await kv.get<TemplateMeta[]>('tpl:_index') || []
    const i = index.findIndex(t => t.id === id)
    if (i >= 0) {
      index[i].updatedAt = new Date().toISOString()
      await kv.set('tpl:_index', index)
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function resetTemplate(id: string): Promise<void> {
  const kv = await getKv()
  if (!kv) return
  await kv.del(`tpl:${id}`)
  // Si era custom, también quitarlo del index
  const index = await kv.get<TemplateMeta[]>('tpl:_index') || []
  const filtered = index.filter(t => t.id !== id)
  if (filtered.length !== index.length) await kv.set('tpl:_index', filtered)
}

export async function deleteTemplate(id: string): Promise<{ ok: boolean; error?: string }> {
  if (TEMPLATES[id]) {
    return { ok: false, error: 'No se puede borrar un template builtin. Usa "Restaurar" para limpiar overrides.' }
  }
  const kv = await getKv()
  if (!kv) return { ok: false, error: 'KV no configurado' }
  await kv.del(`tpl:${id}`)
  const index = await kv.get<TemplateMeta[]>('tpl:_index') || []
  await kv.set('tpl:_index', index.filter(t => t.id !== id))
  return { ok: true }
}
