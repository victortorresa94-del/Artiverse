/**
 * Email sender — Nodemailer + Google Workspace SMTP
 *
 * Envía desde victor@artiverse.es usando el SMTP de Google Workspace.
 * HubSpot se usa sólo como CRM (upsert contacto + lista).
 * El plan Standard de HubSpot no incluye API de envío programático.
 *
 * Variables de entorno necesarias:
 *   SMTP_USER  — victor@artiverse.es
 *   SMTP_PASS  — App Password de Google (16 caracteres, sin espacios)
 *              → Google Account › Seguridad › Verificación en 2 pasos › Contraseñas de aplicación
 *   SMTP_HOST  — smtp.gmail.com  (por defecto)
 *   SMTP_PORT  — 587             (por defecto, STARTTLS)
 */
import nodemailer from 'nodemailer'
import { readFileSync } from 'fs'
import { join } from 'path'

const SMTP_HOST  = process.env.SMTP_HOST  || 'smtp.gmail.com'
const SMTP_PORT  = parseInt(process.env.SMTP_PORT  || '587')
const SMTP_USER  = process.env.SMTP_USER  || ''
const SMTP_PASS  = process.env.SMTP_PASS  || ''
const FROM_NAME  = process.env.EMAIL_FROM_NAME || 'Víctor de Artiverse'
const FROM_EMAIL = process.env.EMAIL_FROM      || 'victor@artiverse.es'

function createTransport() {
  return nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
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
      'SMTP no configurado. Añade SMTP_USER y SMTP_PASS al .env.local\n' +
      'SMTP_USER=victor@artiverse.es\n' +
      'SMTP_PASS=<contraseña de aplicación de Google>'
    )
  }

  const firstName = user.name?.split(' ')[0] || 'artista'

  // Carga la plantilla HTML y personaliza tokens
  const templatePath = join(process.cwd(), 'email-bienvenida.html')
  let html = readFileSync(templatePath, 'utf-8')

  html = html
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{email\}\}/g,     user.email)
    .replace(/\{\{planType\}\}/g,  user.planType || 'Free')
    .replace(
      './public/artiverse-logo.jpg',
      'https://artiverse-sigma.vercel.app/artiverse-logo.jpg'
    )

  const transporter = createTransport()
  const info = await transporter.sendMail({
    from:    `${FROM_NAME} <${FROM_EMAIL}>`,
    to:      user.email,
    subject: `Bienvenido/a a Artiverse${user.name ? `, ${firstName}` : ''} 🎶`,
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
