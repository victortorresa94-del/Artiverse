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
const CLAUDE_MODEL   = 'claude-haiku-4-5'

const SYSTEM_PROMPT = `Editor de HTML emails. Devuelve SOLO este JSON (sin markdown, sin texto extra):

{"patches":[{"find":"texto literal exacto","replace":"texto nuevo"}],"summary":"frase corta"}

REGLAS:
- "find" debe ser literal y único (incluye contexto si hace falta)
- Mantén styles inline, estructura table, placeholders {{...}}
- Negrita: añade font-weight:700 al style del elemento (NO uses <strong>)
- Color: modifica style="color:#XXX" del span/elemento
- Si cambias texto visible, cambia también style si hace falta`

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
