/**
 * POST /api/new-dashboard/send-reply
 *
 * Envía una respuesta de email desde victor@artiverse.online
 * y registra la actividad en HubSpot CRM.
 *
 * Body: { to, toName?, subject, bodyText, inReplyTo? }
 *
 * Vars de entorno necesarias:
 *   SMTP_REPLY_USER  — victor@artiverse.online
 *   SMTP_REPLY_PASS  — App Password de Google Workspace
 *   SMTP_REPLY_HOST  — smtp.gmail.com (por defecto)
 *   SMTP_REPLY_PORT  — 587 (por defecto)
 */
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

const SMTP_USER = process.env.SMTP_REPLY_USER || process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_REPLY_PASS || process.env.SMTP_PASS || ''
const SMTP_HOST = process.env.SMTP_REPLY_HOST || process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_REPLY_PORT || process.env.SMTP_PORT || '587')

const FROM_NAME  = 'Víctor Torres'
const FROM_EMAIL = process.env.SMTP_REPLY_USER || 'victor@artiverse.online'

// HubSpot para logging
const HS_TOKEN = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS       = 'https://api.hubapi.com'

// ─── HubSpot helpers ──────────────────────────────────────────────────────────

async function getOrCreateContact(email: string, name?: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${HS}/contacts/v1/contact/createOrUpdate/email/${encodeURIComponent(email)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: [
            { property: 'email',     value: email },
            { property: 'firstname', value: name?.split(' ')[0] || '' },
            { property: 'lastname',  value: name?.split(' ').slice(1).join(' ') || '' },
          ].filter(p => p.value),
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.vid || null
  } catch {
    return null
  }
}

