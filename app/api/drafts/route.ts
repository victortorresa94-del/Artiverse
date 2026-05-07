/**
 * GET  /api/drafts  → lista de mails editables
 * POST /api/drafts  → crear mail. Body: { name, description?, basedOnTemplate?, newsletterId?, html? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { listMails, createMail } from '@/lib/mailStorage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ mails: await listMails() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name requerido' }, { status: 400 })
  }
  try {
    const meta = await createMail(body)
    return NextResponse.json({ ok: true, mail: meta })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 })
  }
}
