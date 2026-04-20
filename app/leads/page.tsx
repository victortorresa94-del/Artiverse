'use client'
import { useState, useEffect, useMemo, type ElementType } from 'react'
import { leads as mockLeads, FUNNEL_STAGES, type FunnelStage, type EmailStatus, type Segment } from '@/data/mock'
import {
  Search, Phone, Camera as Instagram, Mail, MessageSquare,
  CheckCircle2, Clock, AlertCircle, X, SlidersHorizontal,
  Star, RefreshCw, Zap, ChevronDown, Loader2,
} from 'lucide-react'

// ── Stage config ──────────────────────────────────────────────────────────────
const stageConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  sin_contactar:        { label: 'Sin contactar',   bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400' },
  email1_enviado:       { label: 'Email 1',          bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  email2_enviado:       { label: 'Email 2',          bg: 'bg-blue-100',   text: 'text-blue-800',    dot: 'bg-blue-600' },
  email3_enviado:       { label: 'Email 3',          bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500' },
  contactado_instagram: { label: 'Instagram DM',     bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500' },
  contactado_whatsapp:  { label: 'WhatsApp',         bg: 'bg-green-50',   text: 'text-green-700',   dot: 'bg-green-500' },
  contactado_telefono:  { label: 'Teléfono',         bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  respondio_interesado: { label: 'Interesado ✦',     bg: 'bg-yellow-50',  text: 'text-yellow-800',  dot: 'bg-yellow-500' },
  reunion_agendada:     { label: 'Reunión agendada', bg: 'bg-amber-50',   text: 'text-amber-800',   dot: 'bg-amber-500' },
  dentro_plataforma:    { label: 'En plataforma ✓',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  no_interesado:        { label: 'Descartado',       bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400' },
}

const emailStatusConfig: Record<EmailStatus, { label: string; icon: ElementType; color: string }> = {
  not_sent: { label: 'Sin enviar', icon: Clock,          color: 'text-gray-400' },
  sent:     { label: 'Enviado',    icon: Mail,           color: 'text-blue-500' },
  opened:   { label: 'Abierto',    icon: Mail,           color: 'text-amber-500' },
  clicked:  { label: 'Click',      icon: Mail,           color: 'text-orange-500' },
  replied:  { label: 'Respondido', icon: MessageSquare,  color: 'text-emerald-600' },
  bounced:  { label: 'Rebotado',   icon: AlertCircle,    color: 'text-red-500' },
}

const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  alta:  { label: 'Alta',  bg: 'bg-red-50',   text: 'text-red-600' },
  media: { label: 'Media', bg: 'bg-amber-50', text: 'text-amber-700' },
  baja:  { label: 'Baja',  bg: 'bg-gray-100', text: 'text-gray-500' },
}

// ── Instantly → Lead mapper ───────────────────────────────────────────────────
interface RawLead {
  id: string
  email: string
  first_name?: string
  last_name?: string
  company_name?: string
  organization?: string
  phone?: string
  city?: string
  country?: string
  status?: number           // 0=fresh, 1=active, 2=paused, -1=bounced/unsub
  lt_interest_status?: number  // 0=none, 1=reply, 2=interested, 3=meeting
  email_open_count?: number
  email_click_count?: number
  email_reply_count?: number
  last_email_sent_time?: string
  timestamp_created?: string
  variables?: Record<string, string>
}

type CRMLead = {
  id: string; company: string; contact: string; email: string
  phone: string; instagram: string; city: string; segment: string
  stage: FunnelStage; emailStatus: EmailStatus
  lastContact: string; nextAction: string; notes: string
  inPlatform: boolean; priority: 'alta' | 'media' | 'baja'
  campaignId: string; opens: number; clicks: number; replies: number
}

function mapLead(raw: RawLead, campaignId: string, segment: string): CRMLead {
  const opens   = raw.email_open_count  ?? 0
  const clicks  = raw.email_click_count ?? 0
  const replies = raw.email_reply_count ?? 0
  const sent    = !!raw.last_email_sent_time
  const bounced = raw.status === -1

  const emailStatus: EmailStatus =
    bounced   ? 'bounced'  :
    replies   ? 'replied'  :
    clicks    ? 'clicked'  :
    opens     ? 'opened'   :
    sent      ? 'sent'     : 'not_sent'

  const interest = raw.lt_interest_status ?? 0
  const stage: FunnelStage =
    interest >= 3 ? 'reunion_agendada'    :
    interest >= 2 ? 'respondio_interesado':
    interest >= 1 ? 'respondio_interesado':
    replies       ? 'respondio_interesado':
    sent          ? 'email1_enviado'      : 'sin_contactar'

  const priority: 'alta' | 'media' | 'baja' =
    interest >= 2 || replies > 0 ? 'alta' :
    opens > 0                     ? 'media': 'baja'

  const lastContact = raw.last_email_sent_time
    ? new Date(raw.last_email_sent_time).toISOString().split('T')[0]
    : '-'

  const nextAction =
    stage === 'reunion_agendada'     ? 'Confirmar reunión' :
    stage === 'respondio_interesado' ? 'Llamar / seguimiento' :
    emailStatus === 'opened'         ? 'Enviar email 2' :
    emailStatus === 'bounced'        ? 'Verificar email' :
    sent                             ? 'Esperar respuesta' : '-'

  return {
    id: raw.id,
    company: raw.company_name || raw.organization || raw.variables?.companyName || '',
    contact: [raw.first_name, raw.last_name].filter(Boolean).join(' '),
    email: raw.email,
    phone: raw.phone || raw.variables?.phone || '',
    instagram: raw.variables?.instagram || '',
    city: raw.city || raw.variables?.city || raw.country || '',
    segment,
    stage,
    emailStatus,
    lastContact,
    nextAction,
    notes: '',
    inPlatform: false,
    priority,
    campaignId,
    opens, clicks, replies,
  }
}

// ── View tabs ──────────────────────────────────────────────────────────────────
type ViewTab = 'all' | 'hot' | 'opened' | 'replied' | 'platform' | 'phone'

const viewTabs: { id: ViewTab; label: string }[] = [
  { id: 'all',      label: 'Todos' },
  { id: 'hot',      label: '🔥 Calientes' },
  { id: 'opened',   label: 'Email abierto' },
  { id: 'replied',  label: 'Respondidos' },
  { id: 'platform', label: 'En plataforma' },
  { id: 'phone',    label: 'Con teléfono' },
]

// ── Types for Instantly campaigns ─────────────────────────────────────────────
type LiveCampaign = { id: string; name: string; status: string }

export default function LeadsPage() {
  // ── Data sources ────────────────────────────────────────────────────────────
  const [liveMode, setLiveMode]           = useState(false)
  const [liveCampaigns, setLiveCampaigns] = useState<LiveCampaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [liveLeads, setLiveLeads]         = useState<CRMLead[]>([])
  const [loading, setLoading]             = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [hasMore, setHasMore]             = useState(false)
  const [lastId, setLastId]               = useState<string | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [segment, setSegment]             = useState('Teatro-Danza')

  // ── Local state (works on both sources) ─────────────────────────────────────
  const [mockLeadsState, setMockLeadsState] = useState(mockLeads)
  const [search, setSearch]               = useState('')
  const [activeTab, setActiveTab]         = useState<ViewTab>('all')
  const [filterStage, setFilterStage]     = useState<string>('all')
  const [filterEmailStatus, setFilterEmailStatus] = useState<string>('all')

  // ── Source selection ────────────────────────────────────────────────────────
  const allLeads: CRMLead[] = liveMode
    ? liveLeads
    : mockLeadsState.map(l => ({ ...l, opens: 0, clicks: 0, replies: l.emailStatus === 'replied' ? 1 : 0 }))

  // ── Load real campaigns from Instantly ──────────────────────────────────────
  async function loadCampaigns() {
    setLoadingCampaigns(true)
    setError(null)
    try {
      const res = await fetch('/api/campaigns')
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data = await res.json()
      const camps: LiveCampaign[] = (Array.isArray(data) ? data : []).map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
      }))
      setLiveCampaigns(camps)
      if (camps.length > 0 && !selectedCampaign) setSelectedCampaign(camps[0].id)
    } catch (e: any) {
      setError('No se pudo conectar con Instantly: ' + e.message)
    } finally {
      setLoadingCampaigns(false)
    }
  }

  // ── Load leads for selected campaign ────────────────────────────────────────
  async function loadLeads(append = false) {
    if (!selectedCampaign) return
    setLoading(true)
    setError(null)
    try {
      const body: any = { campaignId: selectedCampaign, limit: 100 }
      if (append && lastId) body.startingAfter = lastId
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data = await res.json()
      const items: RawLead[] = Array.isArray(data) ? data : (data.items ?? [])
      const mapped = items.map(l => mapLead(l, selectedCampaign, segment))
      setLiveLeads(prev => append ? [...prev, ...mapped] : mapped)
      setHasMore(items.length === 100)
      setLastId(items[items.length - 1]?.id ?? null)
    } catch (e: any) {
      setError('Error cargando leads: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Activate live mode ───────────────────────────────────────────────────────
  function activateLive() {
    setLiveMode(true)
    loadCampaigns()
  }

  useEffect(() => {
    if (liveMode && selectedCampaign) {
      setLiveLeads([])
      setLastId(null)
      loadLeads(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaign, liveMode])

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allLeads.filter(l => {
      if (activeTab === 'hot'      && !['respondio_interesado', 'reunion_agendada'].includes(l.stage)) return false
      if (activeTab === 'opened'   && l.emailStatus !== 'opened')  return false
      if (activeTab === 'replied'  && l.emailStatus !== 'replied') return false
      if (activeTab === 'platform' && !l.inPlatform)               return false
      if (activeTab === 'phone'    && !l.phone)                    return false
      if (filterStage !== 'all'       && l.stage       !== filterStage)       return false
      if (filterEmailStatus !== 'all' && l.emailStatus !== filterEmailStatus) return false
      if (search) {
        const q = search.toLowerCase()
        return l.company.toLowerCase().includes(q) || l.contact.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.city.toLowerCase().includes(q)
      }
      return true
    })
  }, [allLeads, search, activeTab, filterStage, filterEmailStatus])

  // ── Counts ──────────────────────────────────────────────────────────────────
  const tabCount = (tab: ViewTab) => allLeads.filter(l => {
    if (tab === 'all')      return true
    if (tab === 'hot')      return ['respondio_interesado', 'reunion_agendada'].includes(l.stage)
    if (tab === 'opened')   return l.emailStatus === 'opened'
    if (tab === 'replied')  return l.emailStatus === 'replied'
    if (tab === 'platform') return l.inPlatform
    if (tab === 'phone')    return !!l.phone
    return true
  }).length

  const statsOpened  = allLeads.filter(l => l.emailStatus === 'opened').length
  const statsReplied = allLeads.filter(l => l.emailStatus === 'replied').length
  const statsHot     = allLeads.filter(l => ['respondio_interesado', 'reunion_agendada'].includes(l.stage)).length

  const updateMockStage = (id: string, stage: FunnelStage) => {
    setMockLeadsState(prev => prev.map(l => l.id === id ? { ...l, stage } : l))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Leads / CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} de {allLeads.length} contactos</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stats pills */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-gray-600">
            <Mail size={12} className="text-amber-500" /> <span className="font-semibold text-gray-900">{statsOpened}</span> abiertos
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-gray-600">
            <MessageSquare size={12} className="text-emerald-500" /> <span className="font-semibold text-gray-900">{statsReplied}</span> respondidos
          </div>
          {statsHot > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 rounded-full border border-yellow-200 text-xs text-yellow-700">
              🔥 <span className="font-semibold">{statsHot}</span> calientes
            </div>
          )}

          {/* Live mode toggle */}
          {!liveMode ? (
            <button
              onClick={activateLive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Zap size={12} /> Cargar datos reales
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
              <button
                onClick={() => loadLeads(false)}
                disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-indigo-300 transition-colors"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Live: campaign selector ──────────────────────────────────────────── */}
      {liveMode && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {loadingCampaigns ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" /> Cargando campañas...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaña</label>
                <select
                  value={selectedCampaign}
                  onChange={e => setSelectedCampaign(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium focus:outline-none focus:border-indigo-400 min-w-[220px]"
                >
                  {liveCampaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Segmento</label>
                <select
                  value={segment}
                  onChange={e => setSegment(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-indigo-400"
                >
                  <option>Teatro-Danza</option>
                  <option>Salas Conciertos</option>
                  <option>Festivales</option>
                  <option>Dance from Spain</option>
                  <option>Socios ARTE</option>
                  <option>Distribuidoras</option>
                </select>
              </div>
              {loading && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Loader2 size={13} className="animate-spin" /> Cargando {liveLeads.length} leads...
                </span>
              )}
            </>
          )}
          {error && (
            <div className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex gap-1.5 flex-wrap">
        {viewTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {tab.label}
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}>{tabCount(tab.id)}</span>
          </button>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Empresa, contacto, email…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          />
        </div>
        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400"
        >
          <option value="all">Todas las fases</option>
          {FUNNEL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select
          value={filterEmailStatus}
          onChange={e => setFilterEmailStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400"
        >
          <option value="all">Estado email</option>
          <option value="not_sent">Sin enviar</option>
          <option value="sent">Enviado</option>
          <option value="opened">Abierto</option>
          <option value="clicked">Click</option>
          <option value="replied">Respondido</option>
          <option value="bounced">Rebotado</option>
        </select>
        {(filterStage !== 'all' || filterEmailStatus !== 'all') && (
          <button
            onClick={() => { setFilterStage('all'); setFilterEmailStatus('all') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-500 border border-red-200 hover:bg-red-50"
          >
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────────────── */}
      {loading && liveLeads.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-50 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-32" />
              <div className="h-4 bg-gray-100 rounded w-24" />
              <div className="h-4 bg-gray-100 rounded w-48" />
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="h-4 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {/* ── Table (desktop) ──────────────────────────────────────────────────── */}
      {(!loading || liveLeads.length > 0) && (
        <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Empresa', 'Contacto', 'Email', 'Canales', 'Fase', 'Email status', 'Apertura', 'Prioridad', 'Plataforma'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(l => {
                  const sc  = stageConfig[l.stage] ?? stageConfig['sin_contactar']
                  const ec  = emailStatusConfig[l.emailStatus]
                  const EIcon = ec.icon
                  const pc  = priorityConfig[l.priority]
                  const isHot = ['respondio_interesado', 'reunion_agendada'].includes(l.stage)
                  return (
                    <tr key={l.id} className={`hover:bg-blue-50/30 transition-colors ${isHot ? 'bg-yellow-50/40' : ''}`}>
                      {/* Empresa */}
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-1.5">
                          {l.priority === 'alta' && <Star size={12} className="text-amber-400 shrink-0" fill="currentColor" />}
                          <span className="font-semibold text-gray-900 truncate max-w-[180px]">{l.company || '—'}</span>
                        </div>
                        {l.city && <span className="text-xs text-gray-400">{l.city}</span>}
                      </td>
                      {/* Contacto */}
                      <td className="px-4 py-3">
                        <p className="text-gray-700 font-medium text-xs">{l.contact || '—'}</p>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3 min-w-[180px]">
                        <span className="text-gray-500 text-xs font-mono">{l.email}</span>
                      </td>
                      {/* Canales */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-full ${l.phone ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'}`}>
                            <Phone size={10} />
                          </span>
                          <span className={`flex items-center justify-center w-6 h-6 rounded-full ${l.instagram ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-300'}`}>
                            <Instagram size={10} />
                          </span>
                        </div>
                      </td>
                      {/* Fase */}
                      <td className="px-4 py-3">
                        {liveMode ? (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                        ) : (
                          <select
                            value={l.stage}
                            onChange={e => updateMockStage(l.id, e.target.value as FunnelStage)}
                            className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none font-medium appearance-none ${sc.bg} ${sc.text} border-transparent`}
                          >
                            {FUNNEL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        )}
                      </td>
                      {/* Email status */}
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${ec.color}`}>
                          <EIcon size={13} /> {ec.label}
                        </div>
                      </td>
                      {/* Aperturas */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {l.opens > 0 && <span className="text-amber-600 font-medium">{l.opens} 👁</span>}
                          {l.replies > 0 && <span className="text-emerald-600 font-medium">{l.replies} ✉</span>}
                          {l.opens === 0 && l.replies === 0 && <span className="text-gray-300">—</span>}
                        </div>
                      </td>
                      {/* Prioridad */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${pc.bg} ${pc.text}`}>{pc.label}</span>
                      </td>
                      {/* Plataforma */}
                      <td className="px-4 py-3">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${l.inPlatform ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-300'}`}>
                          <CheckCircle2 size={13} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && !loading && (
            <div className="py-16 text-center">
              <SlidersHorizontal size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No hay leads con estos filtros</p>
            </div>
          )}

          {/* Load more */}
          {liveMode && hasMore && !loading && (
            <div className="border-t border-gray-100 px-4 py-3 text-center">
              <button
                onClick={() => loadLeads(true)}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium transition-colors"
              >
                <ChevronDown size={15} /> Cargar más leads
              </button>
            </div>
          )}
          {liveMode && loading && liveLeads.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3 text-center">
              <span className="flex items-center gap-2 mx-auto w-fit text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Cargando más…
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Mobile Cards ─────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {filtered.map(l => {
          const sc = stageConfig[l.stage] ?? stageConfig['sin_contactar']
          const ec = emailStatusConfig[l.emailStatus]
          const EIcon = ec.icon
          const isHot = ['respondio_interesado', 'reunion_agendada'].includes(l.stage)
          return (
            <div key={l.id} className={`bg-white rounded-xl border shadow-sm p-4 ${isHot ? 'border-yellow-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="flex items-center gap-1.5">
                    {l.priority === 'alta' && <Star size={12} className="text-amber-400" fill="currentColor" />}
                    <p className="font-semibold text-gray-900">{l.company || '—'}</p>
                  </div>
                  {l.contact && <p className="text-xs text-gray-500">{l.contact} {l.city ? `· ${l.city}` : ''}</p>}
                </div>
                {(l.opens > 0 || l.replies > 0) && (
                  <div className="flex gap-1 text-xs ml-2 shrink-0">
                    {l.opens > 0 && <span className="text-amber-600">{l.opens}👁</span>}
                    {l.replies > 0 && <span className="text-emerald-600">{l.replies}✉</span>}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono mb-3">{l.email}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                <span className={`flex items-center gap-1 text-[10px] font-medium ${ec.color}`}><EIcon size={10} />{ec.label}</span>
              </div>
              {l.nextAction && l.nextAction !== '-' && (
                <p className="text-xs text-indigo-600 font-medium">{l.nextAction}</p>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && !loading && (
          <div className="py-12 text-center bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No hay leads con estos filtros</p>
          </div>
        )}
      </div>
    </div>
  )
}
