import { NextResponse } from 'next/server'

const KEY = process.env.INSTANTLY_API_KEY || 'NzYzNzhlMDQtYjU3My00ZGUwLTk3ZTItZDI4M2E3MTI5NDQ0Om9tWnlSYWVmclpHTQ=='

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

async function getLeadsByStatus(status: number, limit = 50) {
  const r = await instantly('/api/v2/leads/list', { limit, status })
  return r?.items || []
}

async function getUniboxReplies() {
  // Try Instantly unibox for replied email content
  const r = await instantly('/api/v2/unibox/emails/list', { limit: 25, filter: 'replied' })
  return r?.items || []
}

async function getCampaigns() {
  const r = await instantly('/api/v2/campaigns?limit=50')
  return (r?.items || []).filter((c: any) =>
    !c.name.includes('[AI SDR]') && !c.name.toLowerCase().includes('ai sdr')
  )
}

export async function GET() {
  try {
    const [repliedLeads, bouncedLeads, uniboxEmails, campaigns] = await Promise.all([
      getLeadsByStatus(4, 50),   // replied
      getLeadsByStatus(-1, 50),  // bounced
      getUniboxReplies(),
      getCampaigns(),
    ])

    const tasks: any[] = []

    // 1. Replies — each one needs a follow-up action
    if (repliedLeads.length > 0) {
      repliedLeads.forEach((l: any) => {
        tasks.push({
          id: `reply-${l.id || l.email}`,
          type: 'reply',
          priority: 'alta',
          title: `Respuesta de ${l.company_name || l.email}`,
          description: `Han respondido al email. Revisar y contestar.`,
          email: l.email,
          company: l.company_name || '',
          action: 'Contestar',
          createdAt: l.timestamp_updated || l.timestamp_created,
        })
      })
    }

    // 2. Unibox replies — more detail if available
    if (uniboxEmails.length > 0 && repliedLeads.length === 0) {
      uniboxEmails.forEach((e: any) => {
        const snippet = e.body ? e.body.slice(0, 120) + '…' : 'Sin contenido'
        tasks.push({
          id: `unibox-${e.id || e.email_from}`,
          type: 'reply',
          priority: 'alta',
          title: `Respuesta de ${e.from_address || e.email_from || 'contacto'}`,
          description: snippet,
          email: e.from_address || e.email_from || '',
          company: e.company_name || '',
          action: 'Contestar',
          createdAt: e.timestamp_created,
        })
      })
    }

    // 3. Bounced emails — need email fix
    bouncedLeads.forEach((l: any) => {
      tasks.push({
        id: `bounce-${l.id || l.email}`,
        type: 'bounce',
        priority: 'media',
        title: `Email devuelto — ${l.company_name || l.email}`,
        description: `El email ${l.email} rebotó. Buscar dirección alternativa y actualizar.`,
        email: l.email,
        company: l.company_name || '',
        action: 'Actualizar email',
        createdAt: l.timestamp_updated || l.timestamp_created,
      })
    })

    // 4. Paused/pending campaigns that should be active
    const pausedCampaigns = campaigns.filter((c: any) => c.status === 0 || c.status === 3)
    pausedCampaigns.forEach((c: any) => {
      tasks.push({
        id: `camp-${c.id}`,
        type: 'campaign',
        priority: 'baja',
        title: `Campaña pendiente — ${c.name}`,
        description: `La campaña está ${c.status === 3 ? 'pausada' : 'pendiente de activar'}. Revisar y lanzar.`,
        email: '',
        company: '',
        action: 'Activar campaña',
        createdAt: c.timestamp_created,
      })
    })

    // Sort: alta first, then by date
    tasks.sort((a, b) => {
      const pOrder: Record<string, number> = { alta: 0, media: 1, baja: 2 }
      return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1)
    })

    return NextResponse.json({ tasks, updatedAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ tasks: [], error: String(err) }, { status: 200 })
  }
}
