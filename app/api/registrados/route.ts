import { NextResponse } from 'next/server'

const KEY = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='

// Keywords indicating the prospect has already registered on Artiverse
const REGISTRATION_KEYWORDS = [
  'ya estoy dentro',
  'ya me registré',
  'ya me registre',
  'ya estamos dentro',
  'ya estamos registrados',
  'me acabo de registrar',
  'acabo de registrarme',
  'ya estoy registrado',
  'ya estoy registrada',
  'ya me he dado de alta',
  'acabo de darme de alta',
  'ya tengo cuenta',
  'ya he creado',
  'me he registrado',
  'ya soy usuario',
  'ya somos usuarios',
  'ya me apunté',
  'ya me apunte',
  'ya estamos dados de alta',
  'ya me anoté',
  'ya me anote',
  'ya estamos en artiverse',
  'ya estamos en la plataforma',
  'ya somos parte',
  'already registered',
  'already signed up',
  'just registered',
  'just signed up',
  'already in',
]

async function instantly(path: string, body?: object) {
  const res = await fetch(`https://api.instantly.ai${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    next: { revalidate: 0 },
  })
  if (!res.ok) return null
  return res.json()
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function isRegistrationReply(text: string): boolean {
  const plain = stripHtml(text).toLowerCase()
  return REGISTRATION_KEYWORDS.some(kw => plain.includes(kw))
}

export async function GET() {
  try {
    // Fetch in parallel: replied leads + unibox inbox emails
    const [repliedRes, uniboxRes] = await Promise.all([
      instantly('/api/v2/leads/list', { limit: 100, status: 4 }),
      instantly('/api/v2/unibox/emails/list', { limit: 100 }),
    ])

    const repliedLeads: any[] = repliedRes?.items || []
    const uniboxEmails: any[] = uniboxRes?.items || []

    // Filter unibox emails for registration keywords
    const registeredFromUnibox: any[] = []
    for (const email of uniboxEmails) {
      const body = email.body || email.text || email.html || ''
      const subject = email.subject || ''
      if (isRegistrationReply(body) || isRegistrationReply(subject)) {
        const from = email.from_address || email.email_from || email.from || ''
        registeredFromUnibox.push({
          email: from,
          company: email.company_name || '',
          snippet: stripHtml(body).slice(0, 180),
          date: email.timestamp_created || email.created_at || null,
          source: 'unibox',
        })
      }
    }

    // Deduplicate by email address
    const seen = new Set<string>()
    const registeredLeads = registeredFromUnibox.filter(l => {
      if (seen.has(l.email)) return false
      seen.add(l.email)
      return true
    })

    return NextResponse.json({
      registeredCount: registeredLeads.length,
      registeredLeads,
      totalReplies: repliedLeads.length,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      registeredCount: 0,
      registeredLeads: [],
      totalReplies: 0,
      error: String(err),
    })
  }
}
