// HubSpot — Service Key authentication (recomendado por HubSpot desde 2025)
// Ruta en HubSpot: Configuración → Integraciones → Aplicaciones privadas
//   → clic "Usar las claves de servicio" → generar clave
// Token format: cualquier Bearer token que HubSpot emita (pat-eu1-..., pat-na1-..., etc.)
// Pega el token en .env.local como HUBSPOT_API_KEY=<tu_clave>

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY || ''
const HS_BASE = 'https://api.hubapi.com'

function hsHeaders() {
  return {
    Authorization: `Bearer ${HUBSPOT_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function syncContactToHubspot(contact: any) {
  const payload = {
    properties: {
      email:              contact.email          || '',
      firstname:          contact.firstName       || '',
      lastname:           contact.lastName        || '',
      company:            contact.companyName     || '',
      phone:              contact.phone           || '',
      city:               contact.city            || '',
      instantly_status:   contact.status          || '',
      instantly_campaign: contact.campaign_name   || '',
      lifecyclestage:     mapStatusToLifecycle(contact.status),
    },
  }

  const res = await fetch(`${HS_BASE}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: hsHeaders(),
    body: JSON.stringify(payload),
  })

  if (res.status === 409) {
    // Contact already exists → PATCH update
    const errData = await res.json()
    const match = errData?.message?.match(/\d+/)
    const existingId = match ? match[0] : null
    if (!existingId) throw new Error('Contact exists but could not extract ID from HubSpot error')
    return patchContact(existingId, payload.properties)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`HubSpot ${res.status}: ${err?.message || res.statusText}`)
  }

  return res.json()
}

export async function patchContact(id: string, properties: Record<string, string>) {
  const res = await fetch(`${HS_BASE}/crm/v3/objects/contacts/${id}`, {
    method: 'PATCH',
    headers: hsHeaders(),
    body: JSON.stringify({ properties }),
  })
  if (!res.ok) throw new Error(`HubSpot PATCH ${res.status}: ${res.statusText}`)
  return res.json()
}

// ─── Lists ────────────────────────────────────────────────────────────────────

export async function getHubSpotLists() {
  const res = await fetch(`${HS_BASE}/contacts/v1/lists?count=100`, {
    headers: hsHeaders(),
  })
  if (!res.ok) throw new Error(`HubSpot lists ${res.status}: ${res.statusText}`)
  return res.json()
}

export async function createStaticList(name: string, emails: string[] = []) {
  // 1. Create list
  const listRes = await fetch(`${HS_BASE}/contacts/v1/lists`, {
    method: 'POST',
    headers: hsHeaders(),
    body: JSON.stringify({ name, dynamic: false }),
  })
  if (!listRes.ok) throw new Error(`HubSpot createList ${listRes.status}: ${listRes.statusText}`)
  const list = await listRes.json()

  // 2. Add contacts by email (if provided)
  if (emails.length > 0) {
    await fetch(`${HS_BASE}/contacts/v1/lists/${list.listId}/add`, {
      method: 'POST',
      headers: hsHeaders(),
      body: JSON.stringify({ emails }),
    })
  }

  return { listId: list.listId, name }
}

// ─── Token validation ─────────────────────────────────────────────────────────

export async function validateToken(): Promise<{ valid: boolean; portal?: string; error?: string }> {
  if (!HUBSPOT_TOKEN) return { valid: false, error: 'Token no configurado en .env.local' }

  try {
    const res = await fetch(`${HS_BASE}/crm/v3/objects/contacts?limit=1`, {
      headers: hsHeaders(),
    })

    if (res.status === 401) return { valid: false, error: 'Token inválido o expirado' }
    if (res.status === 403) return { valid: false, error: 'Sin permisos — revisa los ámbitos de la clave' }
    if (!res.ok) return { valid: false, error: `Error ${res.status}` }

    // Try to get portal info
    const meRes = await fetch(`${HS_BASE}/integrations/v1/me`, { headers: hsHeaders() })
    const me = meRes.ok ? await meRes.json() : {}

    return { valid: true, portal: me.hub_id?.toString() || 'portal' }
  } catch (e: any) {
    return { valid: false, error: e.message }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStatusToLifecycle(status: string): string {
  const s = (status || '').toLowerCase()
  if (s.includes('replied')) return 'lead'
  return 'subscriber'
}
