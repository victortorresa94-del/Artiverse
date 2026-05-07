/**
 * GET    /api/maquetador/[id]/chat  → historial de mensajes
 * POST   /api/maquetador/[id]/chat  → guarda historial completo. Body: { messages }
 * DELETE /api/maquetador/[id]/chat  → borra el historial
 *
 * Almacenado en Redis con key `chat:<id>`. Limitado a últimos 50 mensajes.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KV_REST_URL   = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const KV_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
const REDIS_TCP_URL = process.env.REDIS_URL || process.env.KV_URL || ''

let _ioRedis: any = null
async function getRedis(): Promise<any> {
  if (KV_REST_URL && KV_REST_TOKEN) {
    const { Redis } = await import('@upstash/redis')
    return {
      kind: 'rest',
      get: (k: string) => new Redis({ url: KV_REST_URL, token: KV_REST_TOKEN }).get(k),
      set: (k: string, v: any) => new Redis({ url: KV_REST_URL, token: KV_REST_TOKEN }).set(k, typeof v === 'string' ? v : JSON.stringify(v)),
      del: (k: string) => new Redis({ url: KV_REST_URL, token: KV_REST_TOKEN }).del(k),
    }
  }
  if (REDIS_TCP_URL) {
    if (!_ioRedis) {
      const { default: IORedis } = await import('ioredis')
      _ioRedis = new IORedis(REDIS_TCP_URL, { lazyConnect: false, maxRetriesPerRequest: 2, enableReadyCheck: false })
    }
    return {
      kind: 'tcp',
      async get(k: string) { const v = await _ioRedis.get(k); if (!v) return null; try { return JSON.parse(v) } catch { return v } },
      async set(k: string, v: any) { return _ioRedis.set(k, typeof v === 'string' ? v : JSON.stringify(v)) },
      async del(k: string) { return _ioRedis.del(k) },
    }
  }
  return null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await getRedis()
  if (!r) return NextResponse.json({ messages: [] })
  try {
    const msgs = await r.get(`chat:${params.id}`)
    return NextResponse.json({ messages: Array.isArray(msgs) ? msgs : [] })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await getRedis()
  if (!r) return NextResponse.json({ error: 'Storage no configurado' }, { status: 503 })
  const { messages } = await req.json()
  if (!Array.isArray(messages)) return NextResponse.json({ error: 'messages debe ser array' }, { status: 400 })
  // Limitar a últimos 50 para no saturar Redis
  const truncated = messages.slice(-50)
  await r.set(`chat:${params.id}`, truncated)
  return NextResponse.json({ ok: true, count: truncated.length })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await getRedis()
  if (r) await r.del(`chat:${params.id}`)
  return NextResponse.json({ ok: true })
}
