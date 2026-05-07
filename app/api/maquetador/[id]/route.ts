/**
 * GET  /api/maquetador/[id] → HTML actual del template
 * POST /api/maquetador/[id] → Guarda HTML en KV. Body: { html }
 * DELETE → Restaura al default (borra de KV)
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadTemplate, saveTemplate, resetTemplate } from '@/lib/templateStorage'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const html = await loadTemplate(params.id)
    return NextResponse.json({ id: params.id, html })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { html } = await req.json()
  if (typeof html !== 'string' || !html.includes('<')) {
    return NextResponse.json({ error: 'HTML inválido' }, { status: 400 })
  }
  const result = await saveTemplate(params.id, html)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 })
  }
  return NextResponse.json({ ok: true, id: params.id })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await resetTemplate(params.id)
  return NextResponse.json({ ok: true, restored: true })
}
