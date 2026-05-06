/**
 * POST /api/welcome/send
 *
 * Envía el email de bienvenida v3 a un destinatario.
 * Body: { to: string, firstName?: string, test?: boolean }
 *
 * No registra en HubSpot si test=true (modo prueba).
 */
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const SMTP_USER = process.env.SMTP_REPLY_USER || process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_REPLY_PASS || process.env.SMTP_PASS || ''
const SMTP_HOST = process.env.SMTP_REPLY_HOST || process.env.SMTP_HOST || 'mail.nominalia.com'
const SMTP_PORT = parseInt(process.env.SMTP_REPLY_PORT || process.env.SMTP_PORT || '465')

const FROM_NAME  = 'Víctor — Artiverse'
const FROM_EMAIL = process.env.SMTP_REPLY_USER || 'victor@artiverse.online'

export async function POST(req: NextRequest) {
  const { to, firstName, test } = await req.json()
  if (!to) return NextResponse.json({ error: 'to requerido' }, { status: 400 })
  if (!SMTP_USER || !SMTP_PASS) {
    return NextResponse.json({ error: 'SMTP no configurado' }, { status: 500 })
  }

  let html: string
  try {
    html = readFileSync(
      join(process.cwd(), 'MAILS', 'email-bienvenida-v2.html'),
      'utf-8'
    )
      .replace(/\{\{firstName\}\}/g, firstName || to.split('@')[0])
      .replace(/\{\{email\}\}/g, to)
      .replace(/\{\{unsubscribe_url\}\}/g, `https://artiverse.es/unsubscribe?email=${encodeURIComponent(to)}`)
  } catch (e: any) {
    return NextResponse.json({ error: `No pude leer el HTML: ${e.message}` }, { status: 500 })
  }

  // Versión texto plano (fallback)
  const text = `Hola ${firstName || 'amigo'},

Tu lugar es aquí y ahora.

Te has unido a la plataforma que está conectando a las compañías de danza, teatro y música con los programadores de toda España.

¿Y ahora qué? En 3 pasos tu perfil estará listo:
1. Completa tu perfil — foto, bio, vídeo, ficha técnica
2. Explora oportunidades — licitaciones y convocatorias centralizadas
3. Conecta directamente — mensajería interna sin intermediarios

Completar mi perfil → https://artiverse.es

¿Tienes preguntas? Escríbeme directamente a victor@artiverse.online y te ayudo.

Víctor — Marketing & Growth, Artiverse
artiverse.es`

  try {
    const transporter = nodemailer.createTransport({
      host:   SMTP_HOST,
      port:   SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth:   { user: SMTP_USER, pass: SMTP_PASS },
      tls:    { rejectUnauthorized: false },
    })

    const subject = test
      ? `[TEST] Bienvenido a Artiverse, ${firstName || ''}`.trim()
      : `Bienvenido a Artiverse, ${firstName || ''}`.trim()

    const info = await transporter.sendMail({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    })

    return NextResponse.json({
      ok:        true,
      messageId: info.messageId,
      to,
      subject,
      test:      !!test,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `SMTP: ${err.message}` }, { status: 500 })
  }
}
