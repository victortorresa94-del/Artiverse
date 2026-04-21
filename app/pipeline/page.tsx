'use client'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
  RefreshCw, X, ChevronDown, ChevronUp, ExternalLink, Mail,
  MailOpen, MailCheck, MousePointerClick, AlertCircle, Users,
  Building2, Phone, Globe, MapPin, Calendar, Zap, Network,
  CheckCircle2, XCircle, Clock, ArrowRight,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type PipelinePhase =
  | 'sin_contactar' | 'enviado_no_abierto' | 'abierto_no_contesta'
  | 'clicked_no_registro' | 'contestado' | 'bounced' | 'dentro_plataforma'
  | 'registrado_sin_verificar' | 'verificado_sin_perfil' | 'perfil_completo'

type ManualClassification = 'interesado' | 'no_interesado' | 'pendiente'

interface PipelineContact {
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

interface PipelineStats {
  totalOutbound: number; totalInPlatform: number; needsReply: number
  openedNoReply: number; clicked: number; bounced: number
  notContacted: number; inboundOnly: number
}

interface PipelineData {
  contacts: PipelineContact[]
  stats: PipelineStats
  campaigns: { id: string; name: string }[]
  updatedAt: string
}

// ── Phase config ───────────────────────────────────────────────────────────────

const phaseConfig: Record<PipelinePhase, { label: string; bg: string; text: string; dot: string }> = {
  contestado:               { label: 'Contestó',            bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
  clicked_no_registro:      { label: 'Hizo click',          bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  abierto_no_contesta:      { label: 'Abrió, no contesta',  bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  dentro_plataforma:        { label: 'En plataforma',        bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  perfil_completo:          { label: 'Perfil completo',      bg: 'bg-emerald-50',  text: 'text-emerald-600', dot: 'bg-emerald-400' },
  verificado_sin_perfil:    { label: 'Verificado',           bg: 'bg-blue-50',     text: 'text-blue-600',    dot: 'bg-blue-400' },
  registrado_sin_verificar: { label: 'Sin verificar',        bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  enviado_no_abierto:       { label: 'Enviado',              bg: 'bg-blue-50',     text: 'text-blue-600',    dot: 'bg-blue-400' },
  sin_contactar:            { label: 'Sin contactar',        bg: 'bg-gray-100',    text: 'text-gray-500',    dot: 'bg-gray-400' },
  bounced:                  { label: 'Rebotó',               bg: 'bg-gray-200',    text: 'text-gray-500',    dot: 'bg-gray-400' },
}

type TabId = 'all' | 'needs_reply' | 'opened' | 'clicked' | 'in_platform' | 'not_contacted' | 'discarded'

interface TabDef { id: TabId; label: string; dot: string }
const TABS: TabDef[] = [
  { id: 'needs_reply',    label: 'Necesitan respuesta',    dot: 'bg-red-500' },
  { id: 'opened',         label: 'Han abierto',            dot: 'bg-amber-500' },
  { id: 'clicked',        label: 'Hicieron click',         dot: 'bg-orange-500' },
  { id: 'in_platform',    label: 'Dentro plataforma',      dot: 'bg-emerald-500' },
  { id: 'not_contacted',  label: 'Sin contactar',          dot: 'bg-gray-400' },
  { id: 'discarded',      label: 'Descartados',            dot: 'bg-gray-300' },
  { id: 'all',            label: 'Todos',                  dot: 'bg-blue-500' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function fmtRelative(iso: string) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Ayer'
  if (d < 7)  return `Hace ${d} días`
  return fmtDate(iso)
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className ?? ''}`} />
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-3 w-20 hidden sm:block" />
          <Skeleton className="h-5 w-16 rounded-full hidden md:block" />
          <Skeleton className="h-3 w-16 hidden lg:block" />
        </div>
      ))}
    </div>
  )
}

// ── Phase badge ────────────────────────────────────────────────────────────────

function PhaseBadge({ phase, cls }: { phase: PipelinePhase; cls?: ManualClassification }) {
  // Manual classification overrides display
  if (phase === 'contestado' && cls === 'interesado') {
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Interesado</span>
  }
  if (phase === 'contestado' && cls === 'no_interesado') {
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />No interesado</span>
  }
  const cfg = phaseConfig[phase] ?? phaseConfig.sin_contactar
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Email status icon ──────────────────────────────────────────────────────────

function EmailStatusIcon({ status, opens, clicks, replies }: {
  status: PipelineContact['emailStatus']
  opens: number; clicks: number; replies: number
}) {
  const map: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    bounced:  { icon: AlertCircle,       color: 'text-gray-400',    label: 'Rebotó' },
    replied:  { icon: MailCheck,         color: 'text-emerald-600', label: `${replies} resp.` },
    clicked:  { icon: MousePointerClick, color: 'text-orange-500',  label: `${clicks} click` },
    opened:   { icon: MailOpen,          color: 'text-amber-500',   label: `${opens} apertura${opens > 1 ? 's' : ''}` },
    sent:     { icon: Mail,              color: 'text-blue-400',    label: 'Enviado' },
    not_sent: { icon: Clock,             color: 'text-gray-300',    label: 'Sin enviar' },
  }
  const cfg = map[status] ?? map.not_sent
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  )
}

// ── Slide-over collapsible section ─────────────────────────────────────────────

function SOSection({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-sm text-gray-700 break-all">{value}</p>
      </div>
    </div>
  )
}

// ── Slide-over panel ───────────────────────────────────────────────────────────

interface SlideOverProps {
  contact: PipelineContact | null
  onClose: () => void
  classification: ManualClassification | undefined
  onClassify: (cls: ManualClassification) => void
  note: string
  onNoteChange: (v: string) => void
}

function SlideOver({ contact, onClose, classification, onClassify, note, onNoteChange }: SlideOverProps) {
  const show = !!contact
  const c = contact

  if (!show || !c) return null

  const lastActivity = c.lastReply || c.lastClick || c.lastOpen || c.lastContact

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 bg-black/20 z-30 lg:hidden"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">{c.company || c.email}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{c.contact || c.email}</p>
            <div className="mt-2">
              <PhaseBadge phase={c.phase} cls={classification} />
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">

          {/* Info básica */}
          <SOSection title="Info básica">
            <InfoRow icon={Mail}     label="Email"    value={c.email} />
            <InfoRow icon={Building2} label="Empresa" value={c.company} />
            <InfoRow icon={Phone}    label="Teléfono" value={c.phone} />
            <InfoRow icon={Globe}    label="Web"      value={c.website} />
            <InfoRow icon={MapPin}   label="Ciudad"   value={c.city} />
            {c.campaignName && <InfoRow icon={Zap} label="Campaña" value={c.campaignName} />}
            {c.segment && c.segment !== 'Inbound' && (
              <InfoRow icon={Network} label="Segmento" value={c.segment} />
            )}
          </SOSection>

          {/* Historial email */}
          {c.source === 'outbound' && (
            <SOSection title="Historial email">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Aperturas', value: c.opens, color: 'text-amber-600' },
                  { label: 'Clicks',    value: c.clicks, color: 'text-orange-600' },
                  { label: 'Respuestas', value: c.replies, color: 'text-emerald-600' },
                ].map(m => (
                  <div key={m.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              {c.lastStep && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Último paso:</span> {c.lastStep}
                </div>
              )}
              {lastActivity && (
                <div className="text-xs text-gray-400">
                  Última actividad: {fmtDate(lastActivity)}
                </div>
              )}
              {c.lastOpen && <div className="text-xs text-gray-400">Abrió: {fmtDate(c.lastOpen)}</div>}
              {c.lastClick && <div className="text-xs text-gray-400">Click: {fmtDate(c.lastClick)}</div>}
              {c.lastReply && <div className="text-xs text-amber-600 font-medium">Respondió: {fmtDate(c.lastReply)}</div>}
              {c.replies > 0 && (
                <a
                  href="https://app.instantly.ai/app/unibox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-800"
                >
                  Ver conversación en Instantly <ExternalLink size={11} />
                </a>
              )}
            </SOSection>
          )}

          {/* Perfil Artiverse */}
          <SOSection title="Perfil Artiverse" defaultOpen={!!c.artiverseUser}>
            {c.artiverseUser ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.artiverseUser.subscription === 'free'
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {c.artiverseUser.subscription === 'free' ? 'Gratuito' : `Pro · ${c.artiverseUser.subscription}`}
                  </span>
                  {c.artiverseUser.hasAgency && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                      Agencia
                    </span>
                  )}
                  {c.artiverseUser.profileComplete && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                      Perfil completo
                    </span>
                  )}
                </div>
                {c.artiverseUser.agencyName && (
                  <p className="text-sm text-gray-700">{c.artiverseUser.agencyName}</p>
                )}
                {c.artiverseUser.registeredAt && (
                  <p className="text-xs text-gray-400">
                    Registrado: {fmtDate(c.artiverseUser.registeredAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No está en la plataforma todavía</p>
            )}
          </SOSection>

          {/* Notas */}
          <SOSection title="Notas">
            <textarea
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="Añade una nota sobre este contacto…"
              className="w-full h-24 text-sm text-gray-700 placeholder-gray-300 border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </SOSection>

        </div>

        {/* Clasificación manual — sticky footer */}
        <div className="border-t border-gray-100 px-5 py-4 bg-white">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Clasificación</p>
          <div className="flex gap-2">
            {(['interesado', 'pendiente', 'no_interesado'] as const).map(cls => {
              const active = classification === cls
              const colors: Record<string, string> = {
                interesado:    active ? 'bg-emerald-600 text-white border-emerald-600' : 'text-gray-500 border-gray-200 hover:border-emerald-400 hover:text-emerald-600',
                pendiente:     active ? 'bg-amber-500 text-white border-amber-500'    : 'text-gray-500 border-gray-200 hover:border-amber-400 hover:text-amber-600',
                no_interesado: active ? 'bg-gray-400 text-white border-gray-400'      : 'text-gray-500 border-gray-200 hover:border-gray-400',
              }
              const labels: Record<string, string> = {
                interesado: 'Interesado', pendiente: 'Pendiente', no_interesado: 'No interesado'
              }
              return (
                <button
                  key={cls}
                  onClick={() => onClassify(cls)}
                  className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg border transition-all ${colors[cls]}`}
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

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [data,             setData]             = useState<PipelineData | null>(null)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState<string | null>(null)
  const [lastUpdated,      setLastUpdated]      = useState('')
  const [activeTab,        setActiveTab]        = useState<TabId>('needs_reply')
  const [campaignFilter,   setCampaignFilter]   = useState<string>('')
  const [selectedContact,  setSelectedContact]  = useState<PipelineContact | null>(null)
  const [search,           setSearch]           = useState('')
  // localStorage state
  const [notes,            setNotes]            = useState<Record<string, string>>({})
  const [classifications,  setClassifications]  = useState<Record<string, ManualClassification>>({})
  const noteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load localStorage on mount
  useEffect(() => {
    try {
      const n = JSON.parse(localStorage.getItem('pipeline_notes') ?? '{}')
      const c = JSON.parse(localStorage.getItem('pipeline_cls') ?? '{}')
      setNotes(n); setClassifications(c)
    } catch { /* ignore */ }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/pipeline?token=AETHER2026')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      setData(d)
      setLastUpdated(new Date().toLocaleTimeString('es-ES'))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 3 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchData])

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
      setNotes(prev => {
        localStorage.setItem('pipeline_notes', JSON.stringify(prev))
        return prev
      })
    }, 500)
  }, [])

  // ── Derived / filtered contacts ──────────────────────────────────────────────

  const filteredContacts = useMemo(() => {
    if (!data) return []
    let list = data.contacts

    // Tab filter
    if (activeTab === 'needs_reply')   list = list.filter(c => c.phase === 'contestado')
    if (activeTab === 'opened')        list = list.filter(c => c.phase === 'abierto_no_contesta')
    if (activeTab === 'clicked')       list = list.filter(c => c.phase === 'clicked_no_registro')
    if (activeTab === 'in_platform')   list = list.filter(c => c.phase === 'dentro_plataforma' || c.phase === 'perfil_completo' || c.phase === 'verificado_sin_perfil' || c.phase === 'registrado_sin_verificar')
    if (activeTab === 'not_contacted') list = list.filter(c => c.phase === 'sin_contactar')
    if (activeTab === 'discarded')     list = list.filter(c => c.phase === 'bounced' || classifications[c.email] === 'no_interesado')

    // Campaign filter
    if (campaignFilter) list = list.filter(c => c.campaignId === campaignFilter)

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q)
      )
    }

