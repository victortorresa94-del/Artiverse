/**
 * POST /api/maquetador/[id]/ai
 *
 * Body: { html: string, instruction: string }
 * Devuelve: { html: string }  (el HTML modificado por Claude)
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const CLAUDE_MODEL   = 'claude-opus-4-5'

const SYSTEM_PROMPT = `Eres un editor experto en HTML de emails para Artiverse. Recibes el HTML actual de una plantilla y una instrucción del usuario, y devuelves SOLO el HTML modificado.

REGLAS ABSOLUTAS:
- Devuelve SOLO el HTML completo modificado. Nada de markdown fences (\`\`\`html), nada de explicaciones, nada de comentarios sobre lo que cambiaste.
- Mantén la estructura table-based del email original (table, tr, td) — son obligatorias para clientes de email como Gmail/Outlook.
- Mantén TODOS los inline styles (style="..."). NO conviertas a clases CSS.
- Mantén los placeholders de HubSpot intactos: {{ contact.firstname }}, {{ contact.email }}, {{ unsubscribe_link }}, etc.
- NO añadas <script> ni <iframe> ni JavaScript.
- Si la instrucción es ambigua, aplica el cambio más razonable.
- Si la instrucción es solo cambiar texto: encuéntralo y reemplázalo conservando el formato.
- Si la instrucción es cambiar color, fuente, tamaño: modifica el style inline del elemento correspondiente.
- Si pide añadir un bloque nuevo: insértalo en el lugar lógico siguiendo el estilo visual existente.

PALETA Y FUENTE de Artiverse:
- Lima: #CCFF00 (acento)
- Negro: #0A0A0A
- Blanco: #FFFFFF
- Texto: #555555 / #777777 / #999999
- Fuente: Outfit (font-family:'Outfit',-apple-system,sans-serif)

Devuelve únicamente el documento HTML completo (desde <!DOCTYPE html> hasta </html>) con el cambio aplicado.`

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

INSTRUCCIÓN DEL USUARIO:
${instruction}

Devuelve el HTML completo modificado:`

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
        max_tokens: 16000,
        system:     SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Claude API ${res.status}: ${err?.error?.message || res.statusText}`)
    }

    const data = await res.json()
    let newHtml: string = data.content?.[0]?.text || ''

    // Limpiar posibles fences de markdown si aparecen
    newHtml = newHtml.trim()
    if (newHtml.startsWith('```')) {
      newHtml = newHtml.replace(/^```(?:html)?\s*\n/, '').replace(/\n```\s*$/, '')
    }

    if (!newHtml.includes('<')) {
      throw new Error('Claude no devolvió HTML válido')
    }

    return NextResponse.json({ html: newHtml })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
