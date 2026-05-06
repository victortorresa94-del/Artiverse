/**
 * Persistencia de chat por draft mail. Storage Redis.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KV_REST_URL   = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const KV_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
const REDIS_TCP_URL = process.env.REDIS_URL || process.env.KV_URL || ''

let _ioRedis: any = null
async function getR(): Promise<any> {
  if (KV_REST_URL && KV_REST_TOKEN) {
    const { Redis } = await import('@upstash/redis')
    const c = new Redis({ url: KV_REST_URL, token: KV_REST_TOKEN })
    return {
      get: (k: string) => c.get(k),
      set: (k: string, v: any) => c.set(k, typeof v === 'string' ? v : JSON.stringify(v)),
      del: (k: string) => c.del(k),
    }
  }
  if (REDIS_TCP_URL) {
    if (!_ioRedis) {
      const { default: I } = await import('ioredis')
      _ioRedis = new I(REDIS_TCP_URL, { lazyConnect: false, maxRetriesPerRequest: 2, enableReadyCheck: false })
    }
    return {
      async get(k: string) { const v = await _ioRedis.get(k); if (!v) return null; try { return JSON.parse(v) } catch { return v } },
      async set(k: string, v: any) { return _ioRedis.set(k, typeof v === 'string' ? v : JSON.stringify(v)) },
      async del(k: string) { return _ioRedis.del(k) },
    }
  }
  return null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await getR()
  if (!r) return NextResponse.json({ messages: [] })
  const m = await r.get(`mail:${params.id}:chat`)
  return NextResponse.json({ messages: Array.isArray(m) ? m : [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await getR()
  if (!r) return NextResponse.json({ error: 'Storage no configurado' }, { status: 503 })
  const { messages } = await req.json()
  if (!Array.isArray(messages)) return NextResponse.json({ error: 'messages array requerido' }, { status: 400 })
  await r.set(`mail:${params.id}:chat`, messages.slice(-50))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await getR()
  if (r) await r.del(`mail:${params.id}:chat`)
  return NextResponse.json({ ok: true })
}
