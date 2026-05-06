/**
 * POST /api/maquetador/[id]/ai
 *
 * Body: { html: string, instruction: string }
 * Devuelve: { html: string, patches: Array<{find,replace}>, summary: string }
 *
 * En vez de pedir a Claude todo el HTML modificado (lento, 16k chars),
 * le pedimos un JSON con find/replace patches. Esto es 5-10x más rápido
 * porque Claude solo escribe los cambios, no todo el documento.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const CLAUDE_MODEL   = 'claude-sonnet-4-5'

const SYSTEM_PROMPT = `Eres un editor de HTML emails de Artiverse. Recibes el HTML actual y una instrucción, y devuelves un JSON con los cambios concretos a aplicar.

DEVUELVE EXACTAMENTE ESTE FORMATO JSON (nada más, sin markdown fences, sin explicaciones):
{
  "patches": [
    { "find": "texto exacto literal a buscar en el HTML", "replace": "texto nuevo" }
  ],
  "summary": "Una frase corta describiendo el cambio"
}

REGLAS:
1. Cada "find" debe aparecer EXACTAMENTE UNA VEZ en el HTML. Si el texto a cambiar aparece varias veces, incluye más contexto antes/después en el find/replace para hacerlo único.
2. El "find" debe ser una cadena literal (sin regex, sin escapes especiales).
3. Mantén intactos los placeholders {{ contact.firstname }}, {{ contact.email }}, {{ unsubscribe_link }}, {{firstName}}, {{email}}.
4. Mantén estructura table-based de email.
5. Mantén styles inline.
6. NO inventes <script> ni <iframe>.
7. Si la instrucción es ambigua, aplica la interpretación más razonable.
8. Para añadir negritas: envuelve en <strong>...</strong>.
9. Para cambiar colores en spans: añade/modifica el style="color:#XXXXXX".
10. Para cambiar tamaños: ajusta font-size: en style.

EJEMPLOS:

Instrucción: "Pon 'aquí y ahora' en negrita"
HTML contiene: <span style="color:#CCFF00;">aquí y ahora.</span>
Respuesta:
{
  "patches": [{
    "find": "<span style=\\"color:#CCFF00;\\">aquí y ahora.</span>",
    "replace": "<span style=\\"color:#CCFF00;font-weight:700;\\">aquí y ahora.</span>"
  }],
  "summary": "Aplicada negrita a 'aquí y ahora'"
}

Instrucción: "Cambia el texto 'Ya estás dentro' por 'Bienvenido a la familia'"
Respuesta:
{
  "patches": [{
    "find": "Ya estás dentro.",
    "replace": "Bienvenido a la familia."
  }],
  "summary": "Texto principal del cuerpo cambiado"
}

Si necesitas múltiples cambios, devuelve múltiples patches en el array.`

export async function POST(req: NextRequest, _ctx: { params: { id: string } }) {
  if (!CLAUDE_API_KEY) {
    return NextResponse.json({ error: 'CLAUDE_API_KEY no configurado' }, { status: 500 })
  }

  const { html, instruction } = await req.json()
  if (!html || !instruction) {
    return NextResponse.json({ error: 'html e instruction requeridos' }, { status: 400 })
  }

  const userPrompt = `HTML ACTUAL:
${html}

INSTRUCCIÓN:
${instruction}

Devuelve el JSON con los patches:`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: 4096,        // patches son cortos, 4k sobra
        system:     SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
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

    // Limpiar fences si las puso
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
    }

    let parsed: { patches?: Array<{find:string;replace:string}>; summary?: string }
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error(`Claude devolvió JSON inválido: ${raw.slice(0, 200)}`)
    }

    if (!Array.isArray(parsed.patches) || parsed.patches.length === 0) {
      throw new Error('Sin patches que aplicar')
    }

    // Aplicar patches en orden
    let newHtml = html
    const applied: Array<{find:string;replace:string;ok:boolean}> = []
    for (const p of parsed.patches) {
      if (!p.find || typeof p.replace !== 'string') continue
      const occurrences = newHtml.split(p.find).length - 1
      if (occurrences === 0) {
        applied.push({ ...p, ok: false })
        continue
      }
      if (occurrences > 1) {
        // Si aparece más de una vez, no lo aplicamos para evitar daño colateral
        applied.push({ ...p, ok: false })
        continue
      }
      newHtml = newHtml.replace(p.find, p.replace)
      applied.push({ ...p, ok: true })
    }

    const okCount = applied.filter(a => a.ok).length
    if (okCount === 0) {
      throw new Error(`Ninguno de los ${parsed.patches.length} cambios se pudo aplicar (find no encontrado o ambiguo). Sé más específico.`)
    }

    return NextResponse.json({
      html:    newHtml,
      patches: applied,
      summary: parsed.summary || `${okCount} cambio${okCount===1?'':'s'} aplicado${okCount===1?'':'s'}`,
    })
  } catch (err: any) {
    const msg = err.name === 'TimeoutError' || err.message?.includes('timeout') || err.message?.includes('aborted')
      ? 'Tardó demasiado. Prueba con una instrucción más específica.'
      : err.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
