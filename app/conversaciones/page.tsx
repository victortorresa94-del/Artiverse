'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  RefreshCw, Sparkles, Send, X, Loader2, ArrowLeft,
  Inbox as InboxIcon, Clock, CheckCircle2, ThumbsDown, MailX,
  ArrowRight, GitBranch, MessageCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ConvStatus = 'pendiente' | 'esperando' | 'cerrada' | 'no_interesado' | 'mail_obsoleto'

interface ConvMessage {
  id:        string
  direction: 'in' | 'out'
  timestamp: string
  from_email:string
  from_name: string
  to_email:  string
  subject:   string
  body_text: string
  body_html: string
  source:    'instantly' | 'hubspot'
  step?:     number
}

interface Conversation {
  thread_id:        string
  contact_email:    string
  contact_name:     string
  company:          string
  messages:         ConvMessage[]
  last_in_at:       string
  last_out_at:      string
  last_activity_at: string
  status:           ConvStatus
  has_inbound:      boolean
  unread:           boolean
  ai_score:         number
}

interface ApiResponse {
  conversations: Conversation[]
  counts:        Record<ConvStatus | 'total', number>
}

// ─── Status meta ──────────────────────────────────────────────────────────────

const STATUS_META: Record<ConvStatus, { label: string; color: string; icon: React.ElementType }> = {
  pendiente:     { label: 'Pendiente',         color: '#F59E0B', icon: InboxIcon },
  esperando:     { label: 'Esperando respuesta', color: '#60A5FA', icon: Clock },
  cerrada:       { label: 'Cerrada',           color: '#22C55E', icon: CheckCircle2 },
  no_interesado: { label: 'No interesado',     color: '#94A3B8', icon: ThumbsDown },
  mail_obsoleto: { label: 'Mail obsoleto',     color: '#EF4444', icon: MailX },
}

