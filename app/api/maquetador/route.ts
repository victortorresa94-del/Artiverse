/**
 * GET  /api/maquetador        → lista de templates (builtin + custom)
 * POST /api/maquetador        → crea template nuevo. Body: { name, description?, html }
 */
import { NextRequest, NextResponse } from 'next/server'
import { listTemplates, createTemplate } from '@/lib/templateStorage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const templates = await listTemplates()
    return NextResponse.json({ templates })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { name, description, html } = await req.json()
  if (!name || !html) {
    return NextResponse.json({ error: 'name y html requeridos' }, { status: 400 })
  }
  if (typeof html !== 'string' || !html.includes('<')) {
    return NextResponse.json({ error: 'HTML inválido' }, { status: 400 })
  }
  try {
    const meta = await createTemplate({ name, description, html })
    return NextResponse.json({ ok: true, template: meta })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 })
  }
}