async function logEmailToHubSpot(params: {
  contactVid: number
  toEmail: string
  toName?: string
  subject: string
  bodyText: string
}): Promise<{ ok: boolean; error?: string; emailId?: string }> {
  // Usa la API v3 de emails (endpoint moderno) y crea la asociacion al contacto.
  // associationTypeId 198 = "Email to Contact" (HubSpot definido).
  try {
    const html = `<div style="white-space:pre-wrap;font-family:sans-serif">${
      params.bodyText.replace(/\n/g, '<br>')
    }</div>`

    const res = await fetch(`${HS}/crm/v3/objects/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: {
          hs_timestamp:        new Date().toISOString(),
          hs_email_direction:  'EMAIL',         // outbound desde HubSpot
          hs_email_status:     'SENT',
          hs_email_subject:    params.subject,
          hs_email_text:       params.bodyText,
          hs_email_html:       html,
          hs_email_headers:    JSON.stringify({
            from: { email: FROM_EMAIL, firstName: 'Víctor', lastName: 'Torres' },
            to:   [{ email: params.toEmail, firstName: params.toName || '' }],
            cc:   [],
            bcc:  [],
          }),
        },
        associations: [
          {
            to: { id: String(params.contactVid) },
            types: [
              { associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 198 },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { ok: false, error: `${res.status} ${err.slice(0, 200)}` }
    }
    const data = await res.json()
    return { ok: true, emailId: data.id }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { to, toName, subject, bodyText, inReplyTo } = await req.json()

  if (!to || !subject || !bodyText) {
    return NextResponse.json(
      { error: 'Faltan campos: to, subject, bodyText' },
      { status: 400 }
    )
  }

  if (!SMTP_USER || !SMTP_PASS) {
    return NextResponse.json(
      {
        error: 'SMTP no configurado. Añade SMTP_REPLY_USER y SMTP_REPLY_PASS al .env.local',
        hint:  'SMTP_REPLY_USER=victor@artiverse.online / SMTP_REPLY_PASS=<App Password Google>',
      },
      { status: 500 }
    )
  }

  // ── 1. Enviar email ─────────────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
    tls:    { rejectUnauthorized: false },
  })

  // ── Firma HTML (Artiverse) ────────────────────────────────────────────────
  const SIGNATURE_HTML = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;border-top:1px solid #e5e5e5;padding-top:14px;margin-top:24px">
  <tr>
    <td style="padding-right:14px;vertical-align:top">
      <img src="https://artiverse-sigma.vercel.app/artiverse-logo.jpg" alt="Artiverse" width="46" height="46" style="display:block;border-radius:8px" />
    </td>
    <td style="vertical-align:top;border-left:2px solid #2563EB;padding-left:14px">
      <div style="font-size:15px;font-weight:700;color:#0a0a0a;line-height:1.2">Víctor Torres</div>
      <div style="font-size:11px;font-weight:600;color:#2563EB;letter-spacing:1px;text-transform:uppercase;margin-top:2px">Marketing &amp; Growth</div>
      <div style="font-size:13px;color:#444;margin-top:8px;line-height:1.5">
        <a href="mailto:victor@artiverse.online" style="color:#444;text-decoration:none">victor@artiverse.online</a><br/>
        <a href="https://artiverse.es" style="color:#2563EB;font-weight:600;text-decoration:none">artiverse.es</a>
      </div>
      <div style="font-size:11px;color:#888;margin-top:8px;font-style:italic">El futuro de las artes en vivo está aquí.</div>
    </td>
  </tr>
</table>`.trim()

  // Detectar si el bodyText ya tiene firma textual (para no duplicar)
  const hasSig = /Víctor Torres[\s\S]*Artiverse/i.test(bodyText)
  const bodyTextClean = hasSig
    ? bodyText.replace(/Víctor Torres[\s\S]*$/i, '').trim()
    : bodyText

  const htmlBody = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:640px">
${bodyTextClean
  .split('\n\n')
  .filter(Boolean)
  .map(p => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
  .join('')}
${SIGNATURE_HTML}
</div>`

  // Versión texto: limpia firma vieja y adjunta versión texto de la firma
  const textSignature = `\n\n--\nVíctor Torres\nMarketing & Growth — Artiverse\nvictor@artiverse.online · artiverse.es`
  const finalText = bodyTextClean + textSignature

  const mailOptions: nodemailer.SendMailOptions = {
    from:    `${FROM_NAME} <${FROM_EMAIL}>`,
    to:      toName ? `${toName} <${to}>` : to,
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    text:    finalText,
    html:    htmlBody,
  }

  if (inReplyTo) {
    mailOptions.inReplyTo  = inReplyTo
    mailOptions.references = inReplyTo
  }

  let messageId: string
  try {
    const info = await transporter.sendMail(mailOptions)
    messageId = info.messageId
  } catch (err: any) {
    return NextResponse.json({ error: `SMTP error: ${err.message}` }, { status: 500 })
  }

  // ── 2. Loguear en HubSpot CRM (no bloquea si falla) ────────────────────────
  let hsResult: { ok: boolean; vid?: number; emailId?: string; error?: string } = { ok: false }
  if (HS_TOKEN) {
    const vid = await getOrCreateContact(to, toName)
    if (!vid) {
      hsResult = { ok: false, error: 'No se pudo crear/obtener contacto en HubSpot' }
    } else {
      const log = await logEmailToHubSpot({
        contactVid: vid,
        toEmail:    to,
        toName,
        subject:    mailOptions.subject as string,
        bodyText,
      })
      hsResult = { ok: log.ok, vid, emailId: log.emailId, error: log.error }
    }
  }

  // ── 3. Auto-marcar conversación como "esperando respuesta" ────────────────
  try {
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host  = req.headers.get('host')
    if (host) {
      await fetch(`${proto}://${host}/api/conversaciones/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: to, status: 'esperando' }),
      })
    }
  } catch {
    // no bloquear el envío si la marca falla
  }

  return NextResponse.json({
    ok:        true,
    messageId,
    to,
    subject:   mailOptions.subject,
    hubspot:   hsResult,
  })
}
