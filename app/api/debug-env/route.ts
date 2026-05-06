/**
 * GET /api/debug-env
 * Lista qué env vars de storage están presentes (sin revelar valores).
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KEYS = [
  'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'KV_URL',
  'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
  'BLOB_READ_WRITE_TOKEN',
  'POSTGRES_URL', 'DATABASE_URL',
  'REDIS_URL',
]

export async function GET() {
  const present: Record<string, boolean | string> = {}
  for (const k of KEYS) {
    const v = process.env[k]
    present[k] = v ? `set (${v.length} chars)` : false
  }
  // También todas las que empiecen por KV_, UPSTASH_, BLOB_
  const allMatching = Object.keys(process.env).filter(k =>
    /^(KV_|UPSTASH_|BLOB_|REDIS_|POSTGRES_)/i.test(k)
  )
  return NextResponse.json({
    expected: present,
    allStorageVars: allMatching,
  })
}
