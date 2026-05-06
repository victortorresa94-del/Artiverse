/**
 * POST /api/maquetador/[id]/ai
 *
 * Body: { html, instruction, history?: ChatMsg[] }
 * history es la conversación reciente (últimos turnos) para dar contexto.
 *
 * Devuelve: { html, patches, summary }
 *
 * Modo "patches": Claude devuelve solo los find/replace, los aplicamos local.
 * Modelo: Haiku 4.5 por defecto (rápido), upgrade a Sonnet si la instrucción
 * tiene palabras de tarea compleja (mejora, rediseña, optimiza, refactoriza).
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const MODEL_FAST     = 'claude-haiku-4-5'
const MODEL_SMART    = 'claude-sonnet-4-5'

const COMPLEX_HINTS = [
  /mejora/i, /redise[ñn]a/i, /optimiz/i, /refactor/i, /reorganiz/i,
  /haz[lo]a? mejor/i, /m[aá]s profesional/i, /m[aá]s moderno/i,
  /todo el/i, /entero/i,
]
function isComplex(text: string): boolean {
  return COMPLEX_HINTS.some(rx => rx.test(text))
}

const SYSTEM_PROMPT = `Eres un editor experto de HTML emails de Artiverse. Recibes el HTML actual, el historial reciente de la conversación, y una nueva instrucción. Devuelves un JSON con los cambios concretos.

DEVUELVE EXACTAMENTE ESTE JSON (sin markdown fences, sin texto extra):
{
  "patches": [{"find":"texto literal","replace":"texto nuevo"}],
  "summary": "frase corta describiendo qué cambiaste"
}

REGLAS DE PATCHES:
- "find" debe ser literal y único en el HTML. Si hay duplicados, incluye contexto antes/después para hacerlo único.
- "replace" puede ser "" para eliminar.
- Mantén placeholders {{ contact.firstname }}, {{ contact.email }}, {{ unsubscribe_link }}, {{firstName}}, {{email}}.
- Mantén estructura table-based de email.
- Mantén styles inline (no añadas CSS classes).
- NO añadas <script> ni <iframe>.

CONTEXTO Y MEMORIA:
- Si la instrucción usa "la anterior", "lo de antes", "esa", "ese cambio", "deshazlo", consulta el historial. El último turno asistente describe qué cambiaste.
- Si pide deshacer un cambio, devuelve patches inversos (find/replace invertidos del cambio anterior).

PATRONES COMUNES — APLÍCALOS CORRECTAMENTE:

PATRÓN "MOVER X DE A A B" (ej: "baja la imagen debajo de Y"):
- Genera DOS patches:
  1) {"find": "<bloque X completo>", "replace": ""}     ← borra del sitio antiguo
  2) {"find": "<bloque Y completo>", "replace": "<bloque Y completo><bloque X completo>"}    ← inserta en nuevo sitio
- NUNCA solo añadas el bloque sin borrar el original (eso lo duplica).

PATRÓN "ELIMINAR X":
- Un patch: {"find":"<bloque X>", "replace":""}

PATRÓN "MEJORAR LA FIRMA / MEJORAR SECCIÓN" (instrucción genérica de mejora):
- Aplica MÚLTIPLES cambios concretos juntos (3-5 patches), no uno solo. Por ejemplo para una firma:
  • Aumenta peso de la fuente del nombre (font-weight:600 → 700)
  • Añade un divisor visual antes (línea hr o borde superior con tono sutil)
  • Aumenta espaciado superior con margin-top
  • Diferencia jerarquía: nombre más grande, cargo en color secundario más pequeño
  • Si hay logo, alinea verticalmente
- DEBE ser un cambio visible, no cosmético invisible.

PATRÓN "PON X EN NEGRITA":
- Añade font-weight:700 al style del elemento que contiene X (no envuelvas en <strong>).

PATRÓN "CAMBIA COLOR DE X A Y":
- Modifica style="color:#XXXXXX" del elemento.

PATRÓN "CAMBIA TEXTO 'A' POR 'B'":
- {"find":"A", "replace":"B"} (con contexto si A no es único).

PATRÓN "AÑADE UN BLOQUE NUEVO":
- {"find":"<elemento ancla>", "replace":"<elemento ancla><nuevo bloque>"}

PALETA Artiverse: lima #CCFF00 (acento), negro #0A0A0A, blanco, grises #555/#777/#999. Fuente: 'Outfit'.`

interface ChatMsg { role: 'user'|'assistant'; text: string }

export async function POST(req: NextRequest, _ctx: { params: { id: string } }) {
  if (!CLAUDE_API_KEY) {
    return NextResponse.json({ error: 'CLAUDE_API_KEY no configurado' }, { status: 500 })
  }

  const { html, instruction, history } = await req.json() as {
    html: string; instruction: string; history?: ChatMsg[]
  }
  if (!html || !instruction) {
    return NextResponse.json({ error: 'html e instruction requeridos' }, { status: 400 })
  }

  // Modelo: smart si la instrucción es compleja o se hace referencia al pasado
  const referencesPast = /\b(anterior|antes|previo|deshaz|esa|ese)\b/i.test(instruction)
  const useSmart       = isComplex(instruction) || referencesPast
  const model          = useSmart ? MODEL_SMART : MODEL_FAST

  // Construir mensajes con memoria
  const recentHistory = (history || []).slice(-6)  // últimos 3 turnos (6 mensajes)
  const messages: Array<{role: 'user'|'assistant'; content: string}> = []

  // Primer turno: HTML completo + instrucción
  // Turnos posteriores: solo cita de instrucción + summary anterior
  if (recentHistory.length === 0) {
    messages.push({
      role: 'user',
      content: `HTML ACTUAL:\n${html}\n\nINSTRUCCIÓN:\n${instruction}\n\nDevuelve el JSON con patches:`,
    })
  } else {
    // Pasamos el historial como conversación, y el HTML actual al final
    for (const m of recentHistory) {
      messages.push({ role: m.role, content: m.text })
    }
    messages.push({
      role: 'user',
      content: `HTML ACTUAL (después de los cambios anteriores):\n${html}\n\nNUEVA INSTRUCCIÓN:\n${instruction}\n\nDevuelve el JSON con patches:`,
    })
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system:     SYSTEM_PROMPT,
        messages,
      }),
      signal: AbortSignal.timeout(50000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Claude API ${res.status}: ${err?.error?.message || res.statusText}`)
    }

    const data = await res.json()
    let raw: string = data.content?.[0]?.text || ''
    raw = raw.trim()
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
    }

    let parsed: { patches?: Array<{find:string;replace:string}>; summary?: string }
    try { parsed = JSON.parse(raw) }
    catch { throw new Error(`Claude devolvió JSON inválido: ${raw.slice(0, 200)}`) }

    if (!Array.isArray(parsed.patches) || parsed.patches.length === 0) {
      throw new Error('Sin patches que aplicar')
    }

    // Aplicar patches secuencialmente
    let newHtml = html
    const applied: Array<{find:string;replace:string;ok:boolean;reason?:string}> = []
    for (const p of parsed.patches) {
      if (!p.find || typeof p.replace !== 'string') {
        applied.push({ find: p.find || '', replace: p.replace || '', ok: false, reason: 'patch inválido' })
        continue
      }
      const occurrences = newHtml.split(p.find).length - 1
      if (occurrences === 0) {
        applied.push({ ...p, ok: false, reason: 'no encontrado' })
        continue
      }
      if (occurrences > 1) {
        applied.push({ ...p, ok: false, reason: `aparece ${occurrences} veces` })
        continue
      }
      newHtml = newHtml.replace(p.find, p.replace)
      applied.push({ ...p, ok: true })
    }

    const okCount = applied.filter(a => a.ok).length
    if (okCount === 0) {
      const reasons = applied.map(a => a.reason).filter(Boolean).join(', ')
      throw new Error(`Ningún cambio aplicado (${reasons || 'desconocido'}). Sé más específico citando texto cercano.`)
    }

    return NextResponse.json({
      html:    newHtml,
      patches: applied,
      summary: parsed.summary || `${okCount} cambio${okCount===1?'':'s'} aplicado${okCount===1?'':'s'}`,
      model,
    })
  } catch (err: any) {
    const msg = err.name === 'TimeoutError' || err.message?.includes('timeout') || err.message?.includes('aborted')
      ? 'Tardó demasiado. Prueba con instrucción más específica.'
      : err.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
