/**
 * POST /api/bandeja/compose
 *
 * Envía un email "nuevo" (no respuesta) desde el compose tipo Gmail.
 * Reutiliza la misma firma y SMTP que /api/new-dashboard/send-reply.
 *
 * Body: { to: string|string[], subject, bodyText, cc?, bcc? }
 */
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

const SMTP_USER = process.env.SMTP_REPLY_USER || process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_REPLY_PASS || process.env.SMTP_PASS || ''
const SMTP_HOST = process.env.SMTP_REPLY_HOST || process.env.SMTP_HOST || 'mail.nominalia.com'
const SMTP_PORT = parseInt(process.env.SMTP_REPLY_PORT || process.env.SMTP_PORT || '465')

const FROM_NAME  = 'Víctor Torres'
const FROM_EMAIL = process.env.SMTP_REPLY_USER || 'victor@artiverse.online'

const HS_TOKEN = process.env.HUBSPOT_SERVICE_KEY || process.env.HUBSPOT_API_KEY || ''
const HS       = 'https://api.hubapi.com'

// ─── Firma (reusada) ──────────────────────────────────────────────────────────

const SIGNATURE_HTML = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;border-top:1px solid #e5e5e5;padding-top:12px;margin-top:22px">
  <tr>
    <td style="padding-right:14px;vertical-align:middle">
      <img src="https://artiverse-sigma.vercel.app/artiverse-logo.jpg" alt="Artiverse" width="44" height="44" style="display:block;border-radius:8px" />
    </td>
    <td style="vertical-align:middle">
      <div style="font-size:14px;font-weight:700;color:#0a0a0a;line-height:1.3">Víctor Torres <span style="color:#888;font-weight:400">·</span> <span style="color:#2563EB;font-weight:600">Artiverse</span></div>
      <div style="font-size:10px;font-weight:600;color:#2563EB;letter-spacing:1px;text-transform:uppercase;margin-top:2px">Marketing &amp; Growth</div>
      <div style="font-size:12px;color:#444;margin-top:6px;line-height:1.4">
        <a href="mailto:victor@artiverse.online" style="color:#444;text-decoration:none">victor@artiverse.online</a>
        <span style="color:#bbb"> · </span>
        <a href="https://artiverse.es" style="color:#2563EB;font-weight:600;text-decoration:none">artiverse.es</a>
      </div>
    </td>
  </tr>
</table>`.trim()

const TEXT_SIGNATURE = `\n\n--\nVíctor Torres\nMarketing & Growth — Artiverse\nvictor@artiverse.online · artiverse.es`

// ─── HubSpot logging (idem send-reply) ────────────────────────────────────────

async function getOrCreateContact(email: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${HS}/contacts/v1/contact/createOrUpdate/email/${encodeURIComponent(email)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: [{ property: 'email', value: email }],
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

async function logEmail(vid: number, to: string, subject: string, bodyText: string) {
  try {
    const html = `<div style="white-space:pre-wrap;font-family:sans-serif">${bodyText.replace(/\n/g, '<br>')}</div>`
    await fetch(`${HS}/crm/v3/objects/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: {
          hs_timestamp:        new Date().toISOString(),
          hs_email_direction:  'EMAIL',
          hs_email_status:     'SENT',
          hs_email_subject:    subject,
          hs_email_text:       bodyText,
          hs_email_html:       html,
          hs_email_headers: JSON.stringify({
            from: { email: FROM_EMAIL, firstName: 'Víctor', lastName: 'Torres' },
            to:   [{ email: to }],
          }),
        },
        associations: [
          { to: { id: String(vid) }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 198 }] },
        ],
      }),
    })
  } catch {}
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { to, subject, bodyText, cc, bcc } = await req.json()
  const recipients: string[] = Array.isArray(to) ? to : (to ? [to] : [])
  if (recipients.length === 0 || !subject || !bodyText) {
    return NextResponse.json({ error: 'to, subject y bodyText requeridos' }, { status: 400 })
  }
  if (!SMTP_USER || !SMTP_PASS) {
    return NextResponse.json({ error: 'SMTP no configurado' }, { status: 500 })
  }

  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
    tls:    { rejectUnauthorized: false },
  })

  const htmlBody = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:640px">
${bodyText
  .split('\n\n')
  .filter(Boolean)
  .map((p: string) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
  .join('')}
${SIGNATURE_HTML}
</div>`

  try {
    const info = await transporter.sendMail({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      recipients.join(', '),
      cc:      cc ? (Array.isArray(cc)  ? cc.join(', ')  : cc)  : undefined,
      bcc:     bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
      subject,
      text:    bodyText + TEXT_SIGNATURE,
      html:    htmlBody,
    })

    // Log en HubSpot por cada destinatario
    if (HS_TOKEN) {
      for (const r of recipients) {
        const vid = await getOrCreateContact(r)
        if (vid) await logEmail(vid, r, subject, bodyText)
      }
    }

    return NextResponse.json({
      ok:        true,
      messageId: info.messageId,
      to:        recipients,
      subject,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `SMTP: ${err.message}` }, { status: 500 })
  }
}
