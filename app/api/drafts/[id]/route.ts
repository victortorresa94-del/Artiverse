/**
 * GET    /api/drafts/[id]  → { meta, html }
 * PUT    /api/drafts/[id]  → guarda HTML. Body: { html }
 * PATCH  /api/drafts/[id]  → actualiza meta (name, description, newsletterId)
 * DELETE /api/drafts/[id]
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMail, saveMail, updateMailMeta, deleteMail } from '@/lib/mailStorage'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const m = await getMail(params.id)
  if (!m) return NextResponse.json({ error: 'No existe' }, { status: 404 })
  return NextResponse.json(m)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { html } = await req.json()
  if (typeof html !== 'string' || !html.includes('<')) {
    return NextResponse.json({ error: 'HTML inválido' }, { status: 400 })
  }
  try {
    const meta = await saveMail(params.id, html)
    return NextResponse.json({ ok: true, meta })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = await req.json()
  try {
    const meta = await updateMailMeta(params.id, patch)
    return NextResponse.json({ ok: true, meta })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteMail(params.id)
  return NextResponse.json({ ok: true })
}
