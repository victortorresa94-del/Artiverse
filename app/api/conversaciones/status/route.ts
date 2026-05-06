/**
 * POST /api/conversaciones/status
 *
 * Cambia el estado de una conversación. Body: { email, status }
 * Estados: pendiente | esperando | cerrada | no_interesado | mail_obsoleto
 *
 * Implementación: añade/quita al contacto de las listas HubSpot
 * "Conv: <estado>". "pendiente" = quitar de todas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { upsertContact } from '@/lib/hubspot'

export const dynamic = 'force-dynamic'

const HS_TOKEN = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS       = 'https://api.hubapi.com'

const CONV_LIST_NAMES: Record<string, string> = {
  esperando:     'Conv: Esperando respuesta',
  cerrada:       'Conv: Cerrada',
  no_interesado: 'Conv: No interesado',
  mail_obsoleto: 'Conv: Mail obsoleto',
}

const VALID = ['pendiente', 'esperando', 'cerrada', 'no_interesado', 'mail_obsoleto']

function hsHeaders() {
  return { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' }
}

async function ensureListIds(): Promise<Record<string, number>> {
  const res = await fetch(`${HS}/contacts/v1/lists?count=250`, { headers: hsHeaders() })
  if (!res.ok) return {}
  const d = await res.json()
  const existing: Array<{ listId: number; name: string }> = (d.lists || []).map((l: any) => ({ listId: l.listId, name: l.name }))
  const result: Record<string, number> = {}

  for (const [phase, name] of Object.entries(CONV_LIST_NAMES)) {
    const found = existing.find(l => l.name === name)
    if (found) {
      result[phase] = found.listId
    } else {
      // Crear si no existe
      const cr = await fetch(`${HS}/contacts/v1/lists`, {
        method: 'POST',
        headers: hsHeaders(),
        body: JSON.stringify({ name, dynamic: false }),
      })
      if (cr.ok) {
        const cd = await cr.json()
        result[phase] = cd.listId
      }
    }
  }
  return result
}

async function removeFromList(listId: number, vid: number) {
  await fetch(`${HS}/contacts/v1/lists/${listId}/remove`, {
    method: 'POST', headers: hsHeaders(),
    body: JSON.stringify({ vids: [vid] }),
  })
}
async function addToList(listId: number, vid: number) {
  await fetch(`${HS}/contacts/v1/lists/${listId}/add`, {
    method: 'POST', headers: hsHeaders(),
    body: JSON.stringify({ vids: [vid] }),
  })
}

export async function POST(req: NextRequest) {
  const { email, status } = await req.json()
  if (!email || !status) {
    return NextResponse.json({ error: 'email y status requeridos' }, { status: 400 })
  }
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: `Estado inválido. Solo: ${VALID.join(', ')}` }, { status: 400 })
  }

  try {
    const { vid } = await upsertContact({ email })
    const listIds = await ensureListIds()

    // Quitar de todas las listas
    for (const id of Object.values(listIds)) {
      await removeFromList(id, vid)
    }

    // Añadir a la nueva (excepto pendiente)
    if (status !== 'pendiente') {
      const target = listIds[status]
      if (target) await addToList(target, vid)
    }

    return NextResponse.json({ ok: true, email, status, vid })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
