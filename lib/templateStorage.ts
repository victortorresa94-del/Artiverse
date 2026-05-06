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

const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

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

async function getKv() {
  if (!KV_URL || !KV_TOKEN) return null
  try {
    const { kv } = await import('@vercel/kv')
    return kv
  } catch {
    return null
  }
}

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
