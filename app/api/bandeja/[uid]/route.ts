/**
 * GET /api/bandeja/[uid]
 *
 * Devuelve el cuerpo completo (text + html) de un email concreto por UID.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const HOST = process.env.IMAP_HOST || 'mail.nominalia.com'
const PORT = parseInt(process.env.IMAP_PORT || '993')
const USER = process.env.IMAP_USER || process.env.SMTP_REPLY_USER || ''
const PASS = process.env.IMAP_PASS || process.env.SMTP_REPLY_PASS || ''

export async function GET(req: NextRequest, { params }: { params: { uid: string } }) {
  const uid = parseInt(params.uid)
  const folder = new URL(req.url).searchParams.get('folder') || 'INBOX'

  if (!uid || !USER || !PASS) {
    return NextResponse.json({ error: 'UID o credenciales IMAP faltan' }, { status: 400 })
  }

  const client = new ImapFlow({
    host: HOST, port: PORT, secure: PORT === 993,
    auth: { user: USER, pass: PASS },
    logger: false, tls: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock(folder)
    try {
      const m = await client.fetchOne(uid as any, { source: true, envelope: true, flags: true }, { uid: true })
      if (!m || !m.source) {
        return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
      }

      const parsed = await simpleParser(m.source as any)

      // Marcar como leído
      try { await client.messageFlagsAdd(uid as any, ['\\Seen'], { uid: true }) } catch {}

      return NextResponse.json({
        uid,
        subject:   parsed.subject || '',
        from:      parsed.from?.value?.[0] || null,
        to:        parsed.to ? (Array.isArray(parsed.to) ? parsed.to.flatMap(t => t.value) : parsed.to.value) : [],
        date:      parsed.date?.toISOString() || '',
        text:      parsed.text || '',
        html:      parsed.html || (parsed.textAsHtml || ''),
        attachments: (parsed.attachments || []).map(a => ({
          filename:    a.filename,
          contentType: a.contentType,
          size:        a.size,
        })),
      })
    } finally {
      lock.release()
    }
  } catch (err: any) {
    return NextResponse.json({ error: `IMAP: ${err.message}` }, { status: 500 })
  } finally {
    try { await client.logout() } catch {}
  }
}
