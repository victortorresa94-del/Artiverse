'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  RefreshCw, Mail, Eye, MousePointer, MessageCircle, ThumbsUp, ThumbsDown,
  CheckCheck, MailX, Loader2, Send, ArrowRight, UserPlus, Crown, Sparkles,
  Building2, ImageIcon, FileText, Activity, Clock, AlertCircle,
} from 'lucide-react'
import ContactSheet from '@/components/ContactSheet'

// ─── Types ────────────────────────────────────────────────────────────────────

type ConvStatus = 'pendiente' | 'esperando' | 'cerrada' | 'no_interesado' | 'mail_obsoleto'

type OutPhase = 'contactado' | 'abierto' | 'respondio' | 'interesado' | 'registrado' | 'no_interesado' | 'mail_erroneo'
type InPhase  = 'registrado' | 'perfil_basico' | 'perfil_completo' | 'pro' | 'agencia'

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
  phase:    string
  source:   'auto' | 'manual' | 'platform'
  conv_status?: ConvStatus
}

interface FunnelGroup {
  phases: Record<string, FunnelContact[]>
  counts: Record<string, number>
  total:  number
}

interface FunnelData {
  outbound: FunnelGroup
  inbound:  FunnelGroup
}

// ─── Phase metadata ───────────────────────────────────────────────────────────

const OUT_ORDER: OutPhase[] = ['contactado', 'abierto', 'respondio', 'interesado', 'registrado', 'no_interesado', 'mail_erroneo']
const IN_ORDER:  InPhase[]  = ['registrado', 'perfil_basico', 'perfil_completo', 'pro', 'agencia']

const PHASE_META: Record<string, { label: string; icon: React.ElementType; color: string; manual?: boolean }> = {
  // Outbound
  contactado:      { label: 'Contactado',     icon: Mail,          color: '#60A5FA' },
  abierto:         { label: 'Abierto',        icon: Eye,           color: '#A78BFA' },
  respondio:       { label: 'Respondió',      icon: MessageCircle, color: '#FBBF24' },
  interesado:      { label: 'Interesado',     icon: ThumbsUp,      color: '#22C55E', manual: true },
  no_interesado:   { label: 'No interesado',  icon: ThumbsDown,    color: '#94A3B8', manual: true },
  mail_erroneo:    { label: 'Mail erróneo',   icon: MailX,         color: '#EF4444' },
  // Inbound
  registrado:      { label: 'Registrado',     icon: UserPlus,      color: '#10B981' },
  perfil_basico:   { label: 'Perfil básico',  icon: FileText,      color: '#60A5FA' },
  perfil_completo: { label: 'Perfil completo',icon: ImageIcon,     color: '#A78BFA' },
  pro:             { label: 'Pro',            icon: Crown,         color: '#FFD700' },
  agencia:         { label: 'Agencia',        icon: Sparkles,      color: '#F472B6' },
}

