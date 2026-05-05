/**
 * GET /api/automation/welcome
 *
 * Automatización de bienvenida a nuevos usuarios de Artiverse:
 *   1. Obtiene usuarios registrados en los últimos WINDOW_MIN minutos
 *   2. Para cada uno:
 *      a. Upsert en HubSpot CRM (seguimiento)
 *      b. Lo añade a la lista HubSpot "Bienvenida Artiverse" (si HS_WELCOME_LIST_ID está definido)
 *      c. Envía el email de bienvenida vía SMTP (victor@artiverse.es)
 *
 * Auth: Authorization: Bearer $CRON_SECRET  ó  ?token=AETHER2026
 *
 * Variables de entorno:
 *   ARTIVERSE_API_KEY    — clave de la API de Artiverse
 *   SMTP_USER            — victor@artiverse.es
 *   SMTP_PASS            — App Password de Google
 *   HS_WELCOME_LIST_ID   — (opcional) ID de lista HubSpot para tracking
 *   WELCOME_WINDOW_MIN   — (opcional) ventana en minutos, por defecto 70
 */
import { NextRequest, NextResponse } from 'next/server'
import { upsertContact, addContactsToList } from '@/lib/hubspot'
import { sendWelcomeEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const ARTIVERSE_API    = 'https://api.artiverse.es'
const ARTIVERSE_KEY    = process.env.ARTIVERSE_API_KEY || ''
const HS_WELCOME_LIST  = process.env.HS_WELCOME_LIST_ID || ''
// Ventana temporal: ligeramente superior al intervalo del cron (1h) para no perder usuarios
const WINDOW_MIN       = parseInt(process.env.WELCOME_WINDOW_MIN || '70')

// ─── Artiverse helpers ────────────────────────────────────────────────────────

interface RawUser {
  email?:        string
  name?:         string
  createdAt?:    string
  subscription?: { planType?: string } | string
  agencies?:     Array<{ displayName?: string; legalName?: string; city?: string }>
}

function getPlanLabel(sub: RawUser['subscription']): string {
  if (!sub) return 'Free'
  if (typeof sub === 'string') return sub
  return sub.planType ?? 'Free'
}

async function fetchNewUsers(windowMinutes: number): Promise<RawUser[]> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  // Primera página (los más recientes llegan primero)
  const res = await fetch(`${ARTIVERSE_API}/admin/marketing/users?limit=100`, {
    headers: { 'x-api-key': ARTIVERSE_KEY, 'Content-Type': 'application/json' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Artiverse API ${res.status}: ${await res.text()}`)

  const data = await res.json()
  const users: RawUser[] = data.data ?? data.users ?? data.items ?? data.results ?? []

  // Filtra por ventana temporal
  return users.filter(u => {
    const ts = u.createdAt ?? ''
    return ts >= since
  })
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const authHeader = req.headers.get('authorization')
  const token      = searchParams.get('token')

  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    token !== 'AETHER2026'
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!ARTIVERSE_KEY) {
    return NextResponse.json({ error: 'ARTIVERSE_API_KEY no configurado' }, { status: 500 })
  }

  // ── Proceso ───────────────────────────────────────────────────────────────
  const results = {
    window:   `${WINDOW_MIN}min`,
    found:    0,
    synced:   0,
    emailed:  0,
    skipped:  0,
    errors:   [] as string[],
    users:    [] as string[],
  }

  try {
    const newUsers = await fetchNewUsers(WINDOW_MIN)
    results.found = newUsers.length

    if (newUsers.length === 0) {
      return NextResponse.json({ ok: true, message: 'Sin usuarios nuevos en la ventana', ...results })
    }

    // Emails añadidos a la lista HubSpot (para tracking en bloque al final)
    const emailsForList: string[] = []

    for (const raw of newUsers) {
      const email = raw.email?.trim() ?? ''
      if (!email) { results.skipped++; continue }

      const nameParts = (raw.name ?? '').trim().split(/\s+/)
      const firstName = nameParts[0] || 'artista'
      const lastName  = nameParts.slice(1).join(' ')
      const planType  = getPlanLabel(raw.subscription)
      const agency    = raw.agencies?.[0]

      results.users.push(email)

      // 1. Upsert en HubSpot CRM
      try {
        await upsertContact({
          email,
          firstName,
          lastName,
          company: agency?.displayName ?? agency?.legalName ?? '',
          city:    agency?.city ?? '',
          status:  'new-artiverse-user',
          campaign:'Artiverse Platform',
        })
        results.synced++
        emailsForList.push(email)
      } catch (err: any) {
        results.errors.push(`[HubSpot] ${email}: ${err.message}`)
      }

      // 2. Envío de email de bienvenida
      try {
        await sendWelcomeEmail({ email, name: raw.name, planType })
        results.emailed++
      } catch (err: any) {
        results.errors.push(`[Email] ${email}: ${err.message}`)
      }
    }

    // 3. Añadir todos a la lista HubSpot de tracking (si está configurada)
    if (HS_WELCOME_LIST && emailsForList.length > 0) {
      try {
        await addContactsToList(HS_WELCOME_LIST, emailsForList)
      } catch (err: any) {
        results.errors.push(`[HubSpot List] ${err.message}`)
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, ...results }, { status: 500 })
  }
}
