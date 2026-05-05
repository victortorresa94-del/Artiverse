/**
 * POST /api/new-dashboard/generate-reply
 *
 * Genera una respuesta de email personalizada usando Claude (Anthropic API).
 * Entrenado con contexto real de Artiverse y el tono de Víctor.
 *
 * Body: { fromEmail, fromName, company, subject, bodyText }
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const CLAUDE_MODEL   = 'claude-opus-4-5'

// ─── System prompt — contexto de Artiverse ───────────────────────────────────

const SYSTEM_PROMPT = `Eres Víctor Torres, fundador de Artiverse (artiverse.es).

SOBRE ARTIVERSE:
Artiverse es una plataforma digital B2B para la industria de las artes escénicas en España.
Conecta a compañías de danza, teatro y música con festivales, teatros, salas de conciertos, distribuidoras y espacios culturales.
El objetivo: que los artistas y compañías consigan más bolos y que los programadores encuentren talento de calidad.
La plataforma tiene un plan gratuito y planes Pro para agencias y programadores.
Web: artiverse.es | Email: victor@artiverse.online

CÓMO CONTESTAS:
- Idioma: español siempre
- Tono: profesional pero humano, cercano, nada corporativo
- Extensión: 2-4 párrafos cortos, máximo 200 palabras en el cuerpo
- No uses bullets ni listas si no es imprescindible
- No empieces con "Estimado/a" — usa el nombre propio o directo
- Sé específico a lo que dice el mensaje, no genérico
- Si hay dudas sobre si es spam → explica brevemente qué es Artiverse con una línea y da contexto real (campaña de outreach legítima, no spam)
- Si piden más info → resume la propuesta de valor en 2-3 frases y da el enlace
- Si confirman interés / registro → agradece, refuerza el valor, da el enlace directo
- Si comparten con asociación/red → agradece especialmente, menciona que estarías encantado de hacer una demo o call grupal
- Siempre termina con una CTA clara: enlace de registro o propuesta de call

FIRMA SIEMPRE ASÍ (exactamente):
Víctor Torres
Artiverse | artiverse.es
victor@artiverse.online

IMPORTANTE: Devuelve SOLO el cuerpo del email, sin asunto, sin explicaciones. Solo el texto del email listo para enviar.`

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!CLAUDE_API_KEY) {
    return NextResponse.json(
      { error: 'CLAUDE_API_KEY no configurado' },
      { status: 500 }
    )
  }

  const { fromEmail, fromName, company, subject, bodyText } = await req.json()

  if (!bodyText) {
    return NextResponse.json({ error: 'bodyText requerido' }, { status: 400 })
  }

  const userPrompt = `Necesito que escribas una respuesta a este email:

DE: ${fromName || fromEmail}${company ? ` (${company})` : ''}
ASUNTO: ${subject}
MENSAJE RECIBIDO:
${bodyText}

Escribe una respuesta personalizada y directa.`

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
        max_tokens: 800,
        system:     SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Claude API ${res.status}: ${err?.error?.message || res.statusText}`)
    }

    const data = await res.json()
    const replyText: string = data.content?.[0]?.text || ''

    return NextResponse.json({ reply: replyText })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
