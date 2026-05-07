/**
 * GET /api/newsletters/[id]/sent
 * POST /api/newsletters/[id]/sent  → backfill manual { records: [{email, name?, sentAt?, messageId?}] }
 *
 * Devuelve la lista de envíos de una newsletter con stats de aperturas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getNewsletterSent, logNewsletterSent } from '@/lib/newsletterSent'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const records = await getNewsletterSent(params.id)
  const opened   = records.filter(r => r.openCount > 0).length
  const total    = records.length
  const openRate = total > 0 ? Math.round(opened / total * 1000) / 10 : 0
  return NextResponse.json({
    records: records.sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    stats: { total, opened, openRate, notOpened: total - opened },
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { records } = await req.json()
  if (!Array.isArray(records)) return NextResponse.json({ error: 'records array requerido' }, { status: 400 })
  for (const r of records) {
    if (!r.email) continue
    await logNewsletterSent(params.id, {
      email:     r.email,
      name:      r.name,
      sentAt:    r.sentAt || new Date().toISOString(),
      messageId: r.messageId,
    })
  }
  return NextResponse.json({ ok: true, added: records.length })
}
