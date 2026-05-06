/**
 * GET /api/track/open?nl=bienvenida&email=X
 *
 * Devuelve un pixel transparente 1x1 GIF y registra la apertura.
 */
import { NextRequest } from 'next/server'
import { trackOpen } from '@/lib/newsletterSent'

export const dynamic = 'force-dynamic'

// 1x1 transparent GIF
const GIF_BYTES = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const nl    = searchParams.get('nl')    || ''
  const email = searchParams.get('email') || ''

  // Track (no bloquear si falla)
  if (nl && email) {
    try { await trackOpen(nl, email) } catch {}
  }

  return new Response(GIF_BYTES, {
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':        'no-cache',
      'Expires':       '0',
    },
  })
}
