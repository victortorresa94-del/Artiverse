/**
 * GET /api/welcome/raw
 *
 * Devuelve el HTML del welcome como text/plain (para copiar/pegar en HubSpot).
 * Reemplaza placeholders por tokens HubSpot ({{ contact.firstname }} etc.)
 */
import { NextResponse } from 'next/server'
import { loadTemplate } from '@/lib/templateStorage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const raw = await loadTemplate('welcome')
    const html = raw
      .replace(/\{\{firstName\}\}/g, '{{ contact.firstname | default:"artista" }}')
      .replace(/\{\{email\}\}/g,     '{{ contact.email }}')
      .replace(/\{\{unsubscribe_url\}\}/g, '{{ unsubscribe_link }}')

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'inline; filename="welcome.html"',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