    return list
  }, [data, activeTab, campaignFilter, search, classifications])

  // Tab counts
  const tabCounts = useMemo(() => {
    if (!data) return {} as Record<TabId, number>
    const all = data.contacts
    return {
      needs_reply:   all.filter(c => c.phase === 'contestado').length,
      opened:        all.filter(c => c.phase === 'abierto_no_contesta').length,
      clicked:       all.filter(c => c.phase === 'clicked_no_registro').length,
      in_platform:   all.filter(c => ['dentro_plataforma','perfil_completo','verificado_sin_perfil','registrado_sin_verificar'].includes(c.phase)).length,
      not_contacted: all.filter(c => c.phase === 'sin_contactar').length,
      discarded:     all.filter(c => c.phase === 'bounced' || classifications[c.email] === 'no_interesado').length,
      all:           all.length,
    }
  }, [data, classifications])

  // ── Render ────────────────────────────────────────────────────────────────────

  const stats = data?.stats

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Pipeline</h1>
            <p className="text-xs text-gray-400 mt-0.5">Vista maestra de contactos — Instantly + Artiverse</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-xs text-gray-400 hidden sm:inline">Act. {lastUpdated}</span>}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Cargando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Total outbound',    value: stats?.totalOutbound,  color: 'text-gray-900' },
            { label: 'Dentro plataforma', value: stats?.totalInPlatform, color: 'text-emerald-600' },
            { label: 'Necesitan respuesta', value: stats?.needsReply,   color: 'text-red-600' },
            { label: 'Han abierto',       value: stats?.openedNoReply,  color: 'text-amber-600' },
          ].map(m => (
            <div key={m.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              {loading && !data ? (
                <><Skeleton className="h-7 w-12 mb-1.5" /><Skeleton className="h-3 w-24" /></>
              ) : (
                <>
                  <p className={`text-2xl font-bold ${m.color}`}>{m.value ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Body (tabs + table + slide-over) ───────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Main panel */}
        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selectedContact ? 'lg:pr-[480px]' : ''}`}>

          {/* Filters bar */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 shrink-0 space-y-2.5">

            {/* Tabs — desktop: pills row, mobile: select */}
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              {TABS.map(tab => {
                const active = activeTab === tab.id
                const count  = tabCounts[tab.id]
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${tab.dot} ${active ? 'opacity-80' : ''}`} />
                    {tab.label}
                    {count !== undefined && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-white/25 text-white' : 'bg-white text-gray-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Mobile: select */}
            <select
              className="sm:hidden w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={activeTab}
              onChange={e => setActiveTab(e.target.value as TabId)}
            >
              {TABS.map(tab => (
                <option key={tab.id} value={tab.id}>
                  {tab.label} ({tabCounts[tab.id] ?? 0})
                </option>
              ))}
            </select>

            {/* Secondary filters + search */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar empresa, email…"
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              {/* Campaign pills */}
              {data?.campaigns && data.campaigns.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setCampaignFilter('')}
                    className={`text-[10px] font-medium px-2 py-1 rounded-full border transition-all ${
                      !campaignFilter ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    Todas
                  </button>
                  {data.campaigns.filter(c => c.name).map(camp => (
                    <button
                      key={camp.id}
                      onClick={() => setCampaignFilter(campaignFilter === camp.id ? '' : camp.id)}
                      className={`text-[10px] font-medium px-2 py-1 rounded-full border transition-all ${
                        campaignFilter === camp.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {camp.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto bg-white">
            {error ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <AlertCircle size={24} className="text-red-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Error cargando datos</p>
                <p className="text-xs text-gray-400 mt-1">{error}</p>
                <button onClick={fetchData} className="mt-3 text-xs text-blue-600 font-medium hover:text-blue-800">Reintentar</button>
              </div>
            ) : loading && !data ? (
              <TableSkeleton />
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <Users size={28} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-500 font-medium">No hay contactos en esta vista</p>
                <p className="text-xs text-gray-400 mt-1">Prueba con otro filtro o campaña</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <table className="hidden sm:table w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Empresa / Email</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Fase</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Campaña</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Última actividad</th>
                      <th className="px-4 py-2.5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredContacts.map(c => {
                      const cls = classifications[c.email]
                      const lastAct = c.lastReply || c.lastClick || c.lastOpen || c.lastContact
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedContact(prev => prev?.id === c.id ? null : c)}
                          className={`hover:bg-gray-50/80 cursor-pointer transition-colors group ${selectedContact?.id === c.id ? 'bg-blue-50/40' : ''}`}
                        >
                          {/* Company + email */}
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="font-semibold text-gray-900 truncate">{c.company || '—'}</p>
                            <p className="text-xs text-gray-400 truncate">{c.email}</p>
                          </td>
                          {/* Phase */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            <PhaseBadge phase={c.phase} cls={cls} />
                          </td>
                          {/* Campaign */}
                          <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                            {c.campaignName || <span className="text-gray-300">—</span>}
                          </td>
                          {/* Email status */}
                          <td className="px-4 py-3">
                            <EmailStatusIcon status={c.emailStatus} opens={c.opens} clicks={c.clicks} replies={c.replies} />
                          </td>
                          {/* Last activity */}
                          <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">
                            {fmtRelative(lastAct)}
                          </td>
                          {/* Action — visible on hover */}
                          <td className="px-4 py-3 text-right">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {c.replies > 0 ? (
                                <a
                                  href="https://app.instantly.ai/app/unibox"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-[11px] text-blue-600 font-medium flex items-center gap-0.5 hover:text-blue-800"
                                >
                                  Unibox <ExternalLink size={10} />
                                </a>
                              ) : c.artiverseUser ? (
                                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5">
                                  En plataforma <CheckCircle2 size={10} />
                                </span>
                              ) : c.opens > 0 ? (
                                <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5">
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

                {/* Mobile: cards */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {filteredContacts.map(c => {
                    const cls = classifications[c.email]
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedContact(prev => prev?.id === c.id ? null : c)}
                        className="px-4 py-3.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{c.company || c.email}</p>
                            <p className="text-xs text-gray-400 truncate">{c.email}</p>
                          </div>
                          <PhaseBadge phase={c.phase} cls={cls} />
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <EmailStatusIcon status={c.emailStatus} opens={c.opens} clicks={c.clicks} replies={c.replies} />
                          {c.campaignName && <span className="text-xs text-gray-400">{c.campaignName}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer count */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60">
                  <p className="text-xs text-gray-400">{filteredContacts.length} contacto{filteredContacts.length !== 1 ? 's' : ''}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Slide-over */}
        {selectedContact && (
          <SlideOver
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
            classification={classifications[selectedContact.email]}
            onClassify={cls => handleClassify(selectedContact.email, cls)}
            note={notes[selectedContact.email] ?? ''}
            onNoteChange={val => handleNote(selectedContact.email, val)}
          />
        )}
      </div>
    </div>
  )
}
