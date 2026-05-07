'use client'
import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  RefreshCw, X, ChevronDown, ChevronUp, ExternalLink, Mail,
  MailOpen, MailCheck, MousePointerClick, AlertCircle, Users,
  Building2, Phone, Globe, MapPin, Calendar, Zap, Network,
  CheckCircle2, XCircle, Clock, ArrowRight, ChevronLeft, ChevronRight,
  Flame, Star, Copy, Sparkles,
} from 'lucide-react'
import PillBadge from '@/components/ui/PillBadge'
import { SkeletonRows } from '@/components/ui/SkeletonRow'
import EmptyState from '@/components/ui/EmptyState'

// ── Types ──────────────────────────────────────────────────────────────────────

type PipelinePhase =
  | 'sin_contactar' | 'enviado_no_abierto' | 'abierto_no_contesta'
  | 'clicked_no_registro' | 'contestado' | 'bounced' | 'dentro_plataforma'
  | 'registrado_sin_verificar' | 'verificado_sin_perfil' | 'perfil_completo'

type ManualClassification = 'interesado' | 'no_interesado' | 'pendiente'

interface Contact {
  id: string; email: string; company: string; contact: string
  phone: string; website: string; city: string
  campaignId: string; campaignName: string; segment: string
  phase: PipelinePhase
  emailStatus: 'not_sent' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced'
  opens: number; clicks: number; replies: number
  lastContact: string; lastOpen: string; lastClick: string; lastReply: string
  lastStep: string
  artiverseUser?: {
    name: string; subscription: string; hasAgency: boolean
    agencyName: string; profileComplete: boolean; emailVerified: boolean; registeredAt: string
  }
  source: 'outbound' | 'inbound_only'
}

interface Stats {
  totalOutbound: number; totalInPlatform: number; needsReply: number
  openedNoReply: number; clicked: number; bounced: number
  notContacted: number; inboundOnly: number
}

// ── Phase config (dark) ────────────────────────────────────────────────────────

