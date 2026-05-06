'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  RefreshCw, Mail, Eye, MousePointer, MessageCircle, ThumbsUp, ThumbsDown,
  CheckCheck, MailX, Building2, MapPin, X, Send, Loader2, ArrowRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | 'contactado' | 'abierto' | 'respondio'
  | 'interesado' | 'registrado' | 'no_interesado' | 'mail_erroneo'

interface FunnelContact {
  email:    string
  name:     string
  company:  string
  job:      string
  city:     string
  opens:    number
  clicks:   number
  replies:  number
  updated:  string
  phase:    Phase
  source:   'auto' | 'manual' | 'platform'
}

interface FunnelData {
  phases:   Record<Phase, FunnelContact[]>
  counts:   Record<Phase, number>
  total:    number
  list_ids: Record<string, number>
}

// ─── Phase metadata ───────────────────────────────────────────────────────────

const PHASE_ORDER: Phase[] = [
  'contactado', 'abierto', 'respondio',
  'interesado', 'registrado', 'no_interesado', 'mail_erroneo',
]

const PHASE_META: Record<Phase, {
  label:   string
  icon:    React.ElementType
  color:   string  // accent
  desc:    string
  manual?: boolean
}> = {
  contactado:    { label: 'Contactado',     icon: Mail,          color: '#60A5FA', desc: 'Email enviado, sin actividad' },
  abierto:       { label: 'Abierto',        icon: Eye,           color: '#A78BFA', desc: 'Abrió el email' },
  respondio:     { label: 'Respondió',      icon: MessageCircle, color: '#FBBF24', desc: 'Contestó al email' },
  interesado:    { label: 'Interesado',     icon: ThumbsUp,      color: '#22C55E', desc: 'Marcado manualmente', manual: true },
  registrado:    { label: 'Registrado',     icon: CheckCheck,    color: '#10B981', desc: 'Usuario en Artiverse' },
  no_interesado: { label: 'No interesado',  icon: ThumbsDown,    color: '#94A3B8', desc: 'Marcado manualmente', manual: true },
  mail_erroneo:  { label: 'Mail erróneo',   icon: MailX,         color: '#EF4444', desc: 'Bounce / inválido' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRel(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)    return 'ahora'
  if (m < 60)   return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

// ─── Contact card ─────────────────────────────────────────────────────────────

function ContactCard({ c, onClick }: { c: FunnelContact; onClick: () => void }) {
  const initial = (c.name || c.email).charAt(0).toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-lg transition-all group"
      style={{
        background: 'var(--bg-base)',
        border:     '1px solid var(--border)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background  = 'var(--bg-hover)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background  = 'var(--bg-base)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)' }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--text-1)' }}>
            {c.name || c.email.split('@')[0]}
          </p>
          {c.company && (
            <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-2)' }}>
              {c.company}
            </p>
          )}
        </div>
      </div>

      {(c.opens > 0 || c.clicks > 0 || c.replies > 0) && (
        <div className="flex items-center gap-2 mt-2 text-[10px]" style={{ color: 'var(--text-3)' }}>
          {c.opens   > 0 && <span className="flex items-center gap-1"><Eye          size={9} />{c.opens}</span>}
          {c.clicks  > 0 && <span className="flex items-center gap-1"><MousePointer size={9} />{c.clicks}</span>}
          {c.replies > 0 && <span className="flex items-center gap-1"><MessageCircle size={9} />{c.replies}</span>}
          <span className="ml-auto">{fmtRel(c.updated)}</span>
        </div>
      )}
    </button>
  )
}

// ─── Phase column ─────────────────────────────────────────────────────────────

