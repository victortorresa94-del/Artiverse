/**
 * POST /api/files/delete  — body { url } borra el blob
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

export async function POST(req: NextRequest) {
  if (!BLOB_TOKEN) return NextResponse.json({ error: 'BLOB no configurado' }, { status: 503 })
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url requerida' }, { status: 400 })
  try {
    const { del } = await import('@vercel/blob')
    await del(url, { token: BLOB_TOKEN })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