const FUNNEL_PHASES = [
  { id: 'interesado',    label: 'Interesado' },
  { id: 'no_interesado', label: 'No interesado' },
  { id: '__auto__',      label: 'Auto' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRel(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)    return 'ahora'
  if (m < 60)   return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function fmtAbs(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConversacionesPage() {
  const [data, setData]         = useState<ApiResponse | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filter, setFilter]     = useState<ConvStatus | 'all'>('pendiente')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  // Reply state
  const [reply, setReply]         = useState('')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending]       = useState(false)
  const [feedback, setFeedback]     = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/conversaciones', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const d = await res.json()
      setData(d)
      // Auto-seleccionar primera (solo desktop — mobile usa el listado primero)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      if (!selected && !isMobile) {
        const next = d.conversations.find((c: Conversation) => c.status === 'pendiente') || d.conversations[0]
        if (next) setSelected(next.thread_id)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredConvs = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.conversations
      .filter(c => filter === 'all' || c.status === filter)
      .filter(c => !q ||
        c.contact_email.toLowerCase().includes(q) ||
        c.contact_name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.messages.some(m => m.subject.toLowerCase().includes(q) || m.body_text.toLowerCase().includes(q))
      )
  }, [data, filter, search])

  const currentConv = useMemo(
    () => data?.conversations.find(c => c.thread_id === selected) || null,
    [data, selected]
  )

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!currentConv) return
    const lastIn = [...currentConv.messages].reverse().find(m => m.direction === 'in')
    if (!lastIn) {
      setFeedback({ type: 'err', msg: 'Esta conversación no tiene mensaje entrante para responder.' })
      return
    }
    setGenerating(true); setFeedback(null)
    try {
      const res = await fetch('/api/new-dashboard/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: lastIn.from_email,
          fromName:  currentConv.contact_name,
          company:   currentConv.company,
          subject:   lastIn.subject,
          bodyText:  lastIn.body_text,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || `Error ${res.status}`)
      setReply(d.reply || '')
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    } finally {
      setGenerating(false)
    }
  }

  async function handleSend() {
    if (!currentConv || !reply.trim()) return
    const lastIn = [...currentConv.messages].reverse().find(m => m.direction === 'in')
    setSending(true); setFeedback(null)
    try {
      const res = await fetch('/api/new-dashboard/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:        currentConv.contact_email,
          toName:    currentConv.contact_name,
          subject:   lastIn?.subject || 'Sobre Artiverse',
          bodyText:  reply,
          inReplyTo: lastIn?.id,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || `Error ${res.status}`)
      setFeedback({ type: 'ok', msg: 'Enviado. Marcado como esperando respuesta.' })
      setReply('')
      await load()
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    } finally {
      setSending(false)
    }
  }

  async function changeStatus(newStatus: ConvStatus) {
    if (!currentConv) return
    const prevStatus = currentConv.status
    setFeedback(null)

    // Optimistic update local
    setData(prev => prev ? {
      ...prev,
      conversations: prev.conversations.map(c =>
        c.thread_id === currentConv.thread_id ? { ...c, status: newStatus } : c
      ),
    } : prev)

    try {
      const res = await fetch('/api/conversaciones/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentConv.contact_email, status: newStatus }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || `Error ${res.status}`)
      setFeedback({
        type: 'ok',
        msg: `Estado actualizado a "${newStatus}". HubSpot puede tardar unos segundos en reflejarlo en próximas cargas.`,
      })
    } catch (e: any) {
      // Revert
      setData(prev => prev ? {
        ...prev,
        conversations: prev.conversations.map(c =>
          c.thread_id === currentConv.thread_id ? { ...c, status: prevStatus } : c
        ),
      } : prev)
      setFeedback({ type: 'err', msg: `Error al cambiar estado: ${e.message}` })
    }
  }

  async function moveFunnel(phase: string) {
    if (!currentConv) return
    try {
      await fetch('/api/funnel/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentConv.contact_email, phase }),
      })
      setFeedback({ type: 'ok', msg: `Movido a fase: ${phase === '__auto__' ? 'auto' : phase}` })
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // En mobile: si hay seleccionada, mostrar solo el thread; si no, solo la lista
  const showListMobile   = !selected
  const showThreadMobile = !!selected

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Left sidebar — list */}
      <div
        className={`${showListMobile ? 'flex' : 'hidden'} md:flex w-full md:w-[360px] flex-col shrink-0`}
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Conversaciones</h1>
            <button
              onClick={load}
              disabled={loading}
              className="p-1.5 rounded-md transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar contacto, asunto, contenido…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md text-xs outline-none mb-2.5"
            style={{ background: 'var(--bg-base)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
          />

          {/* Status filters */}
          <div className="flex gap-1 flex-wrap">
            <FilterPill
              active={filter === 'all'}
              label="Todas"
              count={data?.counts.total || 0}
              color="var(--text-2)"
              onClick={() => setFilter('all')}
            />
            {(['pendiente', 'esperando', 'cerrada', 'no_interesado', 'mail_obsoleto'] as ConvStatus[]).map(s => {
              const meta = STATUS_META[s]
              return (
                <FilterPill
                  key={s}
                  active={filter === s}
                  label={meta.label}
                  count={data?.counts[s] || 0}
                  color={meta.color}
                  onClick={() => setFilter(s)}
                />
              )
            })}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && !data && (
            <div className="p-6 text-center" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={16} className="animate-spin mx-auto mb-2" />
              <p className="text-xs">Cargando…</p>
            </div>
          )}
          {error && (
            <div className="p-4 text-xs" style={{ color: '#FCA5A5' }}>{error}</div>
          )}
          {!loading && filteredConvs.length === 0 && (
            <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>
              <MessageCircle size={20} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Sin conversaciones en este filtro</p>
            </div>
          )}
          {filteredConvs.map(c => (
            <ConvListItem
              key={c.thread_id}
              conv={c}
              active={selected === c.thread_id}
              onClick={() => { setSelected(c.thread_id); setReply(''); setFeedback(null) }}
            />
          ))}
        </div>
      </div>

      {/* Right — thread view */}
      <div className={`${showThreadMobile ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0`}>
        {!currentConv ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
            <div className="text-center">
              <MessageCircle size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="px-4 sm:px-6 py-3 sm:py-4 flex items-start justify-between gap-3"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            >
              {/* Back button on mobile */}
              <button
                onClick={() => setSelected(null)}
                className="md:hidden p-1.5 rounded-md shrink-0"
                style={{ color: 'var(--text-2)' }}
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: 'var(--text-1)' }}>
                    {currentConv.contact_name || currentConv.contact_email.split('@')[0]}
                  </h2>
                  <StatusBadge status={currentConv.status} />
                </div>
                <p className="text-[11px] sm:text-xs truncate" style={{ color: 'var(--text-2)' }}>
                  {currentConv.contact_email}
                  {currentConv.company && <span> · {currentConv.company}</span>}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {/* Status selector */}
                <select
                  value={currentConv.status}
                  onChange={e => changeStatus(e.target.value as ConvStatus)}
                  className="px-3 py-1.5 rounded-md text-xs outline-none cursor-pointer"
                  style={{
                    background: 'var(--bg-elevated)',
                    color:      'var(--text-1)',
                    border:     '1px solid var(--border)',
                  }}
                >
                  {(Object.keys(STATUS_META) as ConvStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>

                {/* Funnel selector */}
                <div className="flex items-center gap-1">
                  <GitBranch size={11} style={{ color: 'var(--text-3)' }} />
                  <select
                    onChange={e => { if (e.target.value) moveFunnel(e.target.value); e.target.value = '' }}
                    defaultValue=""
                    className="px-2 py-1 rounded-md text-[11px] outline-none cursor-pointer"
                    style={{
                      background: 'var(--bg-elevated)',
                      color:      'var(--text-2)',
                      border:     '1px solid var(--border)',
                    }}
                  >
                    <option value="">→ Funnel…</option>
                    {FUNNEL_PHASES.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
              {currentConv.messages.map(m => (
                <MessageBubble key={m.id} msg={m} contactName={currentConv.contact_name} />
              ))}
            </div>

            {/* Reply box */}
            <div
              className="p-3 sm:p-4 space-y-2"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            >
              {feedback && (
                <div
                  className="px-3 py-1.5 rounded text-xs"
                  style={{
                    background: feedback.type === 'ok' ? '#22C55E20' : '#EF444420',
                    color:      feedback.type === 'ok' ? '#22C55E' : '#FCA5A5',
                  }}
                >
                  {feedback.msg}
                </div>
              )}

              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Escribe tu respuesta o usa Generar con IA…"
                rows={5}
                className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
                style={{
                  background: 'var(--bg-base)',
                  color:      'var(--text-1)',
                  border:     '1px solid var(--border)',
                }}
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !currentConv.has_inbound}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--bg-elevated)',
                    color:      'var(--text-1)',
                    border:     '1px solid var(--border)',
                  }}
                >
                  {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  Generar con IA
                </button>

                <button
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                  style={{ background: 'var(--blue)', color: '#fff' }}
                >
                  {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  Enviar respuesta
                </button>
              </div>
            </div>
          </>
        )}
      </div>
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
        background: active ? color + '25'  : 'transparent',
        color:      active ? color         : 'var(--text-2)',
        border:     `1px solid ${active ? color + '50' : 'var(--border)'}`,
      }}
    >
      {label}
      <span
        className="text-[9px] font-bold px-1 rounded"
        style={{ background: active ? color + '30' : 'var(--bg-elevated)' }}
      >
        {count}
      </span>
    </button>
  )
}