function PhaseColumn({
  phase, contacts, onSelect,
}: {
  phase: Phase; contacts: FunnelContact[]; onSelect: (c: FunnelContact) => void
}) {
  const meta = PHASE_META[phase]
  const Icon = meta.icon

  return (
    <div className="shrink-0 w-[260px] flex flex-col">
      {/* Header */}
      <div
        className="rounded-t-lg px-3 py-2.5 flex items-center justify-between"
        style={{
          background:  'var(--bg-surface)',
          borderTop:   `2px solid ${meta.color}`,
          borderLeft:  '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={13} style={{ color: meta.color, flexShrink: 0 }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--text-1)' }}>
            {meta.label}
          </span>
          {meta.manual && (
            <span
              className="text-[8px] px-1 py-0.5 rounded uppercase tracking-wider"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-3)' }}
            >
              Manual
            </span>
          )}
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-2"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)' }}
        >
          {contacts.length}
        </span>
      </div>

      {/* Body */}
      <div
        className="flex-1 rounded-b-lg p-2 space-y-1.5 overflow-y-auto"
        style={{
          background:    'var(--bg-surface)',
          borderLeft:    '1px solid var(--border)',
          borderRight:   '1px solid var(--border)',
          borderBottom:  '1px solid var(--border)',
          minHeight:     '300px',
          maxHeight:     'calc(100vh - 260px)',
        }}
      >
        {contacts.length === 0 ? (
          <div
            className="h-full flex flex-col items-center justify-center text-center py-6"
            style={{ color: 'var(--text-3)' }}
          >
            <p className="text-[10px] italic">Sin contactos</p>
          </div>
        ) : (
          contacts.map(c => (
            <ContactCard key={c.email} c={c} onClick={() => onSelect(c)} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Detail slide-over ────────────────────────────────────────────────────────

function ContactDetailPanel({
  contact, onClose, onMove, moving,
}: {
  contact: FunnelContact
  onClose: () => void
  onMove:  (phase: 'interesado' | 'no_interesado' | '__auto__') => void
  moving:  boolean
}) {
  const meta = PHASE_META[contact.phase]
  const Icon = meta.icon

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[460px] flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-strong)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold shrink-0"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)' }}
            >
              {(contact.name || contact.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                {contact.name || contact.email.split('@')[0]}
              </h2>
              <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{contact.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Current phase */}
          <div
            className="p-3 rounded-lg flex items-center gap-3"
            style={{
              background: meta.color + '15',
              border:     `1px solid ${meta.color}30`,
            }}
          >
            <Icon size={18} style={{ color: meta.color }} />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
                Fase actual
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                {meta.label}
              </p>
            </div>
            <span
              className="text-[9px] px-2 py-1 rounded uppercase tracking-wider"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
            >
              {contact.source === 'manual'   ? 'Manual'
                : contact.source === 'platform' ? 'Plataforma'
                : 'Auto'}
            </span>
          </div>

          {/* Info */}
          <div className="space-y-2.5">
            {contact.company && (
              <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-1)' }}>
                <Building2 size={13} style={{ color: 'var(--text-3)' }} />
                <span>{contact.company}</span>
              </div>
            )}
            {contact.job && (
              <div className="text-sm pl-6" style={{ color: 'var(--text-2)' }}>{contact.job}</div>
            )}
            {contact.city && (
              <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-1)' }}>
                <MapPin size={13} style={{ color: 'var(--text-3)' }} />
                <span>{contact.city}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-2 p-3 rounded-lg"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
          >
            {[
              { label: 'Aperturas',  value: contact.opens,   icon: Eye },
              { label: 'Clicks',     value: contact.clicks,  icon: MousePointer },
              { label: 'Respuestas', value: contact.replies, icon: MessageCircle },
            ].map(s => {
              const I = s.icon
              return (
                <div key={s.label} className="text-center">
                  <I size={12} style={{ color: 'var(--text-3)', margin: '0 auto' }} />
                  <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    {s.label}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Last activity */}
          {contact.updated && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Última actividad: {new Date(contact.updated).toLocaleString('es-ES')}
            </p>
          )}

          {/* Quick action: respond */}
          {contact.phase === 'respondio' && (
            <Link
              href="/conversaciones"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'var(--blue)',
                color:      '#fff',
              }}
            >
              <Send size={14} />
              Responder en Conversaciones
              <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {/* Footer — move actions */}
        <div
          className="p-4 space-y-2"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
        >
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
            Mover a fase manual
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              disabled={moving || contact.phase === 'interesado'}
              onClick={() => onMove('interesado')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: contact.phase === 'interesado' ? '#22C55E30' : 'var(--bg-base)',
                color:      contact.phase === 'interesado' ? '#22C55E' : 'var(--text-1)',
                border:     '1px solid var(--border)',
              }}
            >
              <ThumbsUp size={12} /> Interesado
            </button>
            <button
              disabled={moving || contact.phase === 'no_interesado'}
              onClick={() => onMove('no_interesado')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: contact.phase === 'no_interesado' ? '#94A3B830' : 'var(--bg-base)',
                color:      contact.phase === 'no_interesado' ? '#94A3B8' : 'var(--text-1)',
                border:     '1px solid var(--border)',
              }}
            >
              <ThumbsDown size={12} /> No
            </button>
            <button
              disabled={moving || contact.source !== 'manual'}
              onClick={() => onMove('__auto__')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--bg-base)',
                color:      'var(--text-2)',
                border:     '1px solid var(--border)',
              }}
            >
              {moving ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Auto
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FunnelPage() {
  const [data, setData]         = useState<FunnelData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [selected, setSelected] = useState<FunnelContact | null>(null)
  const [moving, setMoving]     = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/funnel', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const d = await res.json()
      setData(d)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleMove(phase: 'interesado' | 'no_interesado' | '__auto__') {
    if (!selected) return
    setMoving(true)
    try {
      const res = await fetch('/api/funnel/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selected.email, phase }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error ${res.status}`)
      }
      setSelected(null)
      await load()
    } catch (e: any) {
      alert(`Error al mover: ${e.message}`)
    } finally {
      setMoving(false)
    }
  }

  const totals = useMemo(() => {
    if (!data) return { total: 0, pct: {} as Record<Phase, number> }
    const total = data.total || 1
    const pct: Record<string, number> = {}
    PHASE_ORDER.forEach(p => {
      pct[p] = Math.round((data.counts[p] || 0) / total * 1000) / 10
    })
    return { total: data.total, pct }
  }, [data])

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Funnel</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            {data
              ? `${data.total} contactos clasificados en ${PHASE_ORDER.length} fases`
              : 'Cargando contactos…'}
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{
            background: 'var(--bg-surface)',
            color:      'var(--text-1)',
            border:     '1px solid var(--border)',
          }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {loading ? 'Cargando…' : 'Refrescar'}
        </button>
      </div>

      {/* Funnel summary bar */}
      {data && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {PHASE_ORDER.map(p => {
            const meta  = PHASE_META[p]
            const count = data.counts[p] || 0
            const Icon  = meta.icon
            return (
              <div
                key={p}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
                style={{
                  background: 'var(--bg-surface)',
                  border:     '1px solid var(--border)',
                }}
              >
                <Icon size={11} style={{ color: meta.color }} />
                <span className="font-medium" style={{ color: 'var(--text-1)' }}>{meta.label}</span>
                <span className="font-bold" style={{ color: meta.color }}>{count}</span>
                <span style={{ color: 'var(--text-3)' }}>· {totals.pct[p]}%</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-lg mb-4 text-sm"
          style={{ background: '#EF444415', border: '1px solid #EF444430', color: '#FCA5A5' }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20" style={{ color: 'var(--text-2)' }}>
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Cargando funnel desde Instantly + HubSpot…</span>
        </div>
      )}

      {/* Kanban */}
      {data && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PHASE_ORDER.map(p => (
            <PhaseColumn
              key={p}
              phase={p}
              contacts={data.phases[p] || []}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <ContactDetailPanel
          contact={selected}
          onClose={() => setSelected(null)}
          onMove={handleMove}
          moving={moving}
        />
      )}
    </div>
  )
}
