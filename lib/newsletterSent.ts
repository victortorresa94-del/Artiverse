/**
 * Storage de envíos por newsletter (Redis).
 *
 * Estructura:
 *   newsletter:<id>:sent  → Array<SentRecord>
 *
 * Limita a últimos 1000 records por newsletter para no saturar.
 */

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

export interface SentRecord {
  email:      string
  name?:      string
  sentAt:     string
  messageId?: string
  openedAt?:  string
  openCount:  number
  bounced?:   boolean
}

export async function logNewsletterSent(newsletterId: string, rec: Omit<SentRecord, 'openCount'> & { openCount?: number }): Promise<void> {
  const r = await getR()
  if (!r) return
  const key = `newsletter:${newsletterId}:sent`
  const list: SentRecord[] = (await r.get(key)) || []

  // Si el email ya existe, actualizar; si no, append
  const i = list.findIndex(x => x.email.toLowerCase() === rec.email.toLowerCase())
  const record: SentRecord = {
    email:     rec.email,
    name:      rec.name,
    sentAt:    rec.sentAt,
    messageId: rec.messageId,
    openCount: rec.openCount ?? 0,
  }
  if (i >= 0) {
    // Mantener opens previos si los hay
    record.openCount = list[i].openCount
    record.openedAt  = list[i].openedAt
    list[i] = record
  } else {
    list.unshift(record)
  }

  // Limitar a últimos 1000
  await r.set(key, list.slice(0, 1000))
}

export async function getNewsletterSent(newsletterId: string): Promise<SentRecord[]> {
  const r = await getR()
  if (!r) return []
  const list: SentRecord[] = (await r.get(`newsletter:${newsletterId}:sent`)) || []
  return list
}

export async function trackOpen(newsletterId: string, email: string): Promise<void> {
  const r = await getR()
  if (!r) return
  const key = `newsletter:${newsletterId}:sent`
  const list: SentRecord[] = (await r.get(key)) || []
  const i = list.findIndex(x => x.email.toLowerCase() === email.toLowerCase())
  if (i < 0) return
  if (!list[i].openedAt) list[i].openedAt = new Date().toISOString()
  list[i].openCount = (list[i].openCount || 0) + 1
  await r.set(key, list)
}
