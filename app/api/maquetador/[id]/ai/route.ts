/**
 * POST /api/maquetador/[id]/ai
 *
 * Claude puede devolver UNA de estas 2 cosas:
 *   A) Patches directos:    { patches, summary }
 *   B) Pregunta de clarif:  { question, options }
 *
 * El cliente muestra la pregunta como mensaje con botones de respuesta rápida.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const MODEL_FAST     = 'claude-haiku-4-5'
const MODEL_SMART    = 'claude-sonnet-4-5'

// Triviales que Haiku resuelve bien (sin ambigüedad estructural)
const TRIVIAL_HINTS = [
  /^(pon|cambia|reemplaza)\s+["']?[\wáéíóú\s]+["']?\s+(en negrita|en cursiva|por|a)/i,
  /^cambia el color/i,
  /^pon (el )?botón/i,
]
function isTrivial(text: string): boolean {
  return TRIVIAL_HINTS.some(rx => rx.test(text.trim())) && text.length < 80
}

const SYSTEM_PROMPT = `Eres editor experto de HTML emails de Artiverse, conversacional e inteligente.

Recibes: HTML actual + historial de chat + nueva instrucción.

Devuelves UNA de estas 2 cosas en JSON puro (sin markdown fences):

A) PATCHES (cuando tienes claro qué cambiar):
{"patches":[{"find":"...","replace":"..."}],"summary":"frase corta"}

B) PREGUNTA (cuando hay ambigüedad real y no puedes decidir):
{"question":"¿A cuál te refieres?","options":["opción concreta 1","opción concreta 2","opción 3"]}

╔═ CUÁNDO PREGUNTAR (B) ═╗
- Solo cuando la instrucción puede aplicar a 2+ elementos con igual probabilidad
- Pregunta describiendo cada opción de forma visual ("la imagen del mockup móvil", "la foto de los bailarines")
- Máximo 4 opciones
- NO preguntes si puedes deducir por contexto/posición

╔═ CUÁNDO RESOLVER TÚ MISMO (A) ═╗
- Si dice "primera/segunda/última X" → cuenta el orden de aparición
- Si dice "el de arriba/abajo" → posición en el documento
- Si dice "el rojo/verde" → color
- Si menciona alt text o texto cercano único → identifícalo
- Si la conversación previa habla de algo, asume que se refiere a eso

╔═ REGLAS DE PATCHES ═╗
- "find" literal y único en el HTML actual
- Si find puede aparecer varias veces, INCLUYE contexto envolvente (5-15 caracteres antes/después) para hacerlo único — no falles, sé creativo
- "replace" puede ser "" para eliminar
- MOVER algo: 2 patches obligatorios — uno con replace="" para borrar del sitio antiguo, otro que inserta en el nuevo (find=elemento ancla, replace=ancla+elemento movido)
- Mantén placeholders {{...}}, estructura table-based, styles inline

╔═ EJEMPLOS ═╗

EJEMPLO 1 — instrucción clara con orden:
HTML: tiene <img src="dancers1.jpg"> y <img src="dancers2.jpg">
Usuario: "borra la primera imagen de los bailarines"
→ {"patches":[{"find":"<tr>...<img src=\\"dancers1.jpg\\">...</tr>","replace":""}],"summary":"Eliminada la primera imagen de bailarines"}

EJEMPLO 2 — ambigüedad real:
HTML: tiene logo del header, mockup móvil, foto bailarines
Usuario: "borra la imagen"
→ {"question":"¿Cuál de las 3 imágenes quieres borrar?","options":["el logo del header","el mockup del móvil","la foto de los bailarines"]}

EJEMPLO 3 — usa contexto del historial:
Historial: usuario movió foto de bailarines abajo
Usuario: "borra la anterior"
→ {"patches":[{"find":"<bloque original que se duplicó>","replace":""}],"summary":"Eliminada la copia que quedó arriba"}

EJEMPLO 4 — mejora vagamente pedida pero ejecutable:
Usuario: "mejora la firma"
→ aplica 3-5 patches concretos: aumenta peso fuente del nombre, añade divisor visual, ajusta espaciado, etc. NO preguntes "¿cómo quieres mejorarla?" — toma la iniciativa.

Sé proactivo. Solo pregunta si REALMENTE no puedes decidir entre opciones igualmente válidas.`

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

  // Smart por defecto (mejor reasoning para encontrar elementos), Haiku solo para triviales
  const useFast = isTrivial(instruction)
  const model   = useFast ? MODEL_FAST : MODEL_SMART

  // Build conversation
  const recentHistory = (history || []).slice(-8)
  const messages: Array<{role: 'user'|'assistant'; content: string}> = []

  if (recentHistory.length === 0) {
    messages.push({
      role: 'user',
      content: `HTML ACTUAL:\n${html}\n\nINSTRUCCIÓN:\n${instruction}\n\nDevuelve el JSON:`,
    })
  } else {
    for (const m of recentHistory) {
      messages.push({ role: m.role, content: m.text })
    }
    messages.push({
      role: 'user',
      content: `HTML ACTUAL:\n${html}\n\nNUEVA INSTRUCCIÓN:\n${instruction}\n\nDevuelve el JSON:`,
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

    let parsed: any
    try { parsed = JSON.parse(raw) }
    catch { throw new Error(`Claude devolvió JSON inválido: ${raw.slice(0, 200)}`) }

    // ── B: Pregunta de clarificación ──
    if (parsed.question) {
      return NextResponse.json({
        type:     'question',
        question: parsed.question,
        options:  Array.isArray(parsed.options) ? parsed.options.slice(0, 4) : [],
        model,
      })
    }

    // ── A: Patches ──
    if (!Array.isArray(parsed.patches) || parsed.patches.length === 0) {
      throw new Error('Sin patches que aplicar')
    }

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
      // Fallback: si todos fallaron, devuelve una pregunta con la razón
      const reasons = applied.map(a => a.reason).filter(Boolean)
      const ambig   = reasons.some(r => r?.includes('aparece'))
      return NextResponse.json({
        type:     'question',
        question: ambig
          ? '¿Puedes ser más específico? El elemento que mencionas aparece varias veces.'
          : '¿Puedes describir mejor el cambio? No encontré qué tocar.',
        options:  [],
        model,
      })
    }

    return NextResponse.json({
      type:    'patches',
      html:    newHtml,
      patches: applied,
      summary: parsed.summary || `${okCount} cambio${okCount===1?'':'s'} aplicado${okCount===1?'':'s'}`,
      model,
    })
  } catch (err: any) {
    const msg = err.name === 'TimeoutError' || err.message?.includes('timeout') || err.message?.includes('aborted')
      ? 'Tardó demasiado. Prueba con instrucción más concreta.'
      : err.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
