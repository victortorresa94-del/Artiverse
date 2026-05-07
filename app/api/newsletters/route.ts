/**
 * GET /api/newsletters
 *
 * Devuelve todas las campañas de newsletter configuradas (locales en data/),
 * con su estado, última ejecución y nº de destinatarios.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export interface Newsletter {
  id:           string
  name:         string
  description:  string
  status:       'active' | 'ready' | 'draft'
  audience:     string
  template:     string
  triggerType:  'auto' | 'manual' | 'scheduled'
  triggerDesc:  string
  lastRun?:     string
  nextRun?:     string
  recipients?:  number
}

const NEWSLETTERS: Newsletter[] = [
  {
    id:           'bienvenida',
    name:         'Bienvenida nuevos usuarios',
    description:  'Email automático para usuarios que se registran en artiverse.es. Incluye 3 pasos para completar perfil y CTA al registro.',
    status:       'ready',
    audience:     'Nuevos registros (últimas 70 min)',
    template:     'email-bienvenida-v3.html',
    triggerType:  'scheduled',
    triggerDesc:  'Cron diario 08:00 (Vercel) — configurar a hourly cuando se active',
  },
  {
    id:           'licitaciones',
    name:         'Licitaciones de la semana',
    description:  'Resumen semanal de licitaciones públicas centralizadas. Para compañías y artistas.',
    status:       'draft',
    audience:     'Compañías + Artistas registrados',
    template:     '— pendiente diseño',
    triggerType:  'scheduled',
    triggerDesc:  'Lunes 09:00 (semanal)',
  },
  {
    id:           'talento_mes',
    name:         'Talento del mes',
    description:  'Selección curada de los mejores perfiles del mes. Para programadores.',
    status:       'draft',
    audience:     'Programadores + Salas',
    template:     '— pendiente diseño',
    triggerType:  'scheduled',
    triggerDesc:  'Primer lunes del mes',
  },
  {
    id:           'insights',
    name:         'Insights del sector',
    description:  'Datos y tendencias del mercado escénico español. Posicionamiento de marca.',
    status:       'draft',
    audience:     'Toda la base',
    template:     '— pendiente diseño',
    triggerType:  'scheduled',
    triggerDesc:  'Quincenal',
  },
  {
    id:           'convocatorias',
    name:         'Convocatorias y festivales',
    description:  'Avisos de convocatorias abiertas para participar en festivales.',
    status:       'draft',
    audience:     'Compañías + Artistas',
    template:     '— pendiente diseño',
    triggerType:  'manual',
    triggerDesc:  'Bajo demanda según convocatorias activas',
  },
]

export async function GET() {
  // Intentar enriquecer con audiencia real (Artiverse users) para "bienvenida"
  let usersTotal = 0
  try {
    if (process.env.ARTIVERSE_API_KEY) {
      const res = await fetch('https://api.artiverse.es/admin/marketing/users?limit=1', {
        headers: { 'x-api-key': process.env.ARTIVERSE_API_KEY }, next: { revalidate: 0 },
      })
      if (res.ok) {
        const d = await res.json()
        usersTotal = d.total || d.totalCount || 0
      }
    }
  } catch {}

  const enriched = NEWSLETTERS.map(n => ({
    ...n,
    recipients: n.id === 'bienvenida' ? usersTotal : undefined,
  }))

  return NextResponse.json({
    newsletters: enriched,
    counts: {
      total:  NEWSLETTERS.length,
      active: NEWSLETTERS.filter(n => n.status === 'active').length,
      ready:  NEWSLETTERS.filter(n => n.status === 'ready').length,
      draft:  NEWSLETTERS.filter(n => n.status === 'draft').length,
    },
  })
}
