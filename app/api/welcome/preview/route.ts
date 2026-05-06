/**
 * GET /api/welcome/preview?firstName=Victor
 *
 * Devuelve el HTML del email de bienvenida con placeholders sustituidos.
 * Útil para preview en navegador antes de enviar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadTemplate } from '@/lib/templateStorage'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const firstName = searchParams.get('firstName') || 'Víctor'
  const email     = searchParams.get('email')     || 'tu@email.com'

  try {
    const raw = await loadTemplate('welcome')
    const html = raw
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{email\}\}/g,     email)

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