function StatusBadge({ status }: { status: ConvStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: meta.color + '25', color: meta.color }}
    >
      <Icon size={9} />
      {meta.label}
    </span>
  )
}

function ConvListItem({
  conv, active, onClick,
}: { conv: Conversation; active: boolean; onClick: () => void }) {
  const lastMsg = conv.messages.at(-1)
  const meta    = STATUS_META[conv.status]
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition-all"
      style={{
        background:   active ? 'var(--bg-active)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        borderLeft:   active ? `3px solid ${meta.color}` : '3px solid transparent',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
          {conv.contact_name || conv.contact_email.split('@')[0]}
        </span>
        <span className="text-[10px] shrink-0" style={{ color: 'var(--text-3)' }}>
          {fmtRel(conv.last_activity_at)}
        </span>
      </div>
      {conv.company && (
        <p className="text-[11px] truncate mb-1" style={{ color: 'var(--text-3)' }}>
          {conv.company}
        </p>
      )}
      <p className="text-[11px] truncate mb-1" style={{ color: 'var(--text-2)' }}>
        {lastMsg?.direction === 'out' ? '→ ' : ''}
        {lastMsg?.body_text.slice(0, 80) || '(sin contenido)'}
      </p>
      <div className="flex items-center gap-2">
        <StatusBadge status={conv.status} />
        <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
          {conv.messages.length} msg
        </span>
      </div>
    </button>
  )
}

function MessageBubble({ msg, contactName }: { msg: ConvMessage; contactName: string }) {
  const isOut = msg.direction === 'out'
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%]">
        <div className="flex items-center gap-2 mb-1 text-[10px]" style={{ color: 'var(--text-3)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-2)' }}>
            {isOut ? 'Tú' : (msg.from_name || contactName || msg.from_email)}
          </span>
          <span>·</span>
          <span>{fmtAbs(msg.timestamp)}</span>
          {msg.source === 'instantly' && msg.step !== undefined && (
            <span
              className="px-1 py-0.5 rounded font-semibold"
              style={{ background: '#F59E0B25', color: '#F59E0B' }}
            >
              {msg.step === 0 || msg.step === 1 ? '1er email'
                : msg.step === 2 ? '2º follow' : `paso ${msg.step}`}
            </span>
          )}
          {msg.source === 'hubspot' && (
            <span
              className="px-1 py-0.5 rounded font-semibold"
              style={{ background: '#22C55E25', color: '#22C55E' }}
            >
              HubSpot
            </span>
          )}
        </div>
        {msg.subject && (
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
            {msg.subject}
          </div>
        )}
        <div
          className="px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap"
          style={{
            background: isOut ? 'var(--blue)' + '25' : 'var(--bg-surface)',
            color:      'var(--text-1)',
            border:     `1px solid ${isOut ? 'var(--blue)' + '50' : 'var(--border)'}`,
          }}
        >
          {msg.body_text || '(sin contenido)'}
        </div>
      </div>
    </div>
  )
}
