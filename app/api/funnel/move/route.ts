/**
 * POST /api/funnel/move
 *
 * Mueve un contacto a una fase manual ("interesado" / "no_interesado")
 * o lo quita de las listas manuales (cualquier otra fase → vuelve a auto).
 *
 * Body: { email: string, phase: 'interesado' | 'no_interesado' | '__auto__' }
 *
 * Operaciones:
 *   1. Asegura que el contacto exista en HubSpot (upsert)
 *   2. Lo elimina de TODAS las listas funnel manuales
 *   3. Si la fase es manual → lo añade a la lista correspondiente
 *      (si __auto__ → solo se queda removido)
 */
import { NextRequest, NextResponse } from 'next/server'
import { upsertContact } from '@/lib/hubspot'

export const dynamic = 'force-dynamic'

const HS_TOKEN = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS       = 'https://api.hubapi.com'

const FUNNEL_LIST_NAMES: Record<string, string> = {
  interesado:    'Funnel: Interesado',
  no_interesado: 'Funnel: No interesado',
}

function hsHeaders() {
  return { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' }
}

async function getFunnelListIds(): Promise<Record<string, number>> {
  const res = await fetch(`${HS}/contacts/v1/lists?count=250`, { headers: hsHeaders() })
  if (!res.ok) return {}
  const d = await res.json()
  const result: Record<string, number> = {}
  for (const [phase, name] of Object.entries(FUNNEL_LIST_NAMES)) {
    const found = (d.lists || []).find((l: any) => l.name === name)
    if (found) result[phase] = found.listId
  }
  return result
}

async function removeFromList(listId: number, vid: number) {
  const res = await fetch(`${HS}/contacts/v1/lists/${listId}/remove`, {
    method: 'POST',
    headers: hsHeaders(),
    body:   JSON.stringify({ vids: [vid] }),
  })
  return res.ok
}

async function addToList(listId: number, vid: number) {
  const res = await fetch(`${HS}/contacts/v1/lists/${listId}/add`, {
    method: 'POST',
    headers: hsHeaders(),
    body:   JSON.stringify({ vids: [vid] }),
  })
  return res.ok
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { email, phase } = await req.json()

  if (!email || !phase) {
    return NextResponse.json({ error: 'email y phase requeridos' }, { status: 400 })
  }

  const validPhases = ['interesado', 'no_interesado', '__auto__']
  if (!validPhases.includes(phase)) {
    return NextResponse.json(
      { error: `Fase inválida. Solo: ${validPhases.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    // 1. Upsert contacto (asegura que exista y obtiene VID)
    const { vid } = await upsertContact({ email })

    // 2. Resolver listIds
    const listIds = await getFunnelListIds()

    // 3. Remover de TODAS las listas manuales
    for (const id of Object.values(listIds)) {
      await removeFromList(id, vid)
    }

    // 4. Si fase es manual → añadir a la lista correspondiente
    if (phase !== '__auto__') {
      const targetListId = listIds[phase]
      if (!targetListId) {
        return NextResponse.json(
          { error: `Lista funnel "${phase}" no encontrada en HubSpot` },
          { status: 500 }
        )
      }
      await addToList(targetListId, vid)
    }

    return NextResponse.json({ ok: true, email, phase, vid })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
