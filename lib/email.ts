/**
 * Email sender — Nodemailer + Nominalia SMTP
 *
 * Usa SMTP_REPLY_* (Nominalia) si están definidas, fallback a SMTP_*.
 * El welcome usa /MAILS/email-bienvenida-v2.html (mobile-first con hero image).
 */
import nodemailer from 'nodemailer'
import { readFileSync } from 'fs'
import { join } from 'path'

const SMTP_HOST  = process.env.SMTP_REPLY_HOST || process.env.SMTP_HOST || 'mail.nominalia.com'
const SMTP_PORT  = parseInt(process.env.SMTP_REPLY_PORT || process.env.SMTP_PORT || '465')
const SMTP_USER  = process.env.SMTP_REPLY_USER || process.env.SMTP_USER || ''
const SMTP_PASS  = process.env.SMTP_REPLY_PASS || process.env.SMTP_PASS || ''
const FROM_NAME  = process.env.EMAIL_FROM_NAME || 'Víctor — Artiverse'
const FROM_EMAIL = SMTP_USER || 'victor@artiverse.online'

function createTransport() {
  return nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
    tls:    { rejectUnauthorized: false },
  })
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(user: {
  email:     string
  name?:     string
  planType?: string
}) {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP no configurado. Añade SMTP_REPLY_USER y SMTP_REPLY_PASS al .env'
    )
  }

  const firstName = user.name?.split(' ')[0] || 'artista'

  // v3 (mobile-first con hero generado vía fal.ai)
  const templatePath = join(process.cwd(), 'MAILS', 'email-bienvenida-v2.html')
  let html = readFileSync(templatePath, 'utf-8')
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{email\}\}/g,     user.email)
    .replace(/\{\{planType\}\}/g,  user.planType || 'Free')

  const transporter = createTransport()
  const info = await transporter.sendMail({
    from:    `${FROM_NAME} <${FROM_EMAIL}>`,
    to:      user.email,
    subject: `Bienvenido a Artiverse, ${firstName}`,
    html,
  })

  return { messageId: info.messageId, email: user.email }
}

// ─── Generic send ─────────────────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to:       string | string[]
  subject:  string
  html:     string
  from?:    string
}) {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP no configurado (SMTP_USER / SMTP_PASS)')
  }

  const transporter = createTransport()
  const info = await transporter.sendMail({
    from:    from || `${FROM_NAME} <${FROM_EMAIL}>`,
    to:      Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
  })

  return { messageId: info.messageId }
}
