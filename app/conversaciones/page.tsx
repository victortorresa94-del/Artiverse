'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Inbox, Sparkles, Send, ChevronRight,
  Mail, Building2, Clock, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface InboxEmail {
  id:          string
  thread_id:   string
  timestamp:   string
  from_email:  string
  from_name:   string
  company:     string
  subject:     string
  preview:     string
  body_text:   string
  body_html:   string
  campaign_id: string
  is_unread:   boolean
  ai_score:    number | null
  priority:    number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function priorityBadge(score: number | null, priority: number) {
  if (priority >= 80 || (score !== null && score >= 70)) {
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>🔥 hot</span>
  }
  if (priority >= 50 || (score !== null && score >= 40)) {
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>⭐ warm</span>
  }
  return null
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EmailListItem({
  email,
  active,
  onClick,
}: {
  email: InboxEmail
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 border-b transition-all"
      style={{
        borderColor:  'var(--border)',
        background:   active ? 'var(--bg-active)' : 'transparent',
        borderLeft:   active ? '2px solid var(--blue)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {email.is_unread && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--blue)' }} />
          )}
          <span
            className="text-[13px] truncate"
            style={{ color: 'var(--text-1)', fontWeight: email.is_unread ? '600' : '400' }}
          >
            {email.from_name || email.from_email}
          </span>
        </div>
        <span className="text-[11px] shrink-0" style={{ color: 'var(--text-3)' }}>
          {relativeTime(email.timestamp)}
        </span>
      </div>

      {email.company && (
        <p className="text-[11px] mb-1 flex items-center gap-1" style={{ color: 'var(--blue)' }}>
          <Building2 size={9} />
          {email.company}
        </p>
      )}

      <p className="text-[12px] truncate mb-1.5" style={{ color: 'var(--text-2)' }}>
        {email.subject}
      </p>

      <div className="flex items-center justify-between">
        <p className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
          {email.preview}
        </p>
        {priorityBadge(email.ai_score, email.priority)}
      </div>
    </button>
  )
}

