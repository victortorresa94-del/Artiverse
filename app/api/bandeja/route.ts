/**
 * GET /api/bandeja
 *
 * Lee la bandeja de entrada de victor@artiverse.online vía IMAP (Nominalia).
 * Devuelve los últimos N mensajes con flags, detecta bounces / mail obsoleto.
 *
 * Vars de entorno:
 *   IMAP_HOST (default: mail.nominalia.com)
 *   IMAP_PORT (default: 993)
 *   IMAP_USER (fallback: SMTP_REPLY_USER)
 *   IMAP_PASS (fallback: SMTP_REPLY_PASS)
 *
 * Query: ?limit=50 (default 50, max 200)
 *        ?folder=INBOX (default)
 */
import { NextRequest, NextResponse } from 'next/server'
import { ImapFlow } from 'imapflow'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HOST = process.env.IMAP_HOST || 'mail.nominalia.com'
const PORT = parseInt(process.env.IMAP_PORT || '993')
const USER = process.env.IMAP_USER || process.env.SMTP_REPLY_USER || ''
const PASS = process.env.IMAP_PASS || process.env.SMTP_REPLY_PASS || ''

// Patterns para detectar bounces
const BOUNCE_FROMS = ['mailer-daemon', 'postmaster', 'no-reply', 'noreply', 'mail-delivery']
const BOUNCE_SUBJECTS = [
  /undeliver/i, /delivery (failed|status|notification)/i, /returned/i,
  /failure notice/i, /no se ha podido entregar/i, /could not be delivered/i,
  /mail delivery/i, /devuelto/i, /rebotado/i,
]

interface InboxEmail {
  uid:        number
  seq:        number
  messageId:  string
  threadId?:  string
  from_email: string
  from_name:  string
  to_emails:  string[]
  subject:    string
  date:       string
  preview:    string
  body_text:  string
  body_html:  string
  flags:      string[]
  unread:     boolean
  is_bounce:  boolean
  is_auto:    boolean
  size:       number
}

function isBounce(fromEmail: string, subject: string): boolean {
  const f = fromEmail.toLowerCase()
  if (BOUNCE_FROMS.some(p => f.includes(p))) return true
  return BOUNCE_SUBJECTS.some(rx => rx.test(subject))
}

function isAutoReply(subject: string, headers: Map<string, string>): boolean {
  if (/auto[- ]?(reply|respuesta)|out of office|fuera de oficina|vacation/i.test(subject)) return true
  const h = (headers.get('auto-submitted') || '').toLowerCase()
  if (h && h !== 'no') return true
  return false
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit  = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50')))
  const folder = searchParams.get('folder') || 'INBOX'

  if (!USER || !PASS) {
    return NextResponse.json(
      { error: 'IMAP no configurado. Falta IMAP_USER/IMAP_PASS (o SMTP_REPLY_USER/SMTP_REPLY_PASS)' },
      { status: 500 }
    )
  }

  const client = new ImapFlow({
    host:   HOST,
    port:   PORT,
    secure: PORT === 993,
    auth:   { user: USER, pass: PASS },
    logger: false,
    tls:    { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock(folder)
    try {
      const mb = client.mailbox as any
      const total = mb?.exists ?? 0
      if (total === 0) {
        return NextResponse.json({ emails: [], counts: { total: 0, unread: 0, bounces: 0 } })
      }

      const start = Math.max(1, total - limit + 1)
      const range = `${start}:*`

      const emails: InboxEmail[] = []
      let unreadCount = 0
      let bounceCount = 0

      for await (const m of client.fetch(range, {
        uid:      true,
        flags:    true,
        envelope: true,
        bodyStructure: true,
        size:     true,
        headers:  ['message-id','in-reply-to','references','auto-submitted','x-failed-recipients'],
        source:   false,
      })) {
        const env = m.envelope as any
        const fromAddr = env?.from?.[0]
        const toList   = env?.to || []
        const subject  = env?.subject || '(sin asunto)'
        const fromEmail= fromAddr?.address || ''
        const fromName = fromAddr?.name || fromEmail.split('@')[0]
        const date     = env?.date ? new Date(env.date).toISOString() : ''

        // headers
        const headerMap = new Map<string, string>()
        if (m.headers) {
          const text = m.headers.toString()
          text.split(/\r?\n/).forEach(line => {
            const i = line.indexOf(':')
            if (i > 0) headerMap.set(line.slice(0, i).toLowerCase().trim(), line.slice(i+1).trim())
          })
        }

        const bounce = isBounce(fromEmail, subject)
        const auto   = isAutoReply(subject, headerMap)
        const flags  = Array.from(m.flags || [])
        const seen   = flags.includes('\\Seen')

        if (!seen)  unreadCount++
        if (bounce) bounceCount++

        emails.push({
          uid:       m.uid as number,
          seq:       m.seq as number,
          messageId: env?.messageId || headerMap.get('message-id') || '',
          threadId:  headerMap.get('in-reply-to') || undefined,
          from_email:fromEmail,
          from_name: fromName,
          to_emails: toList.map((t: any) => t.address).filter(Boolean),
          subject,
          date,
          preview:   '',
          body_text: '',
          body_html: '',
          flags,
          unread:    !seen,
          is_bounce: bounce,
          is_auto:   auto,
          size:      m.size as number,
        })
      }

      // Ordenar por fecha desc
      emails.sort((a, b) => b.date.localeCompare(a.date))

      return NextResponse.json({
        emails,
        counts: {
          total:   emails.length,
          unread:  unreadCount,
          bounces: bounceCount,
        },
        folder,
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