const phaseConfig: Record<PipelinePhase, { label: string; color: string; bg: string }> = {
  contestado:               { label: 'Contestó',           color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  clicked_no_registro:      { label: 'Hizo click',         color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  abierto_no_contesta:      { label: 'Abrió',              color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  dentro_plataforma:        { label: 'En plataforma',       color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  perfil_completo:          { label: 'Perfil completo',     color: '#22C55E', bg: 'rgba(34,197,94,0.10)' },
  verificado_sin_perfil:    { label: 'Verificado',          color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  registrado_sin_verificar: { label: 'Sin verificar',       color: '#60A5FA', bg: 'rgba(96,165,250,0.10)' },
  enviado_no_abierto:       { label: 'Enviado',             color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  sin_contactar:            { label: 'Sin contactar',       color: '#44445A', bg: 'rgba(68,68,90,0.20)' },
  bounced:                  { label: 'Rebotó',              color: '#44445A', bg: 'rgba(68,68,90,0.15)' },
}

type TabId = 'all' | 'needs_reply' | 'opened' | 'clicked' | 'in_platform' | 'not_contacted' | 'discarded'

const TABS: { id: TabId; label: string; color: string }[] = [
  { id: 'needs_reply',   label: 'Necesitan respuesta', color: '#EF4444' },
  { id: 'opened',        label: 'Han abierto',          color: '#F59E0B' },
  { id: 'clicked',       label: 'Hicieron click',       color: '#F97316' },
  { id: 'in_platform',   label: 'Plataforma',           color: '#22C55E' },
  { id: 'not_contacted', label: 'Sin contactar',        color: '#44445A' },
  { id: 'discarded',     label: 'Descartados',          color: '#44445A' },
  { id: 'all',           label: 'Todos',                color: '#2563EB' },
]

const PAGE_SIZE = 50

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
function fmtRelative(iso: string) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Ayer'
  if (d < 7) return `${d}d`
  return fmtDate(iso)
}

// ── Phase badge ────────────────────────────────────────────────────────────────

function PhaseBadge({ phase, cls }: { phase: PipelinePhase; cls?: ManualClassification }) {
  let label = phaseConfig[phase]?.label ?? phase
  let color = phaseConfig[phase]?.color ?? 'var(--text-2)'
  let bg    = phaseConfig[phase]?.bg    ?? 'var(--bg-elevated)'

  if (phase === 'contestado' && cls === 'interesado')    { label = 'Interesado';    color = '#22C55E'; bg = 'rgba(34,197,94,0.12)' }
  if (phase === 'contestado' && cls === 'no_interesado') { label = 'No interesado'; color = '#44445A'; bg = 'rgba(68,68,90,0.2)' }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
      style={{ background: bg, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

// ── Email status ───────────────────────────────────────────────────────────────

function EmailStatus({ status, opens, clicks, replies }: {
  status: Contact['emailStatus']; opens: number; clicks: number; replies: number
}) {
  const map: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    bounced:  { icon: AlertCircle,       color: 'var(--text-3)', label: 'Rebotó' },
    replied:  { icon: MailCheck,         color: '#22C55E',       label: `${replies} resp.` },
    clicked:  { icon: MousePointerClick, color: '#F97316',       label: `${clicks} click` },
    opened:   { icon: MailOpen,          color: '#F59E0B',       label: `${opens} aper.` },
    sent:     { icon: Mail,              color: '#2563EB',       label: 'Enviado' },
    not_sent: { icon: Clock,             color: 'var(--text-3)', label: '—' },
  }
  const cfg = map[status] ?? map.not_sent
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: cfg.color }}>
      <Icon size={12} /> {cfg.label}
    </span>
  )
}

// ── Priority badge ─────────────────────────────────────────────────────────────

function PriorityBadge({ opens, replies }: { opens: number; replies: number }) {
  if (replies > 0) return null
  if (opens >= 3) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
      <Flame size={9} /> Hot
    </span>
  )
  if (opens >= 1) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
      <Star size={9} /> Warm
    </span>
  )
  return null
}

// ── Dark slide-over section ────────────────────────────────────────────────────

function SOSection({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }} className="last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          {title}
        </span>
        {open
          ? <ChevronUp  size={12} style={{ color: 'var(--text-3)' }} />
          : <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
        }
      </button>
      {open && <div className="px-5 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={12} style={{ color: 'var(--text-3)', marginTop: 2, flexShrink: 0 }} />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>{label}</p>
        <p className="text-xs break-all" style={{ color: 'var(--text-1)' }}>{value}</p>
      </div>
    </div>
  )
}

// ── Thread Section ─────────────────────────────────────────────────────────────

function ThreadSection({ contact }: { contact: Contact }) {
  const [open,       setOpen]       = useState(contact.replies > 0)
  const [data,       setData]       = useState<any>(null)
  const [loading,    setLoading]    = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)

  const load = useCallback(async () => {
    if (loading || data || !contact.campaignId) return
    setLoading(true)
    try {
      const r = await fetch(
        `/api/contact-thread?email=${encodeURIComponent(contact.email)}&campaignId=${encodeURIComponent(contact.campaignId)}`
      )
      if (r.ok) setData(await r.json())
    } finally { setLoading(false) }
  }, [contact.email, contact.campaignId, loading, data])

  // Auto-load when opened
  useEffect(() => { if (open) load() }, [open]) // eslint-disable-line

  const getSuggestion = async () => {
    setSuggesting(true)
    try {
      const r = await fetch(
        `/api/contact-thread?email=${encodeURIComponent(contact.email)}&campaignId=${encodeURIComponent(contact.campaignId)}&suggest=true`
      )
      if (r.ok) {
        const d = await r.json()
        setSuggestion(d.suggestedReply ?? null)
      }
    } finally { setSuggesting(false) }
  }

  const copy = () => {
    if (!suggestion) return
    navigator.clipboard.writeText(suggestion).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!contact.campaignId) return null

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }} className="last:border-0">
      {/* Header */}
      <button
        onClick={() => { setOpen(v => !v); if (!open && !data) load() }}
        className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Conversación
          </span>
          {contact.replies > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
              {contact.replies} resp.
            </span>
          )}
          {contact.opens > 0 && contact.replies === 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              {contact.opens} apert.
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {loading && <RefreshCw size={10} className="animate-spin" style={{ color: 'var(--text-3)' }} />}
          {open ? <ChevronUp size={12} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">

          {/* ── Secuencia enviada ── */}
          {(data?.sequence?.length > 0 || loading) && (
            <div className="space-y-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Secuencia enviada
              </p>
              {loading && !data ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg p-3 animate-pulse" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="h-2.5 rounded w-1/3 mb-2" style={{ background: 'var(--border)' }} />
                    <div className="h-2.5 rounded w-full mb-1" style={{ background: 'var(--border)' }} />
                    <div className="h-2.5 rounded w-4/5" style={{ background: 'var(--border)' }} />
                  </div>
                ))
              ) : data?.sequence?.map((step: any) => {
                const wasOpened  = data.openedCount  > 0 && step.step <= Math.max(data.lastStep ?? 1, 1)
                const wasReplied = data.repliedCount > 0 && step.step <= Math.max(data.lastStep ?? 1, 1)
                const borderColor = wasReplied
                  ? 'rgba(34,197,94,0.35)'
                  : wasOpened
                    ? 'rgba(245,158,11,0.35)'
                    : 'var(--border)'
                return (
                  <div
                    key={step.step}
                    className="rounded-lg p-3 space-y-1.5"
                    style={{ background: 'var(--bg-elevated)', border: `1px solid ${borderColor}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                        Paso {step.step} · Día {step.delay}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {wasOpened  && <span className="text-[10px] font-medium" style={{ color: '#F59E0B' }}>Abrió ✓</span>}
                        {wasReplied && <span className="text-[10px] font-medium" style={{ color: '#22C55E' }}>Respondió ✓</span>}
                      </div>
                    </div>
                    {step.subject && (
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{step.subject}</p>
                    )}
                    {step.body && (
                      <p className="text-[10px] leading-relaxed line-clamp-3" style={{ color: 'var(--text-2)' }}>
                        {step.body}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Su respuesta ── */}
          {contact.replies > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Su respuesta
              </p>
              {loading && !data ? (
                <div className="rounded-lg p-3 animate-pulse" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-2.5 rounded w-full mb-1.5" style={{ background: 'var(--border)' }} />
                  <div className="h-2.5 rounded w-4/5 mb-1.5" style={{ background: 'var(--border)' }} />
                  <div className="h-2.5 rounded w-3/5" style={{ background: 'var(--border)' }} />
                </div>
              ) : data?.replyText ? (
                <div className="rounded-lg p-3 space-y-2"
                  style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  {data.replyFrom && (
                    <p className="text-[10px] font-medium" style={{ color: '#22C55E' }}>
                      De: {data.replyFrom}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-1)' }}>
                    {data.replyText}
                  </p>
                  {data.replyDate && (
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{fmtDate(data.replyDate)}</p>
                  )}
                </div>
              ) : (
                <a
                  href="https://app.instantly.ai/app/unibox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs rounded-lg p-3 transition-colors"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--blue)', border: '1px solid var(--border)' }}
                >
                  <ExternalLink size={11} />
                  Ver respuesta en Instantly Unibox
                </a>
              )}
            </div>
          )}

          {/* ── Respuesta sugerida IA ── */}
          {contact.replies > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Respuesta sugerida IA
              </p>
              {!suggestion ? (
                <button
                  onClick={getSuggestion}
                  disabled={suggesting || !data?.replyText}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                  style={{
                    background: 'var(--blue-dim)',
                    color:      'var(--blue)',
                    border:     '1px solid var(--blue)',
                  }}
                >
                  {suggesting
                    ? <><RefreshCw size={11} className="animate-spin" /> Generando…</>
                    : <><Sparkles size={11} /> Sugerir respuesta con IA</>
                  }
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg p-3"
                    style={{ background: 'var(--blue-dim)', border: '1px solid rgba(37,99,235,0.3)' }}>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-1)' }}>
                      {suggestion}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copy}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: copied ? '#22C55E'          : 'var(--bg-elevated)',
                        color:      copied ? '#000'             : 'var(--text-2)',
                        border:     '1px solid var(--border)',
                      }}
                    >
                      {copied
                        ? <><CheckCircle2 size={11} /> Copiado</>
                        : <><Copy size={11} /> Copiar</>
                      }
                    </button>
                    <button
                      onClick={() => setSuggestion(null)}
                      className="py-2 px-3 rounded-lg text-xs transition-all"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
                    >
                      Regenerar
                    </button>
                  </div>
                </div>
              )}
              {data && !data.hasAnthropicKey && !suggestion && (
                <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                  Necesita ANTHROPIC_API_KEY en variables de entorno de Vercel.
                </p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ── Dark Slide-over ────────────────────────────────────────────────────────────

function SlideOver({ contact, onClose, classification, onClassify, note, onNoteChange }: {
  contact: Contact | null; onClose: () => void
  classification: ManualClassification | undefined
  onClassify: (cls: ManualClassification) => void
  note: string; onNoteChange: (v: string) => void
}) {
  if (!contact) return null
  const c = contact
  const lastActivity = c.lastReply || c.lastClick || c.lastOpen || c.lastContact

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-[460px] z-40 flex flex-col slide-in-right"
        style={{
          background:  'var(--bg-surface)',
          borderLeft:  '1px solid var(--border)',
          boxShadow:   '-20px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0">
            <h2 className="font-semibold truncate text-sm" style={{ color: 'var(--text-1)' }}>
              {c.company || c.email}
            </h2>
            <p className="text-xs mt-0.5 truncate font-mono" style={{ color: 'var(--text-3)' }}>{c.email}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <PhaseBadge phase={c.phase} cls={classification} />
              <PriorityBadge opens={c.opens} replies={c.replies} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto ruta-scroll">
          <SOSection title="Info básica">
            <InfoRow icon={Mail}      label="Email"    value={c.email} />
            <InfoRow icon={Building2} label="Empresa"  value={c.company} />
            <InfoRow icon={Phone}     label="Teléfono" value={c.phone} />
            <InfoRow icon={Globe}     label="Web"      value={c.website} />
            <InfoRow icon={MapPin}    label="Ciudad"   value={c.city} />
            {c.campaignName && <InfoRow icon={Zap}     label="Campaña"  value={c.campaignName} />}
            {c.segment && c.segment !== 'Inbound' && (
              <InfoRow icon={Network} label="Segmento" value={c.segment} />
            )}
          </SOSection>

          {c.source === 'outbound' && (
            <SOSection title="Historial email">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Aperturas', value: c.opens,   color: '#F59E0B' },
                  { label: 'Clicks',    value: c.clicks,  color: '#F97316' },
                  { label: 'Replies',   value: c.replies, color: '#22C55E' },
                ].map(m => (
                  <div
                    key={m.label}
                    className="rounded-lg p-2.5 text-center"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{m.label}</p>
                  </div>
                ))}
              </div>
              {c.lastStep && (
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--text-3)' }}>Último paso:</span> {c.lastStep}
                </p>
              )}
              {lastActivity && (
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Última actividad: {fmtDate(lastActivity)}
                </p>
              )}
              {c.lastReply && (
                <p className="text-xs font-medium" style={{ color: '#22C55E' }}>
                  Respondió: {fmtDate(c.lastReply)}
                </p>
              )}
              {c.replies > 0 && (
                <a
                  href="https://app.instantly.ai/app/unibox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: 'var(--blue)' }}
                >
                  Ver conversación en Instantly <ExternalLink size={11} />
                </a>
              )}
            </SOSection>
          )}

          {/* Email thread + AI suggestion */}
          {c.source === 'outbound' && (c.opens > 0 || c.replies > 0) && (
            <ThreadSection contact={c} />
          )}

          <SOSection title="Perfil Artiverse" defaultOpen={!!c.artiverseUser}>
            {c.artiverseUser ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <PillBadge
                    label={c.artiverseUser.subscription === 'free' ? 'Gratuito' : `Pro · ${c.artiverseUser.subscription}`}
                    variant={c.artiverseUser.subscription === 'free' ? 'gray' : 'lime'}
                    size="xs"
                  />
                  {c.artiverseUser.hasAgency    && <PillBadge label="Agencia"         variant="purple" size="xs" />}
                  {c.artiverseUser.profileComplete && <PillBadge label="Perfil completo" variant="green"  size="xs" />}
                  {c.artiverseUser.emailVerified   && <PillBadge label="Verificado"      variant="blue"   size="xs" />}
                </div>
                {c.artiverseUser.agencyName && (
                  <p className="text-sm" style={{ color: 'var(--text-1)' }}>{c.artiverseUser.agencyName}</p>
                )}
                {c.artiverseUser.registeredAt && (
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Registrado: {fmtDate(c.artiverseUser.registeredAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>No está en la plataforma todavía</p>
            )}
          </SOSection>

          <SOSection title="Notas">
            <textarea
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="Añade una nota sobre este contacto…"
              className="w-full h-24 text-sm resize-none rounded-lg p-2.5 focus:outline-none"
              style={{
                background: 'var(--bg-elevated)',
                border:     '1px solid var(--border)',
                color:      'var(--text-1)',
              }}
            />
          </SOSection>
        </div>

        {/* Clasificación footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-3)' }}>
            Clasificación
          </p>
          <div className="flex gap-2">
            {(['interesado', 'pendiente', 'no_interesado'] as const).map(cls => {
              const active = classification === cls
              const colors: Record<string, { bg: string; color: string; border: string }> = {
                interesado:    { bg: active ? '#22C55E' : 'transparent', color: active ? '#000' : '#22C55E',      border: '#22C55E' },
                pendiente:     { bg: active ? '#F59E0B' : 'transparent', color: active ? '#000' : '#F59E0B',      border: '#F59E0B' },
                no_interesado: { bg: active ? '#44445A' : 'transparent', color: active ? '#F0F0FF' : '#44445A',  border: '#44445A' },
              }
              const labels: Record<string, string> = {
                interesado: 'Interesado', pendiente: 'Pendiente', no_interesado: 'No interesado',
              }
              const c2 = colors[cls]
              return (
                <button
                  key={cls}
                  onClick={() => onClassify(cls)}
                  className="flex-1 py-2 px-2 text-xs font-medium rounded-lg transition-all"
                  style={{ background: c2.bg, color: c2.color, border: `1px solid ${c2.border}` }}
                >
                  {labels[cls]}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Pagination bar ─────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })

  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
      <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
        Mostrando {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-2)' }}
          onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ChevronLeft size={13} />
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="w-7 h-7 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: p === page ? 'var(--blue)' : 'transparent',
              color:      p === page ? '#fff'        : 'var(--text-2)',
            }}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-2)' }}
          onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

function ContactosContent() {
  const searchParams = useSearchParams()
  const deepEmail = searchParams.get('email')

  const [contacts,        setContacts]        = useState<Contact[]>([])
  const [stats,           setStats]           = useState<Stats | null>(null)
  const [campaigns,       setCampaigns]       = useState<{ id: string; name: string }[]>([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState<string | null>(null)
  const [lastUpdated,     setLastUpdated]     = useState('')
  const [activeTab,       setActiveTab]       = useState<TabId>('needs_reply')
  const [campaignFilter,  setCampaignFilter]  = useState('')
  const [segmentFilter,   setSegmentFilter]   = useState('')
  const [search,          setSearch]          = useState('')
  const [page,            setPage]            = useState(1)
  const [selected,        setSelected]        = useState<Contact | null>(null)
  const [notes,           setNotes]           = useState<Record<string, string>>({})
  const [classifications, setClassifications] = useState<Record<string, ManualClassification>>({})
  const noteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      setNotes(JSON.parse(localStorage.getItem('pipeline_notes') ?? '{}'))
      setClassifications(JSON.parse(localStorage.getItem('pipeline_cls') ?? '{}'))
    } catch { /* ignore */ }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/pipeline?token=AETHER2026')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      setContacts(d.contacts ?? [])
      setStats(d.stats)
      setCampaigns(d.campaigns ?? [])
      setLastUpdated(new Date().toLocaleTimeString('es-ES'))
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 3 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchData])

  // Deep-link: open slide-over by email
  useEffect(() => {
    if (deepEmail && contacts.length > 0) {
      const found = contacts.find(c => c.email.toLowerCase() === deepEmail.toLowerCase())
      if (found) setSelected(found)
    }
  }, [deepEmail, contacts])

  const handleClassify = useCallback((email: string, cls: ManualClassification) => {
    setClassifications(prev => {
      const next = { ...prev, [email]: cls }
      localStorage.setItem('pipeline_cls', JSON.stringify(next))
      return next
    })
  }, [])

  const handleNote = useCallback((email: string, val: string) => {
    setNotes(prev => ({ ...prev, [email]: val }))
    if (noteDebounce.current) clearTimeout(noteDebounce.current)
    noteDebounce.current = setTimeout(() => {
      setNotes(prev => { localStorage.setItem('pipeline_notes', JSON.stringify(prev)); return prev })
    }, 500)
  }, [])

  // Unique segments from contacts
  const segments = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach(c => { if (c.segment && c.segment !== 'Inbound' && c.segment !== 'Instantly') s.add(c.segment) })
    return Array.from(s).sort()
  }, [contacts])

  // Filtered + paginated
  const allFiltered = useMemo(() => {
    let list = contacts
    if (activeTab === 'needs_reply')   list = list.filter(c => c.phase === 'contestado')
    if (activeTab === 'opened')        list = list.filter(c => c.phase === 'abierto_no_contesta')
    if (activeTab === 'clicked')       list = list.filter(c => c.phase === 'clicked_no_registro')
    if (activeTab === 'in_platform')   list = list.filter(c => ['dentro_plataforma','perfil_completo','verificado_sin_perfil','registrado_sin_verificar'].includes(c.phase))
    if (activeTab === 'not_contacted') list = list.filter(c => c.phase === 'sin_contactar')
    if (activeTab === 'discarded')     list = list.filter(c => c.phase === 'bounced' || classifications[c.email] === 'no_interesado')
    if (campaignFilter) list = list.filter(c => c.campaignId === campaignFilter)
    if (segmentFilter)  list = list.filter(c => c.segment === segmentFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.email.includes(q) || c.company.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q))
    }
    return list
  }, [contacts, activeTab, campaignFilter, segmentFilter, search, classifications])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return allFiltered.slice(start, start + PAGE_SIZE)
  }, [allFiltered, page])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [activeTab, campaignFilter, segmentFilter, search])

  const tabCounts = useMemo(() => {
    const all = contacts
    return {
      needs_reply:   all.filter(c => c.phase === 'contestado').length,
      opened:        all.filter(c => c.phase === 'abierto_no_contesta').length,
      clicked:       all.filter(c => c.phase === 'clicked_no_registro').length,
      in_platform:   all.filter(c => ['dentro_plataforma','perfil_completo','verificado_sin_perfil','registrado_sin_verificar'].includes(c.phase)).length,
      not_contacted: all.filter(c => c.phase === 'sin_contactar').length,
      discarded:     all.filter(c => c.phase === 'bounced' || classifications[c.email] === 'no_interesado').length,
      all:           all.length,
    }
  }, [contacts, classifications])

  return (
    <div
      className="flex flex-col md:h-screen md:overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div
        className="px-4 sm:px-6 py-4 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Contactos</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              CRM unificado · Instantly + Artiverse
              {lastUpdated && ` · act. ${lastUpdated}`}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              color:      'var(--text-2)',
              border:     '1px solid var(--border)',
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>

        {/* KPI cards — hidden on mobile to save vertical space */}
        {stats && (
          <div className="hidden sm:grid sm:grid-cols-4 gap-2.5 mb-4">
            {[
              { label: 'Total outbound',    value: stats.totalOutbound,  color: 'var(--text-1)' },
              { label: 'En plataforma',     value: stats.totalInPlatform, color: '#22C55E' },
              { label: 'Necesitan respuesta', value: stats.needsReply,   color: '#EF4444' },
              { label: 'Han abierto',       value: stats.openedNoReply,  color: '#F59E0B' },
            ].map(m => (
              <div
                key={m.label}
                className="rounded-xl px-4 py-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                {loading && !stats ? (
                  <div className="skeleton h-6 w-10 mb-1 rounded" />
                ) : (
                  <>
                    <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value ?? '—'}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{m.label}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="hidden sm:flex items-center gap-1 flex-wrap">
          {TABS.map(tab => {
            const active = activeTab === tab.id
            const count  = tabCounts[tab.id]
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: active ? tab.color                  : 'var(--bg-elevated)',
                  color:      active ? (tab.color === '#44445A' ? 'var(--text-1)' : '#fff') : 'var(--text-2)',
                  border:     `1px solid ${active ? tab.color : 'var(--border)'}`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? '#fff' : tab.color, opacity: active ? 0.7 : 1 }} />
                {tab.label}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)',
                    color:      active ? '#fff' : 'var(--text-2)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Mobile tabs — horizontal scroll pills */}
        <div
          className="sm:hidden overflow-x-auto flex items-center gap-1.5 pb-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {TABS.map(tab => {
            const active = activeTab === tab.id
            const count  = tabCounts[tab.id]
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all"
                style={{
                  background: active ? tab.color : 'var(--bg-elevated)',
                  color:      active ? (tab.color === '#44445A' ? 'var(--text-1)' : '#fff') : 'var(--text-2)',
                  border:     `1px solid ${active ? tab.color : 'var(--border)'}`,
                }}
              >
                {tab.label}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)',
                    color:      active ? '#fff' : 'var(--text-3)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Filters + search bar ─────────────────────────────────────────────── */}
      <div
        className="px-4 sm:px-6 py-2.5 shrink-0 space-y-2"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        {/* Search row */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresa, email, ciudad…"
            className="text-xs rounded-lg px-3 py-1.5 flex-1 sm:flex-none sm:w-52 focus:outline-none"
            style={{
              background: 'var(--bg-elevated)',
              color:      'var(--text-1)',
              border:     '1px solid var(--border)',
            }}
          />
          {/* Mobile: active filters indicator */}
          {(campaignFilter || segmentFilter) && (
            <button
              onClick={() => { setCampaignFilter(''); setSegmentFilter('') }}
              className="sm:hidden flex items-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid var(--blue)' }}
            >
              <X size={10} />
              Limpiar
            </button>
          )}
        </div>

        {/* Campaign + segment pills — single horizontal scroll row */}
        {(campaigns.length > 0 || segments.length > 0) && (
          <div
            className="overflow-x-auto flex items-center gap-1.5 pb-0.5"
            style={{ scrollbarWidth: 'none' }}
          >
            <button
              onClick={() => setCampaignFilter('')}
              className="text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-all"
              style={{
                background: !campaignFilter ? 'var(--blue)'      : 'var(--bg-elevated)',
                color:      !campaignFilter ? '#fff'              : 'var(--text-2)',
                border:     `1px solid ${!campaignFilter ? 'var(--blue)' : 'var(--border)'}`,
              }}
            >
              Todas
            </button>
            {campaigns.filter(c => c.name).map(camp => (
              <button
                key={camp.id}
                onClick={() => setCampaignFilter(campaignFilter === camp.id ? '' : camp.id)}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-all"
                style={{
                  background: campaignFilter === camp.id ? 'var(--blue)'  : 'var(--bg-elevated)',
                  color:      campaignFilter === camp.id ? '#fff'          : 'var(--text-2)',
                  border:     `1px solid ${campaignFilter === camp.id ? 'var(--blue)' : 'var(--border)'}`,
                }}
              >
                {camp.name}
              </button>
            ))}
            {segments.length > 0 && campaigns.length > 0 && (
              <div className="w-px h-4 shrink-0" style={{ background: 'var(--border)' }} />
            )}
            {segments.map(seg => (
              <button
                key={seg}
                onClick={() => setSegmentFilter(segmentFilter === seg ? '' : seg)}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-all"
                style={{
                  background: segmentFilter === seg ? 'rgba(204,255,0,0.15)' : 'var(--bg-elevated)',
                  color:      segmentFilter === seg ? 'var(--lime)'           : 'var(--text-2)',
                  border:     `1px solid ${segmentFilter === seg ? 'var(--lime)' : 'var(--border)'}`,
                }}
              >
                {seg}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex md:flex-1 md:min-h-0">
        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selected ? 'lg:pr-[460px]' : ''}`}>

          <div className="md:flex-1 md:overflow-auto" style={{ background: 'var(--bg-base)' }}>
            {error ? (
              <EmptyState
                icon={AlertCircle}
                title="Error cargando datos"
                subtitle={error}
                action={{ label: 'Reintentar', onClick: fetchData }}
              />
            ) : loading && contacts.length === 0 ? (
              <table className="w-full">
                <tbody><SkeletonRows count={10} cols={5} /></tbody>
              </table>
            ) : allFiltered.length === 0 ? (
              <EmptyState icon={Users} title="Sin contactos en esta vista" subtitle="Prueba con otro filtro o campaña" />
            ) : (
              <>
                {/* Desktop table */}
                <table className="hidden sm:table w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                      {['Empresa / Email', 'Prioridad', 'Fase', 'Campaña', 'Email', 'Última act.', ''].map(h => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: 'var(--text-3)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(c => {
                      const cls      = classifications[c.email]
                      const lastAct  = c.lastReply || c.lastClick || c.lastOpen || c.lastContact
                      const isSelected = selected?.id === c.id
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelected(prev => prev?.id === c.id ? null : c)}
                          className="cursor-pointer transition-colors group"
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background:   isSelected ? 'var(--bg-active)' : 'transparent',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                        >
                          <td className="px-4 py-3 max-w-[180px]">
                            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
                              {c.company || '—'}
                            </p>
                            <p className="text-[10px] truncate font-mono" style={{ color: 'var(--text-3)' }}>
                              {c.email}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <PriorityBadge opens={c.opens} replies={c.replies} />
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <PhaseBadge phase={c.phase} cls={cls} />
                          </td>
                          <td className="px-4 py-3 text-xs hidden lg:table-cell" style={{ color: 'var(--text-2)' }}>
                            {c.campaignName || <span style={{ color: 'var(--text-3)' }}>—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <EmailStatus status={c.emailStatus} opens={c.opens} clicks={c.clicks} replies={c.replies} />
                          </td>
                          <td className="px-4 py-3 text-xs hidden xl:table-cell" style={{ color: 'var(--text-3)' }}>
                            {fmtRelative(lastAct)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-medium flex items-center gap-1 justify-end" style={{ color: 'var(--blue)' }}>
                              {c.replies > 0 ? (
                                <a href="https://app.instantly.ai/app/unibox" target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1" style={{ color: 'var(--blue)' }}>
                                  Unibox <ExternalLink size={10} />
                                </a>
                              ) : c.artiverseUser ? (
                                <span className="flex items-center gap-1" style={{ color: '#22C55E' }}>
                                  Plataforma <CheckCircle2 size={10} />
                                </span>
                              ) : c.opens > 0 ? (
                                <span className="flex items-center gap-1" style={{ color: '#F59E0B' }}>
                                  Follow-up <ArrowRight size={10} />
                                </span>
                              ) : null}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Mobile cards */}
                <div className="sm:hidden">
                  {paginated.map(c => {
                    const cls        = classifications[c.email]
                    const isSelected = selected?.id === c.id
                    const phaseColor = phaseConfig[c.phase]?.color ?? 'var(--text-3)'
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelected(prev => prev?.id === c.id ? null : c)}
                        className="flex items-stretch cursor-pointer transition-colors"
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background:   isSelected ? 'var(--bg-active)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                      >
                        {/* Phase color bar */}
                        <div className="w-1 shrink-0" style={{ background: phaseColor }} />
                        {/* Content */}
                        <div className="flex-1 px-3 py-3 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <p className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--text-1)' }}>
                                  {c.company || c.email.split('@')[0]}
                                </p>
                                <PriorityBadge opens={c.opens} replies={c.replies} />
                              </div>
                              <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-3)' }}>{c.email}</p>
                            </div>
                            <PhaseBadge phase={c.phase} cls={cls} />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <EmailStatus status={c.emailStatus} opens={c.opens} clicks={c.clicks} replies={c.replies} />
                            {c.campaignName && (
                              <span className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>· {c.campaignName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <Pagination
                  page={page}
                  total={allFiltered.length}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                />
              </>
            )}
          </div>
        </div>

        {/* Slide-over */}
        {selected && (
          <SlideOver
            contact={selected}
            onClose={() => setSelected(null)}
            classification={classifications[selected.email]}
            onClassify={cls => handleClassify(selected.email, cls)}
            note={notes[selected.email] ?? ''}
            onNoteChange={val => handleNote(selected.email, val)}
          />
        )}
      </div>
    </div>
  )
}

export default function ContactosPage() {
  return (
    <Suspense fallback={<div style={{ background: 'var(--bg-base)', height: '100vh' }} />}>
      <ContactosContent />
    </Suspense>
  )
}
