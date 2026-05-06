/**
 * GET /api/contact/[email]
 *
 * Devuelve la ficha unificada de un contacto:
 *   - HubSpot: vid, todas las propiedades, ai_summary si existe
 *   - Instantly: lead data (status, opens, clicks, replies, payload)
 *   - Artiverse: usuario si está registrado (perfil)
 *   - Funnel: fase actual outbound + inbound
 *   - Conversación: estado actual + último mensaje
 */
import { NextRequest, NextResponse } from 'next/server'
import { INSTANTLY_API_KEY } from '@/lib/instantly'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const HS_TOKEN = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS       = 'https://api.hubapi.com'
const ARTIVERSE_API = 'https://api.artiverse.es'
const ARTIVERSE_KEY = process.env.ARTIVERSE_API_KEY || ''

// ─── HubSpot ──────────────────────────────────────────────────────────────────

async function fetchHubspotContact(email: string): Promise<any | null> {
  if (!HS_TOKEN) return null
  // v1 contact por email (read works en plan estándar)
  try {
    const props = [
      'email', 'firstname', 'lastname', 'company', 'jobtitle', 'phone', 'city',
      'website', 'lifecyclestage', 'hs_lead_status', 'createdate', 'lastmodifieddate',
      'notes_last_contacted', 'num_associated_deals', 'hs_email_last_send_date',
      'hs_email_last_open_date', 'hs_email_last_reply_date', 'hs_email_open',
      'hs_email_reply', 'hs_predictivecontactscore_v2', 'hs_analytics_source',
      'funnel_phase', 'hs_content_membership_status',
    ].join(',')
    const url = `${HS}/contacts/v1/contact/email/${encodeURIComponent(email)}/profile?propertyMode=value_only&property=${props.split(',').join('&property=')}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${HS_TOKEN}` }, next: { revalidate: 0 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function fetchHubspotEngagements(vid: number): Promise<any[]> {
  if (!HS_TOKEN || !vid) return []
  try {
    const res = await fetch(
      `${HS}/engagements/v1/engagements/associated/CONTACT/${vid}/paged?limit=50`,
      { headers: { Authorization: `Bearer ${HS_TOKEN}` }, next: { revalidate: 0 } }
    )
    if (!res.ok) return []
    const d = await res.json()
    return (d.results || []).map((it: any) => ({
      id:        it.engagement.id,
      type:      it.engagement.type,
      timestamp: new Date(it.engagement.timestamp).toISOString(),
      subject:   it.metadata?.subject || it.metadata?.title || '',
      preview:   (it.metadata?.text || it.metadata?.body || '').slice(0, 160),
      direction: (() => {
        const own = ['victor@artiversemail.es','victor@artiverse.es','victor@artiverse.online']
        const from = it.metadata?.from?.email?.toLowerCase() || ''
        if (own.includes(from)) return 'out'
        return 'in'
      })(),
    }))
  } catch {
    return []
  }
}

// ─── Instantly ────────────────────────────────────────────────────────────────

async function fetchInstantlyLead(email: string): Promise<any | null> {
  try {
    const res = await fetch('https://api.instantly.ai/api/v2/leads/list', {
      method: 'POST',
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: email, limit: 5 }),
    })
    if (!res.ok) return null
    const d = await res.json()
    const items = d.items || []
    return items.find((l: any) => l.email?.toLowerCase() === email.toLowerCase()) || null
  } catch {
    return null
  }
}

// ─── Artiverse ────────────────────────────────────────────────────────────────

async function fetchArtiverseUser(email: string): Promise<any | null> {
  if (!ARTIVERSE_KEY) return null
  try {
    let cursor: string | null = null
    for (let p = 0; p < 10; p++) {
      const url = new URL(`${ARTIVERSE_API}/admin/marketing/users`)
      url.searchParams.set('limit', '100')
      if (cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url.toString(), {
        headers: { 'x-api-key': ARTIVERSE_KEY }, next: { revalidate: 0 },
      })
      if (!res.ok) break
      const d = await res.json()
      const users = d.data || d.users || []
      const found = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
      if (found) return found
      cursor = d.nextCursor
      if (!cursor || !d.hasMore) break
    }
  } catch {}
  return null
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email).toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  try {
    const [hsContact, instantly, artiverse] = await Promise.all([
      fetchHubspotContact(email),
      fetchInstantlyLead(email),
      fetchArtiverseUser(email),
    ])

    const vid = hsContact?.vid || hsContact?.['vid'] || 0
    const engagements = vid ? await fetchHubspotEngagements(vid) : []

    // Aplanar properties HubSpot
    const hsProps: Record<string, any> = {}
    if (hsContact?.properties) {
      for (const [k, v] of Object.entries<any>(hsContact.properties)) {
        hsProps[k] = (v as any)?.value ?? v
      }
    }

    return NextResponse.json({
      email,
      hubspot: hsContact ? {
        vid,
        properties: hsProps,
        // Datos básicos
        firstname:    hsProps.firstname,
        lastname:     hsProps.lastname,
        company:      hsProps.company,
        jobtitle:     hsProps.jobtitle,
        phone:        hsProps.phone,
        city:         hsProps.city,
        lifecycle:    hsProps.lifecyclestage,
        leadStatus:   hsProps.hs_lead_status,
        funnelPhase:  hsProps.funnel_phase,
        createdAt:    hsProps.createdate ? new Date(parseInt(hsProps.createdate)).toISOString() : null,
        lastModified: hsProps.lastmodifieddate ? new Date(parseInt(hsProps.lastmodifieddate)).toISOString() : null,
        score:        hsProps.hs_predictivecontactscore_v2,
        engagements,
      } : null,
      instantly: instantly ? {
        id:           instantly.id,
        status:       instantly.status,
        firstName:    instantly.first_name,
        lastName:     instantly.last_name,
        company:      instantly.company_name,
        jobTitle:     instantly.job_title,
        opens:        instantly.email_open_count,
        clicks:       instantly.email_click_count,
        replies:      instantly.email_reply_count,
        lastUpdate:   instantly.timestamp_updated,
        verification: instantly.verification_status,
        location:     instantly.payload?.location,
        linkedin:     instantly.payload?.linkedIn,
        industry:     instantly.payload?.industry,
        campaignId:   instantly.campaign,
      } : null,
      artiverse: artiverse ? {
        firstName:        artiverse.firstName,
        lastName:         artiverse.lastName,
        companyName:      artiverse.companyName,
        agencyName:       artiverse.agencyName,
        hasAgency:        artiverse.hasAgency,
        isPro:            artiverse.isPro,
        profileComplete:  artiverse.profileComplete,
        hasMedia:         artiverse.hasMedia,
        hasBio:           artiverse.hasBio,
        createdAt:        artiverse.createdAt,
        lastLoginAt:      artiverse.lastLoginAt,
        segment:          artiverse.segment,
      } : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
