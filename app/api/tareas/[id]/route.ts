import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KV_REST_URL   = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const KV_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
const REDIS_TCP_URL = process.env.REDIS_URL || process.env.KV_URL || ''

let _io: any = null
async function getR(): Promise<any> {
  if (KV_REST_URL && KV_REST_TOKEN) {
    const { Redis } = await import('@upstash/redis')
    const c = new Redis({ url: KV_REST_URL, token: KV_REST_TOKEN })
    return {
      get: (k: string) => c.get(k),
      set: (k: string, v: any) => c.set(k, typeof v === 'string' ? v : JSON.stringify(v)),
    }
  }
  if (REDIS_TCP_URL) {
    if (!_io) {
      const { default: I } = await import('ioredis')
      _io = new I(REDIS_TCP_URL, { lazyConnect: false, maxRetriesPerRequest: 2, enableReadyCheck: false })
    }
    return {
      async get(k: string) { const v = await _io.get(k); if (!v) return null; try { return JSON.parse(v) } catch { return v } },
      async set(k: string, v: any) { return _io.set(k, typeof v === 'string' ? v : JSON.stringify(v)) },
    }
  }
  return null
}

const KEY = 'tasks:list'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await getR()
  if (!r) return NextResponse.json({ error: 'Storage' }, { status: 503 })
  const patch = await req.json()
  const tasks: any[] = (await r.get(KEY)) || []
  const i = tasks.findIndex(t => t.id === params.id)
  if (i < 0) return NextResponse.json({ error: 'No existe' }, { status: 404 })
  const t = tasks[i]
  if (typeof patch.done === 'boolean') {
    t.done = patch.done
    t.completedAt = patch.done ? new Date().toISOString() : undefined
  }
  if (typeof patch.text === 'string') t.text = patch.text
  await r.set(KEY, tasks)
  return NextResponse.json({ ok: true, task: t })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await getR()
  if (!r) return NextResponse.json({ ok: true })
  const tasks: any[] = (await r.get(KEY)) || []
  await r.set(KEY, tasks.filter(t => t.id !== params.id))
  return NextResponse.json({ ok: true })
}
