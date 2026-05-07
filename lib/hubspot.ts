// HubSpot — Service Key auth (pat-eu1-...)
// Lee HUBSPOT_SERVICE_KEY primero (nuevo), HUBSPOT_API_KEY como fallback (legacy)
// Usa API v1 para contacts (createOrUpdate) — funciona con los scopes actuales
// API v3 contacts/read requiere scopes extra de privacidad — no lo usamos

const TOKEN = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS = 'https://api.hubapi.com'

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// ─── Token validation ──────────────────────────────────────────────────────────

export async function validateToken(): Promise<{ valid: boolean; portal?: string; error?: string }> {
  if (!TOKEN) return { valid: false, error: 'Token no configurado' }
  try {
    const res = await fetch(`${HS}/account-info/v3/details`, { headers: headers() })
    if (!res.ok) return { valid: false, error: `Error ${res.status}` }
    const d = await res.json()
    return { valid: true, portal: d.portalId?.toString() }
  } catch (e: any) {
    return { valid: false, error: e.message }
  }
}

// ─── Contacts (v1 createOrUpdate — works with current scopes) ─────────────────

/**
 * Crea o actualiza un contacto en HubSpot por email.
 * Usa /contacts/v1/contact/createOrUpdate/email/:email (upsert nativo).
 */
export async function upsertContact(contact: {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  phone?: string
  city?: string
  status?: string
  campaign?: string
}) {
  const properties = [
    { property: 'email',             value: contact.email      || '' },
    { property: 'firstname',         value: contact.firstName  || '' },
    { property: 'lastname',          value: contact.lastName   || '' },
    { property: 'company',           value: contact.company    || '' },
    { property: 'phone',             value: contact.phone      || '' },
    { property: 'city',              value: contact.city       || '' },
    { property: 'instantly_status',  value: contact.status     || '' },
    { property: 'instantly_campaign',value: contact.campaign   || '' },
    { property: 'lifecyclestage',    value: mapLifecycle(contact.status) },
  ].filter(p => p.value)

  const res = await fetch(
    `${HS}/contacts/v1/contact/createOrUpdate/email/${encodeURIComponent(contact.email)}`,
    { method: 'POST', headers: headers(), body: JSON.stringify({ properties }) }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`HubSpot upsert ${res.status}: ${err?.message || res.statusText}`)
  }

  const data = await res.json()
  return { vid: data.vid, isNew: data.isNew }
}

// Alias para compatibilidad con código existente que llama a syncContactToHubspot
export async function syncContactToHubspot(contact: any) {
  return upsertContact({
    email:     contact.email,
    firstName: contact.firstName,
    lastName:  contact.lastName,
    company:   contact.companyName,
    phone:     contact.phone,
    city:      contact.city,
    status:    contact.status,
    campaign:  contact.campaign_name,
  })
}

// ─── Lists ─────────────────────────────────────────────────────────────────────

export async function getLists(): Promise<Array<{ id: string; name: string; count: number }>> {
  const res = await fetch(`${HS}/contacts/v1/lists?count=250`, { headers: headers() })
  if (!res.ok) throw new Error(`HubSpot getLists ${res.status}`)
  const d = await res.json()
  return (d.lists || []).map((l: any) => ({
    id:    String(l.listId),
    name:  l.name,
    count: l.metaData?.size || 0,
  }))
}

export async function createList(name: string, emails: string[] = []) {
  // 1. Create static list
  const res = await fetch(`${HS}/contacts/v1/lists`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name, dynamic: false }),
  })
  if (!res.ok) throw new Error(`HubSpot createList ${res.status}: ${res.statusText}`)
  const list = await res.json()
  const listId = list.listId

  // 2. Upsert each email as contact, then add to list
  if (emails.length > 0) {
    const vids: number[] = []
    for (const email of emails) {
      try {
        const c = await upsertContact({ email })
        vids.push(c.vid)
      } catch { /* skip invalid emails */ }
    }
    if (vids.length > 0) {
      await fetch(`${HS}/contacts/v1/lists/${listId}/add`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ vids }),
      })
    }
  }

  return { listId: String(listId), name }
}

export async function addContactsToList(listId: string, emails: string[]) {
  const vids: number[] = []
  for (const email of emails) {
    try {
      const c = await upsertContact({ email })
      vids.push(c.vid)
    } catch { /* skip */ }
  }
  if (vids.length === 0) return { updated: 0 }

  const res = await fetch(`${HS}/contacts/v1/lists/${listId}/add`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ vids }),
  })
  if (!res.ok) throw new Error(`HubSpot addToList ${res.status}`)
  const d = await res.json()
  return { updated: d.updated?.length || 0 }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mapLifecycle(status?: string): string {
  const s = (status || '').toLowerCase()
  if (s.includes('replied'))  return 'lead'
  if (s.includes('opened') || s.includes('clicked')) return 'subscriber'
  return 'subscriber'
}

// Legacy export for backwards compatibility
export { getLists as getHubSpotLists }
