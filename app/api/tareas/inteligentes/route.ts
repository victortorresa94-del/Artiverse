/**
 * GET /api/tareas/inteligentes
 *
 * Sugerencias automáticas basadas en el estado del CRM:
 *  - Conversaciones pendientes (me han escrito y no he contestado)
 *  - Nuevos registros del día (sync HubSpot, escribir bienvenida)
 *  - Bounces detectados (marcar email obsoleto)
 *
 * Cada sugerencia tiene un id estable para que se pueda detectar duplicados
 * con tareas ya creadas.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface SmartTask {
  id:        string         // estable, basado en email/tipo
  text:      string
  smartType: string
  metadata:  any
}

export async function GET(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const host  = req.headers.get('host') || ''
  const base  = `${proto}://${host}`

  const suggestions: SmartTask[] = []

  // 1. Conversaciones pendientes
  try {
    const r = await fetch(`${base}/api/conversaciones`, { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      const pendientes = (d.conversations || []).filter((c: any) => c.status === 'pendiente')
      for (const c of pendientes.slice(0, 10)) {
        suggestions.push({
          id:        `reply:${c.contact_email}`,
          text:      `Responder a ${c.contact_name || c.contact_email}${c.company ? ` (${c.company})` : ''}`,
          smartType: 'reply',
          metadata:  { email: c.contact_email, threadId: c.thread_id },
        })
      }
    }
  } catch {}

  // 2. Nuevos registros hoy
  try {
    const r = await fetch(`${base}/api/panel`, { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      const ultimos = d.registros?.ultimos || []
      const hoy = new Date(); hoy.setHours(0,0,0,0)
      for (const u of ultimos.slice(0, 5)) {
        if (new Date(u.createdAt).getTime() >= hoy.getTime()) {
          suggestions.push({
            id:        `welcome:${u.email}`,
            text:      `Validar bienvenida a ${u.name || u.email}`,
            smartType: 'welcome',
            metadata:  { email: u.email },
          })
        }
      }
    }
  } catch {}

  // 3. Mails erróneos detectados (bounces)
  try {
    const r = await fetch(`${base}/api/funnel`, { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      const bounces = d.outbound?.phases?.mail_erroneo || []
      for (const b of bounces.slice(0, 3)) {
        suggestions.push({
          id:        `bounce:${b.email}`,
          text:      `Marcar email obsoleto / buscar alt para ${b.name || b.company || b.email}`,
          smartType: 'bounce',
          metadata:  { email: b.email },
        })
      }
    }
  } catch {}

  return NextResponse.json({ suggestions })
}
