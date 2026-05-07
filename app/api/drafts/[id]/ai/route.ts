/**
 * POST /api/drafts/[id]/ai
 *
 * Body: { html, instruction, history?, image?: { base64, mediaType } }
 *
 * Devuelve patches o pregunta. Soporta imágenes adjuntas (Claude Vision).
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const MODEL_FAST     = 'claude-haiku-4-5'
const MODEL_SMART    = 'claude-sonnet-4-5'

const TRIVIAL_HINTS = [
  /^(pon|cambia|reemplaza)\s+["']?[\wáéíóú\s]+["']?\s+(en negrita|en cursiva|por|a)/i,
  /^cambia el color/i,
  /^pon (el )?botón/i,
]
function isTrivial(text: string): boolean {
  return TRIVIAL_HINTS.some(rx => rx.test(text.trim())) && text.length < 80
}

const SYSTEM_PROMPT = `Eres editor experto de HTML emails de Artiverse, conversacional e inteligente.

Recibes: HTML actual + historial de chat + nueva instrucción + opcionalmente una imagen adjunta (pantallazo o referencia visual).

Devuelves UNA de estas 2 cosas en JSON puro (sin markdown fences):

A) PATCHES (cuando tienes claro qué cambiar):
{"patches":[{"find":"...","replace":"..."}],"summary":"frase corta"}

B) PREGUNTA (cuando hay ambigüedad real):
{"question":"¿A cuál te refieres?","options":["opción 1","opción 2","opción 3"]}

╔═ CUÁNDO PREGUNTAR ═╗
- Solo cuando la instrucción puede aplicar a 2+ elementos con igual probabilidad
- Pregunta describiendo cada opción visualmente
- Máximo 4 opciones
- NO preguntes si puedes deducir por contexto/posición/historial

╔═ CUÁNDO RESOLVER TÚ ═╗
- "primera/segunda/última X" → cuenta orden de aparición
- "el de arriba/abajo" → posición
- "el rojo/verde" → color
- Menciona texto cercano único → identifica
- Conversación previa habla de algo → asume eso
- Si hay imagen adjunta, úsala para entender qué quiere el usuario (puede señalar el cambio gráficamente)

╔═ REGLAS PATCHES ═╗
- "find" literal y único en HTML actual
- Si find puede aparecer varias veces, INCLUYE contexto envolvente para hacerlo único — no falles
- "replace" puede ser "" para eliminar
- MOVER algo: 2 patches obligatorios (borrar antiguo + insertar nuevo)
- Mantén placeholders {{...}}, structure table-based, styles inline

╔═ EJEMPLOS ═╗

Usuario: "borra la primera imagen de bailarines" + 2 imágenes
→ {"patches":[{"find":"<tr bloque primera>...","replace":""}],"summary":"Eliminada primera imagen"}

Usuario: "borra la imagen" + HTML con 3 imágenes distintas
→ {"question":"¿Cuál?","options":["logo header","mockup móvil","foto bailarines"]}

Usuario: "mejora la firma" (vago pero ejecutable)
→ Aplica 3-5 patches concretos: peso fuente, divisor, espaciado, jerarquía. NO preguntes.

Sé proactivo. Solo pregunta si REALMENTE no puedes decidir.`

interface ChatMsg { role: 'user'|'assistant'; text: string }

export async function POST(req: NextRequest, _ctx: { params: { id: string } }) {
  if (!CLAUDE_API_KEY) {
    return NextResponse.json({ error: 'CLAUDE_API_KEY no configurado' }, { status: 500 })
  }

  const { html, instruction, history, image } = await req.json() as {
    html: string
    instruction: string
    history?: ChatMsg[]
    image?: { base64: string; mediaType: string }
  }
  if (!html || !instruction) {
    return NextResponse.json({ error: 'html e instruction requeridos' }, { status: 400 })
  }

  // Si hay imagen, usar Sonnet sí o sí (Haiku no es vision-capable)
  const useFast = !image && isTrivial(instruction)
  const model   = useFast ? MODEL_FAST : MODEL_SMART

  const recentHistory = (history || []).slice(-8)
  const messages: Array<{role: 'user'|'assistant'; content: any}> = []

  for (const m of recentHistory) {
    messages.push({ role: m.role, content: m.text })
  }

  // Mensaje final con HTML + instrucción + imagen opcional
  const userContent: any[] = []
  if (image && image.base64 && image.mediaType) {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: image.mediaType, data: image.base64 },
    })
  }
  userContent.push({
    type: 'text',
    text: `HTML ACTUAL:\n${html}\n\n${recentHistory.length ? 'NUEVA ' : ''}INSTRUCCIÓN:\n${instruction}\n\nDevuelve el JSON:`,
  })
  messages.push({ role: 'user', content: userContent })

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
      signal: AbortSignal.timeout(55000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Claude ${res.status}: ${err?.error?.message || res.statusText}`)
    }

    const data = await res.json()
    let raw: string = data.content?.[0]?.text || ''
    raw = raw.trim()
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
    }

    let parsed: any
    try { parsed = JSON.parse(raw) }
    catch { throw new Error(`JSON inválido: ${raw.slice(0, 200)}`) }

    if (parsed.question) {
      return NextResponse.json({
        type:     'question',
        question: parsed.question,
        options:  Array.isArray(parsed.options) ? parsed.options.slice(0, 4) : [],
        model,
      })
    }

    if (!Array.isArray(parsed.patches) || parsed.patches.length === 0) {
      throw new Error('Sin patches')
    }

    let newHtml = html
    const applied: any[] = []
    for (const p of parsed.patches) {
      if (!p.find || typeof p.replace !== 'string') {
        applied.push({ ...p, ok: false, reason: 'inválido' })
        continue
      }
      const occ = newHtml.split(p.find).length - 1
      if (occ === 0)      { applied.push({ ...p, ok: false, reason: 'no encontrado' }); continue }
      if (occ > 1)        { applied.push({ ...p, ok: false, reason: `aparece ${occ} veces` }); continue }
      newHtml = newHtml.replace(p.find, p.replace)
      applied.push({ ...p, ok: true })
    }

    const okCount = applied.filter(a => a.ok).length
    if (okCount === 0) {
      return NextResponse.json({
        type:     'question',
        question: '¿Puedes ser más específico? No pude aplicar el cambio.',
        options:  [],
        model,
      })
    }

    return NextResponse.json({
      type:    'patches',
      html:    newHtml,
      patches: applied,
      summary: parsed.summary || `${okCount} cambio${okCount===1?'':'s'}`,
      model,
    })
  } catch (err: any) {
    const msg = err.message?.includes('timeout') || err.message?.includes('aborted')
      ? 'Tardó demasiado. Sé más específico.'
      : err.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
