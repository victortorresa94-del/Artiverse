/**
 * GET    /api/tareas         → lista
 * POST   /api/tareas         → añadir tarea. Body: { text, smartType?, metadata? }
 * PATCH  /api/tareas/[id]    → toggle done o editar text
 * DELETE /api/tareas/[id]    → borrar
 */
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

export interface Task {
  id:           string
  text:         string
  done:         boolean
  createdAt:    string
  completedAt?: string
  smartType?:   string
  metadata?:    any
}

const KEY = 'tasks:list'

export async function GET() {
  const r = await getR()
  if (!r) return NextResponse.json({ tasks: [] })
  const tasks: Task[] = (await r.get(KEY)) || []
  // Pendientes primero, hechas al final ordenadas por completedAt desc
  const pendientes = tasks.filter(t => !t.done).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const hechas     = tasks.filter(t => t.done).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
  return NextResponse.json({ tasks: [...pendientes, ...hechas] })
}

export async function POST(req: NextRequest) {
  const r = await getR()
  if (!r) return NextResponse.json({ error: 'Storage no configurado' }, { status: 503 })
  const { text, smartType, metadata } = await req.json()
  if (!text || typeof text !== 'string') return NextResponse.json({ error: 'text requerido' }, { status: 400 })

  const tasks: Task[] = (await r.get(KEY)) || []
  const task: Task = {
    id:        Math.random().toString(36).slice(2, 10),
    text:      text.trim(),
    done:      false,
    createdAt: new Date().toISOString(),
    smartType,
    metadata,
  }
  tasks.unshift(task)
  await r.set(KEY, tasks)
  return NextResponse.json({ ok: true, task })
}
