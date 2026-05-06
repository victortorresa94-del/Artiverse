/**
 * POST /api/drafts/generate
 *
 * Genera un email HTML completo desde cero usando IA.
 * Body: {
 *   prompt: string                                    // descripción del email
 *   referenceTemplate?: string                        // 'welcome'|'digest'|... como base estilística
 *   referenceHtml?: string                            // HTML referencia opcional
 *   images?: Array<{ base64: string; mediaType: string }>  // pantallazos referencia
 * }
 * Devuelve: { html, model }
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadTemplate } from '@/lib/templateStorage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const MODEL          = 'claude-sonnet-4-5'

const SYSTEM_PROMPT = `Eres un diseñador experto de emails HTML para Artiverse.

Diseñas siguiendo la identidad de marca:
- Paleta: lima #CCFF00 (acento), negro #0A0A0A, blanco #FFFFFF, grises #555/#777/#999
- Fuente: 'Outfit' de Google Fonts (300-700)
- Cards con border-radius:14px, sombras sutiles
- Botones lima con texto negro o negro con texto lima
- Mobile-first con media queries @media (max-width:480px)

ESTRUCTURA DE EMAIL:
- HTML5 con DOCTYPE, head con meta viewport, link a Google Fonts
- Body table-based (compatibilidad email clients)
- Container 600px máximo, centrado
- Inline styles obligatorio (no clases CSS excepto media queries)

PLACEHOLDERS comunes:
- {{firstName}} (nombre del destinatario)
- {{email}}
- {{unsubscribe_url}}

IMPORTANTE:
- Devuelve SOLO el HTML completo (DOCTYPE → /html). Nada de markdown fences ni explicaciones.
- Logo: usa <img src="https://artiverse-sigma.vercel.app/artiverse-logo.jpg" width="40" alt="Artiverse" />
- Si el usuario te da imágenes, úsalas como referencia visual del estilo deseado.
- Si te da un template referencia, mantén su estructura y solo cambia el contenido pedido.`

export async function POST(req: NextRequest) {
  if (!CLAUDE_API_KEY) {
    return NextResponse.json({ error: 'CLAUDE_API_KEY no configurado' }, { status: 500 })
  }

  const { prompt, referenceTemplate, referenceHtml, images } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'prompt requerido' }, { status: 400 })

  // Cargar template de referencia si se especifica
  let refHtml = referenceHtml || ''
  if (!refHtml && referenceTemplate) {
    try { refHtml = await loadTemplate(referenceTemplate) } catch {}
  }

  // Construir mensaje multimodal
  const userContent: any[] = []
  if (Array.isArray(images)) {
    for (const img of images.slice(0, 5)) {
      if (img?.base64 && img?.mediaType) {
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
        })
      }
    }
  }

  let textPrompt = `Diseña un email para Artiverse según esta descripción:\n\n${prompt}\n\n`
  if (refHtml) {
    textPrompt += `\nUSA ESTE HTML COMO REFERENCIA DE ESTILO Y ESTRUCTURA (cópialo y adapta el contenido):\n\n${refHtml}\n\n`
  }
  textPrompt += `\nDevuelve el HTML completo del email (DOCTYPE → </html>). Sin explicaciones, sin markdown.`
  userContent.push({ type: 'text', text: textPrompt })

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 16384,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: userContent }],
      }),
      signal: AbortSignal.timeout(58000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Claude ${res.status}: ${err?.error?.message || res.statusText}`)
    }

    const data = await res.json()
    let html: string = data.content?.[0]?.text || ''
    html = html.trim()
    if (html.startsWith('```')) {
      html = html.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
    }

    if (!html.includes('<') || !html.toLowerCase().includes('html')) {
      throw new Error('No devolvió HTML válido')
    }

    return NextResponse.json({ html, model: MODEL })
  } catch (err: any) {
    const msg = err.message?.includes('timeout') || err.message?.includes('aborted')
      ? 'Tardó demasiado generando. Prueba con descripción más concreta.'
      : err.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