function EmailBody({ html, text }: { html: string; text: string }) {
  // Render body safely — strip external images/tracking but keep text structure
  const safeHtml = html
    .replace(/<img[^>]*tracking[^>]*>/gi, '')
    .replace(/<img[^>]*width="1"[^>]*>/gi, '')

  return (
    <div
      className="text-[14px] leading-relaxed"
      style={{ color: 'var(--text-1)' }}
    >
      <div
        className="prose prose-invert max-w-none"
        style={{ fontFamily: 'inherit' }}
        dangerouslySetInnerHTML={{ __html: safeHtml || `<p style="white-space:pre-wrap">${text}</p>` }}
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewDashboard() {
  const [emails, setEmails]       = useState<InboxEmail[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<InboxEmail | null>(null)

  // Reply state
  const [reply, setReply]         = useState('')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [sendError, setSendError] = useState('')
  const [genError, setGenError]   = useState('')

  // ── Load inbox ──────────────────────────────────────────────────────────────
  const loadInbox = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/new-dashboard/inbox')
      const data = await res.json()
      setEmails(data.emails || [])
    } catch {
      setEmails([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadInbox() }, [loadInbox])

  // Reset reply state when selecting a new email
  const selectEmail = (email: InboxEmail) => {
    setSelected(email)
    setReply('')
    setSent(false)
    setSendError('')
    setGenError('')
  }

  // ── Generate reply with Claude ──────────────────────────────────────────────
  const generateReply = async () => {
    if (!selected) return
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch('/api/new-dashboard/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: selected.from_email,
          fromName:  selected.from_name,
          company:   selected.company,
          subject:   selected.subject,
          bodyText:  selected.body_text,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error generando respuesta')
      setReply(data.reply || '')
    } catch (err: any) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // ── Send reply ──────────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!selected || !reply.trim()) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/new-dashboard/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:         selected.from_email,
          toName:     selected.from_name,
          subject:    selected.subject,
          bodyText:   reply,
          inReplyTo:  selected.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error enviando')
      setSent(true)
      // Mark as read / remove from list
      setEmails(prev => prev.map(e => e.id === selected.id ? { ...e, is_unread: false } : e))
    } catch (err: any) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  const unreadCount = emails.filter(e => e.is_unread).length

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-3">
          <Inbox size={18} style={{ color: 'var(--blue)' }} />
          <h1 className="font-bold text-[18px]" style={{ color: 'var(--text-1)' }}>
            New Dashboard
          </h1>
          {unreadCount > 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--blue)', color: '#fff' }}
            >
              {unreadCount} sin leer
            </span>
          )}
        </div>
        <button
          onClick={loadInbox}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
          style={{
            background: 'var(--bg-elevated)',
            border:     '1px solid var(--border)',
            color:      'var(--text-2)',
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Body: list + detail */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left: email list ─────────────────────────────────────────────── */}
        <div
          className="w-80 shrink-0 flex flex-col overflow-y-auto"
          style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}
        >
          {/* List header */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-3)' }}>
              Respuestas pendientes
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              {emails.length}
            </span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-3)' }} />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
              <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>Todo al día</p>
              <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>No hay respuestas pendientes</p>
            </div>
          ) : (
            emails.map(email => (
              <EmailListItem
                key={email.id}
                email={email}
                active={selected?.id === email.id}
                onClick={() => selectEmail(email)}
              />
            ))
          )}
        </div>

        {/* ── Right: email detail + reply ──────────────────────────────────── */}
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Mail size={32} style={{ color: 'var(--text-3)' }} />
            <p className="text-[14px]" style={{ color: 'var(--text-2)' }}>
              Selecciona un email para ver el contenido
            </p>
            <ChevronRight size={16} style={{ color: 'var(--text-3)' }} className="-rotate-90" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {/* Email header */}
            <div
              className="px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            >
              <h2 className="font-semibold text-[16px] mb-2" style={{ color: 'var(--text-1)' }}>
                {selected.subject}
              </h2>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>De:</span>
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>
                    {selected.from_name} &lt;{selected.from_email}&gt;
                  </span>
                </div>
                {selected.company && (
                  <div className="flex items-center gap-1.5">
                    <Building2 size={11} style={{ color: 'var(--blue)' }} />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--blue)' }}>
                      {selected.company}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock size={11} style={{ color: 'var(--text-3)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {new Date(selected.timestamp).toLocaleString('es-ES', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                {priorityBadge(selected.ai_score, selected.priority)}
              </div>
            </div>

            {/* Email body */}
            <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div
                className="rounded-xl p-5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <EmailBody html={selected.body_html} text={selected.body_text} />
              </div>
            </div>

            {/* Reply composer */}
            <div className="px-6 py-5 flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                  Responder
                </h3>
                <div className="flex items-center gap-2">
                  {genError && (
                    <span className="text-[11px]" style={{ color: 'var(--error)' }}>{genError}</span>
                  )}
                  <button
                    onClick={generateReply}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: 'var(--blue-dim)',
                      border:     '1px solid var(--blue)',
                      color:      'var(--blue)',
                      opacity:    generating ? 0.6 : 1,
                    }}
                  >
                    {generating
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Sparkles size={12} />
                    }
                    {generating ? 'Generando…' : 'Generar con IA'}
                  </button>
                </div>
              </div>

              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Escribe tu respuesta aquí, o haz clic en 'Generar con IA' para que Claude redacte una propuesta…"
                className="w-full rounded-xl p-4 text-[13px] leading-relaxed resize-none transition-all outline-none"
                rows={12}
                style={{
                  background: 'var(--bg-surface)',
                  border:     '1px solid var(--border-strong)',
                  color:      'var(--text-1)',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--blue)' }}
                onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-strong)' }}
              />

              <div className="flex items-center justify-between mt-3">
                <div>
                  {sendError && (
                    <div className="flex items-center gap-1.5" style={{ color: 'var(--error)' }}>
                      <AlertCircle size={13} />
                      <span className="text-[12px]">{sendError}</span>
                    </div>
                  )}
                  {sent && (
                    <div className="flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={13} />
                      <span className="text-[12px] font-medium">Enviado correctamente</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                    De: victor@artiverse.online · vía HubSpot
                  </p>
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim() || sent}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
                    style={{
                      background: sent
                        ? 'var(--success)'
                        : 'var(--blue)',
                      color:   '#fff',
                      opacity: (sending || !reply.trim() || sent) ? 0.6 : 1,
                      cursor:  (sending || !reply.trim() || sent) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {sending
                      ? <Loader2 size={14} className="animate-spin" />
                      : sent
                        ? <CheckCircle2 size={14} />
                        : <Send size={14} />
                    }
                    {sending ? 'Enviando…' : sent ? 'Enviado' : 'Enviar respuesta'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
