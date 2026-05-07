/**
 * GET /api/contact-thread?email=X&campaignId=Y&suggest=true
 *
 * Returns the email sequence for a contact + their reply from Instantly unibox
 * + optionally an AI-generated reply suggestion via Anthropic.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KEY  = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='
const BASE = 'https://api.instantly.ai/api/v2'
const ANTH = process.env.ANTHROPIC_API_KEY || ''

function ih() {
  return { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fetchCampaign(id: string) {
  try {
    const r = await fetch(`${BASE}/campaigns/${id}`, {
      headers: ih(), next: { revalidate: 300 },
    })
    return r.ok ? r.json() : null
  } catch { return null }
}

async function fetchLead(email: string, campaignId: string) {
  try {
    const r = await fetch(`${BASE}/leads/list`, {
      method: 'POST',
      headers: ih(),
      body: JSON.stringify({ campaign: campaignId, email, limit: 1 }),
      next: { revalidate: 0 },
    })
    if (!r.ok) return null
    const d = await r.json()
    return d.items?.[0] ?? null
  } catch { return null }
}

async function fetchUnibox(email: string, campaignId: string) {
  // Try POST /unibox/emails
  try {
    const r = await fetch(`${BASE}/unibox/emails`, {
      method: 'POST',
      headers: ih(),
      body: JSON.stringify({ lead_email: email, campaign_id: campaignId, limit: 10 }),
      next: { revalidate: 0 },
    })
    if (r.ok) {
      const d = await r.json()
      const items = d.items ?? d.emails ?? (Array.isArray(d) ? d : [])
      if (items.length > 0) return items
    }
  } catch {}

  // Fallback: GET /unibox
  try {
    const params = new URLSearchParams({ lead_email: email, limit: '10' })
    const r = await fetch(`${BASE}/unibox?${params}`, {
      headers: ih(), next: { revalidate: 0 },
    })
    if (r.ok) {
      const d = await r.json()
      return d.items ?? d.emails ?? (Array.isArray(d) ? d : [])
    }
  } catch {}

  return []
}

async function generateReply(params: {
  company: string; firstName: string
  replyText: string; originalSubject: string; originalBodyPlain: string
}): Promise<string | null> {
  if (!ANTH) return null

  const prompt =
`Eres un experto en escritura de emails de ventas para Artiverse (artiverse.es), una plataforma B2B para la industria de las artes en vivo en España que conecta agencias de booking, managers, promotores, salas de conciertos y festivales con artistas. Yo soy Víctor Torres, responsable de marketing y crecimiento.

Un contacto ha respondido a mi email de outreach. Redacta una respuesta breve, profesional y cálida en español.

Empresa: ${params.company || 'desconocida'}
Nombre: ${params.firstName || '(desconocido)'}

Mi email original (asunto): "${params.originalSubject}"
Mi email original (primeras líneas): ${params.originalBodyPlain.slice(0, 300)}

Su respuesta:
---
${params.replyText.slice(0, 1200)}
---

Escribe SOLO el cuerpo del email de respuesta (sin línea de asunto). Máximo 140 palabras. Debe:
1. Arrancar con un saludo personalizado si tienes el nombre, si no empieza directo
2. Reconocer brevemente lo que han dicho
3. Proponer los siguientes pasos: demo rápida de 20 min o registro gratuito en artiverse.es
4. Cerrar con un CTA claro y concreto
5. Tono: profesional, directo, cercano (sector cultural español)`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTH,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!r.ok) return null
    const d = await r.json()
    return d.content?.[0]?.text?.trim() ?? null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email      = searchParams.get('email') ?? ''
  const campaignId = searchParams.get('campaignId') ?? ''
  const suggest    = searchParams.get('suggest') === 'true'

  if (!email || !campaignId) {
    return NextResponse.json({ error: 'Missing email or campaignId' }, { status: 400 })
  }

  const [camp, lead, inbox] = await Promise.all([
    fetchCampaign(campaignId),
    fetchLead(email, campaignId),
    fetchUnibox(email, campaignId),
  ])

  // Build readable sequence from campaign sequences
  const steps = camp?.sequences?.[0]?.steps ?? []
  const sequence = steps.map((step: any, i: number) => {
    const variant = step.variants?.[0] ?? {}
    const bodyPlain = stripHtml(variant.body ?? '').slice(0, 500)
    return {
      step:      i + 1,
      subject:   variant.subject ?? '',
      body:      bodyPlain,
      delay:     step.delay ?? 0,
    }
  })

  // Find the contact's inbound reply in unibox
  const emailLow = email.toLowerCase()
  const replyMsg = (inbox as any[]).find(m =>
    (m.from_email ?? m.eFrom ?? '').toLowerCase() === emailLow ||
    (m.lead_email ?? '').toLowerCase() === emailLow
  )
  const replyText = replyMsg
    ? (replyMsg.body_plain ?? replyMsg.body_text ?? stripHtml(replyMsg.body ?? '')).slice(0, 2000)
    : null
  const replyDate = replyMsg?.timestamp ?? replyMsg?.sent_at ?? null
  const replyFrom = replyMsg?.from_name ?? replyMsg?.from_email ?? null

  // AI suggestion
  let suggestedReply: string | null = null
  if (suggest) {
    const textForSuggestion = replyText ?? ''
    if (textForSuggestion) {
      suggestedReply = await generateReply({
        company:          lead?.company_name ?? '',
        firstName:        lead?.first_name ?? '',
        replyText:        textForSuggestion,
        originalSubject:  sequence[0]?.subject ?? '',
        originalBodyPlain: sequence[0]?.body ?? '',
      })
    }
  }

  return NextResponse.json({
    sequence,
    openedCount:  lead?.email_open_count  ?? 0,
    repliedCount: lead?.email_reply_count ?? 0,
    lastStep:     lead?.lt ?? null,
    replyText,
    replyDate,
    replyFrom,
    suggestedReply,
    hasAnthropicKey: !!ANTH,
    uniboxAvailable: (inbox as any[]).length > 0,
  })
}