const CONV_META: Record<ConvStatus, { label: string; color: string; icon: React.ElementType }> = {
  pendiente:     { label: 'Pendiente',     color: '#F59E0B', icon: AlertCircle },
  esperando:     { label: 'Esperando',     color: '#60A5FA', icon: Clock },
  cerrada:       { label: 'Cerrada',       color: '#22C55E', icon: CheckCheck },
  no_interesado: { label: 'No interesado', color: '#94A3B8', icon: ThumbsDown },
  mail_obsoleto: { label: 'Obsoleto',      color: '#EF4444', icon: MailX },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRel(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

// ─── Contact card ─────────────────────────────────────────────────────────────

function ContactCard({ c, onClick }: { c: FunnelContact; onClick: () => void }) {
  const initial = (c.name || c.email).charAt(0).toUpperCase()
  const conv = c.conv_status ? CONV_META[c.conv_status] : null

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-lg transition-all"
      style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
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

      {/* Conv status badge */}
      {conv && (
        <div className="mt-2">
          <span
            className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: conv.color + '25', color: conv.color }}
          >
            <conv.icon size={8} /> {conv.label}
          </span>
        </div>
      )}

      {(c.opens > 0 || c.replies > 0) && (
        <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
          {c.opens   > 0 && <span className="flex items-center gap-1"><Eye size={9} />{c.opens}</span>}
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
  phase: string; contacts: FunnelContact[]; onSelect: (email: string, name: string, company: string) => void
}) {
  const meta = PHASE_META[phase]
  if (!meta) return null
  const Icon = meta.icon

  return (
    <div className="shrink-0 w-[260px] flex flex-col">
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
              M
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

      <div
        className="flex-1 rounded-b-lg p-2 space-y-1.5 overflow-y-auto"
        style={{
          background:    'var(--bg-surface)',
          borderLeft:    '1px solid var(--border)',
          borderRight:   '1px solid var(--border)',
          borderBottom:  '1px solid var(--border)',
          minHeight:     '300px',
          maxHeight:     'calc(100vh - 280px)',
        }}
      >
        {contacts.length === 0 ? (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-3)' }}>
            <p className="text-[10px] italic">Vacío</p>
          </div>
        ) : (
          contacts.map(c => (
            <ContactCard key={c.email} c={c} onClick={() => onSelect(c.email, c.name, c.company)} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'outbound' | 'inbound'

export default function FunnelPage() {
  const [data, setData]       = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [view, setView]       = useState<ViewMode>('outbound')
  const [selectedContact, setSelectedContact] = useState<{ email: string; name: string; company: string } | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/funnel', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const current = data ? (view === 'outbound' ? data.outbound : data.inbound) : null
  const order   = view === 'outbound' ? OUT_ORDER : IN_ORDER

  const totals = useMemo(() => {
    if (!current) return { total: 0, pct: {} as Record<string, number> }
    const total = current.total || 1
    const pct: Record<string, number> = {}
    order.forEach(p => {
      pct[p] = Math.round((current.counts[p] || 0) / total * 1000) / 10
    })
    return { total: current.total, pct }
  }, [current, order])

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Funnel</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
            {data
              ? `${current?.total ?? 0} contactos en ${order.length} fases · ${view === 'outbound' ? 'outreach' : 'inbound'}`
              : 'Cargando…'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Outbound/Inbound */}
          <div
            className="flex p-1 rounded-lg gap-1"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <ToggleBtn active={view === 'outbound'} label="Outbound" sub={data ? `${data.outbound.total}` : ''} onClick={() => setView('outbound')} />
            <ToggleBtn active={view === 'inbound'}  label="Inbound"  sub={data ? `${data.inbound.total}`  : ''} onClick={() => setView('inbound')} />
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
        </div>
      </div>

      {/* Funnel summary bar */}
      {current && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {order.map(p => {
            const meta  = PHASE_META[p]
            const count = current.counts[p] || 0
            const Icon  = meta.icon
            return (
              <div
                key={p}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
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

      {error && (
        <div
          className="p-4 rounded-lg mb-4 text-sm"
          style={{ background: '#EF444415', border: '1px solid #EF444430', color: '#FCA5A5' }}
        >
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20" style={{ color: 'var(--text-2)' }}>
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Cargando funnel…</span>
        </div>
      )}

      {/* Kanban */}
      {current && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {order.map(p => (
            <PhaseColumn
              key={p}
              phase={p}
              contacts={current.phases[p] || []}
              onSelect={(email, name, company) => setSelectedContact({ email, name, company })}
            />
          ))}
        </div>
      )}

      {/* Ficha de contacto */}
      <ContactSheet
        email={selectedContact?.email || null}
        initialName={selectedContact?.name}
        initialCompany={selectedContact?.company}
        onClose={() => { setSelectedContact(null); load() }}
      />
    </div>
  )
}

// ─── Toggle button ────────────────────────────────────────────────────────────

function ToggleBtn({
  active, label, sub, onClick,
}: { active: boolean; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
      style={{
        background: active ? 'var(--bg-active)' : 'transparent',
        color:      active ? 'var(--text-1)'    : 'var(--text-2)',
      }}
    >
      {label}
      {sub && (
        <span
          className="text-[10px] px-1 py-0.5 rounded font-bold"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
        >
          {sub}
        </span>
      )}
    </button>
  )
}
