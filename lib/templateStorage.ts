/**
 * Template storage abstraction.
 * Usa Vercel KV si está configurado; si no, lee del archivo en MAILS/ (read-only).
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

export const TEMPLATES: Record<string, string> = {
  welcome: 'email-bienvenida-v2.html',
}

export async function loadTemplate(id: string): Promise<string> {
  // 1. Intentar KV
  if (KV_URL && KV_TOKEN) {
    try {
      const { kv } = await import('@vercel/kv')
      const stored = await kv.get<string>(`tpl:${id}`)
      if (stored) return stored
    } catch {
      // KV mal configurado → fallback
    }
  }
  // 2. Fallback al archivo
  const filename = TEMPLATES[id]
  if (!filename) throw new Error(`Template '${id}' no existe`)
  return readFileSync(join(process.cwd(), 'MAILS', filename), 'utf-8')
}

export async function saveTemplate(id: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!KV_URL || !KV_TOKEN) {
    return {
      ok: false,
      error: 'Vercel KV no configurado. En Vercel → Storage → Create Database → KV → Connect to project. Hecho eso, redespliega y vuelve a guardar.',
    }
  }
  try {
    const { kv } = await import('@vercel/kv')
    await kv.set(`tpl:${id}`, html)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function resetTemplate(id: string): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return
  try {
    const { kv } = await import('@vercel/kv')
    await kv.del(`tpl:${id}`)
  } catch {}
}
