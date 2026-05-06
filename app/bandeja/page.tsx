'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  RefreshCw, Pencil, Search, Inbox, AlertCircle, Loader2, X, ArrowLeft,
  CheckCircle2, MailX, Clock, Reply, Forward, Star, User,
} from 'lucide-react'
import ContactSheet from '@/components/ContactSheet'
import ComposeModal from '@/components/ComposeModal'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  body_text?: string
  body_html?: string
  flags:      string[]
  unread:     boolean
  is_bounce:  boolean
  is_auto:    boolean
  size:       number
  source:     'imap' | 'instantly'
  instantly_id?: string
}

interface FullEmail {
  uid:     number
  subject: string
  from:    { address?: string; name?: string } | null
  to:      Array<{ address?: string; name?: string }>
  date:    string
  text:    string
  html:    string
  attachments: Array<{ filename?: string; contentType?: string; size?: number }>
}

type Filter = 'all' | 'unread' | 'bounces' | 'imap' | 'instantly'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRel(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 7)  return d.toLocaleDateString('es-ES', { weekday: 'short' })
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
function fmtAbs(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BandejaPage() {
  const [emails, setEmails]   = useState<InboxEmail[]>([])
  const [counts, setCounts]   = useState({ total: 0, unread: 0, bounces: 0, imap: 0, instantly: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [filter, setFilter]   = useState<Filter>('all')
  const [search, setSearch]   = useState('')
  const [selectedUid, setSelectedUid] = useState<number | null>(null)
  const [fullEmail, setFullEmail]     = useState<FullEmail | null>(null)
  const [loadingFull, setLoadingFull] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeInit, setComposeInit] = useState<{ to?: string; subject?: string; body?: string }>({})
  const [contactSheetEmail, setContactSheetEmail] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/bandeja?limit=100', { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || `Error ${res.status}`)
      setEmails(d.emails || [])
      setCounts(d.counts || { total: 0, unread: 0, bounces: 0, imap: 0, instantly: 0 })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function openEmail(email: InboxEmail) {
    setSelectedUid(email.source === 'imap' ? email.uid : -1)
    setFullEmail(null); setLoadingFull(true)
    try {
      if (email.source === 'instantly') {
        // No llamamos a IMAP — el body ya viene en el email
        setFullEmail({
          uid:     0,
          subject: email.subject,
          from:    { address: email.from_email, name: email.from_name },
          to:      email.to_emails.map(a => ({ address: a })),
          date:    email.date,
          text:    email.body_text || email.preview,
          html:    email.body_html || `<pre style="white-space:pre-wrap">${email.body_text || email.preview}</pre>`,
          attachments: [],
        })
      } else {
        const res = await fetch(`/api/bandeja/${email.uid}`, { cache: 'no-store' })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error)
        setFullEmail(d)
      }
      // Marcar como leído en local
      setEmails(prev => prev.map(e => e === email ? { ...e, unread: false, flags: [...e.flags, '\\Seen'] } : e))
      if (email.unread) setCounts(c => ({ ...c, unread: Math.max(0, c.unread - 1) }))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingFull(false)
    }
  }

  function startReply() {
    if (!fullEmail) return
    setComposeInit({
      to:      fullEmail.from?.address || '',
      subject: fullEmail.subject.startsWith('Re:') ? fullEmail.subject : `Re: ${fullEmail.subject}`,
      body:    `\n\n---\nEl ${fmtAbs(fullEmail.date)} ${fullEmail.from?.name || fullEmail.from?.address} escribió:\n${fullEmail.text.split('\n').map(l => '> ' + l).join('\n')}`,
    })
    setComposeOpen(true)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return emails.filter(e => {
      if (filter === 'unread'    && !e.unread)             return false
      if (filter === 'bounces'   && !e.is_bounce)          return false
      if (filter === 'imap'      && e.source !== 'imap')   return false
      if (filter === 'instantly' && e.source !== 'instantly') return false
      if (q && !(
        e.subject.toLowerCase().includes(q) ||
        e.from_email.toLowerCase().includes(q) ||
        e.from_name.toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [emails, filter, search])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Lista izquierda */}
      <div
        className={`${selectedUid ? 'hidden' : 'flex'} md:flex w-full md:w-[400px] flex-col shrink-0`}
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Bandeja</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setComposeInit({}); setComposeOpen(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={{ background: 'var(--blue)', color: '#fff' }}
              >
                <Pencil size={11} /> Redactar
              </button>
              <button
                onClick={load}
                disabled={loading}
                className="p-1.5 rounded-md disabled:opacity-50"
                style={{ color: 'var(--text-2)' }}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              </button>
            </div>
          </div>

          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              type="text"
              placeholder="Buscar…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md text-xs outline-none"
              style={{ background: 'var(--bg-base)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1 flex-wrap">
            <FilterPill active={filter === 'all'}       label="Todos"     count={counts.total}     color="var(--text-2)" onClick={() => setFilter('all')} />
            <FilterPill active={filter === 'unread'}    label="No leídos" count={counts.unread}    color="#60A5FA"       onClick={() => setFilter('unread')} />
            <FilterPill active={filter === 'instantly'} label="Instantly" count={counts.instantly} color="#F59E0B"       onClick={() => setFilter('instantly')} />
            <FilterPill active={filter === 'imap'}      label="IMAP"      count={counts.imap}      color="#22C55E"       onClick={() => setFilter('imap')} />
            <FilterPill active={filter === 'bounces'}   label="Bounces"   count={counts.bounces}   color="#EF4444"       onClick={() => setFilter('bounces')} />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading && emails.length === 0 && (
            <div className="p-6 text-center text-xs" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={14} className="animate-spin mx-auto mb-2" />
              Cargando bandeja vía IMAP…
            </div>
          )}
          {error && (
            <div className="p-3 text-xs" style={{ color: '#FCA5A5' }}>
              {error}
              <p className="mt-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
                ¿Faltan IMAP_USER / IMAP_PASS / IMAP_HOST en Vercel? Por defecto usa SMTP_REPLY_USER/PASS y mail.nominalia.com:993.
              </p>
            </div>
          )}
          {!loading && filtered.length === 0 && !error && (
            <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>
              <Inbox size={20} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Sin emails en este filtro</p>
            </div>
          )}
          {filtered.map((e, idx) => (
            <EmailRow
              key={e.source === 'imap' ? `imap-${e.uid}` : `inst-${e.instantly_id}-${idx}`}
              email={e}
              active={selectedUid === (e.source === 'imap' ? e.uid : -1) && fullEmail?.subject === e.subject}
              onClick={() => openEmail(e)}
            />
          ))}
        </div>
      </div>

      {/* Vista derecha */}
      <div className={`${selectedUid ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0`}>
        {!selectedUid ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
            <div className="text-center">
              <Inbox size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecciona un email</p>
            </div>
          </div>
        ) : loadingFull ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-2)' }}>
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">Cargando email…</span>
          </div>
        ) : fullEmail && (
          <>
            <div
              className="px-4 sm:px-6 py-3 sm:py-4 flex items-start gap-3"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            >
              <button
                onClick={() => { setSelectedUid(null); setFullEmail(null) }}
                className="md:hidden p-1.5 rounded-md shrink-0"
                style={{ color: 'var(--text-2)' }}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-bold mb-1" style={{ color: 'var(--text-1)' }}>
                  {fullEmail.subject || '(sin asunto)'}
                </h2>
                <button
                  onClick={() => fullEmail.from?.address && setContactSheetEmail(fullEmail.from.address)}
                  className="flex items-center gap-2 text-xs hover:underline"
                  style={{ color: 'var(--text-2)' }}
                >
                  <User size={11} />
                  <span className="font-medium" style={{ color: 'var(--text-1)' }}>
                    {fullEmail.from?.name || fullEmail.from?.address}
                  </span>
                  <span style={{ color: 'var(--text-3)' }}>{fullEmail.from?.address}</span>
                </button>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                  {fmtAbs(fullEmail.date)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={startReply}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{ background: 'var(--blue)', color: '#fff' }}
                >
                  <Reply size={11} /> Responder
                </button>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {fullEmail.html ? (
                <div
                  className="email-body max-w-3xl mx-auto"
                  style={{ color: 'var(--text-1)' }}
                  dangerouslySetInnerHTML={{ __html: fullEmail.html }}
                />
              ) : (
                <pre
                  className="whitespace-pre-wrap text-sm max-w-3xl mx-auto"
                  style={{ color: 'var(--text-1)', fontFamily: 'inherit' }}
                >
                  {fullEmail.text}
                </pre>
              )}
            </div>
          </>
        )}
      </div>

      {/* Compose modal */}
      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        initialTo={composeInit.to}
        initialSubject={composeInit.subject}
        initialBody={composeInit.body}
      />

      {/* Contact sheet */}
      <ContactSheet
        email={contactSheetEmail}
        onClose={() => setContactSheetEmail(null)}
      />
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function FilterPill({
  active, label, count, color, onClick,
}: { active: boolean; label: string; count: number; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-all"
      style={{
        background: active ? color + '25' : 'transparent',
        color:      active ? color        : 'var(--text-2)',
        border:     `1px solid ${active ? color + '50' : 'var(--border)'}`,
      }}
    >
      {label}
      <span className="text-[9px] font-bold px-1 rounded" style={{ background: active ? color + '30' : 'var(--bg-elevated)' }}>
        {count}
      </span>
    </button>
  )
}

function EmailRow({
  email, active, onClick,
}: { email: InboxEmail; active: boolean; onClick: () => void }) {
  const initial = (email.from_name || email.from_email).charAt(0).toUpperCase()
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 transition-all flex items-start gap-2.5"
      style={{
        background:   active ? 'var(--bg-active)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        borderLeft:   active ? '3px solid var(--blue)'
                    : email.unread ? '3px solid #60A5FA'
                    : '3px solid transparent',
        opacity: email.unread ? 1 : 0.85,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div
        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold mt-0.5"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)' }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-sm truncate ${email.unread ? 'font-semibold' : 'font-medium'}`}
            style={{ color: 'var(--text-1)' }}
          >
            {email.from_name || email.from_email.split('@')[0]}
          </span>
          <span className="text-[10px] shrink-0 ml-auto" style={{ color: 'var(--text-3)' }}>
            {fmtRel(email.date)}
          </span>
        </div>
        <p className={`text-xs truncate ${email.unread ? 'font-medium' : ''}`} style={{ color: 'var(--text-1)' }}>
          {email.subject || '(sin asunto)'}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[9px] px-1 py-0.5 rounded font-semibold uppercase tracking-wider"
                style={{
                  background: email.source === 'instantly' ? '#F59E0B25' : '#22C55E25',
                  color:      email.source === 'instantly' ? '#F59E0B' : '#22C55E',
                }}>
            {email.source}
          </span>
          {email.is_bounce && (
            <span className="flex items-center gap-1 text-[9px] px-1 py-0.5 rounded font-semibold"
                  style={{ background: '#EF444425', color: '#EF4444' }}>
              <MailX size={8} /> BOUNCE
            </span>
          )}
          {email.is_auto && (
            <span className="text-[9px] px-1 py-0.5 rounded font-semibold"
                  style={{ background: '#94A3B825', color: '#94A3B8' }}>
              AUTO
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
