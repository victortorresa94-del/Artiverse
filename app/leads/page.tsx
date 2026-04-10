'use client'
import { useState, type ElementType } from 'react'
import { leads as allLeads, FUNNEL_STAGES, type FunnelStage, type EmailStatus } from '@/data/mock'
import { Search, Phone, Camera as Instagram,Mail, MessageSquare, CheckCircle2, Clock, AlertCircle, X, SlidersHorizontal, Star } from 'lucide-react'

// ── Stage badge ────────────────────────────────────────────────────────────────
const stageConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  sin_contactar:       { label: 'Sin contactar',     bg: 'bg-gray-100',        text: 'text-gray-600',    dot: 'bg-gray-400' },
  email1_enviado:      { label: 'Email 1',            bg: 'bg-blue-50',         text: 'text-blue-700',    dot: 'bg-blue-500' },
  email2_enviado:      { label: 'Email 2',            bg: 'bg-blue-100',        text: 'text-blue-800',    dot: 'bg-blue-600' },
  email3_enviado:      { label: 'Email 3',            bg: 'bg-indigo-50',       text: 'text-indigo-700',  dot: 'bg-indigo-500' },
  contactado_instagram:{ label: 'Instagram DM',       bg: 'bg-purple-50',       text: 'text-purple-700',  dot: 'bg-purple-500' },
  contactado_whatsapp: { label: 'WhatsApp',           bg: 'bg-green-50',        text: 'text-green-700',   dot: 'bg-green-500' },
  contactado_telefono: { label: 'Teléfono',           bg: 'bg-orange-50',       text: 'text-orange-700',  dot: 'bg-orange-500' },
  respondio_interesado:{ label: 'Interesado ✦',       bg: 'bg-yellow-50',       text: 'text-yellow-800',  dot: 'bg-yellow-500' },
  reunion_agendada:    { label: 'Reunión agendada',   bg: 'bg-amber-50',        text: 'text-amber-800',   dot: 'bg-amber-500' },
  dentro_plataforma:   { label: 'En plataforma ✓',   bg: 'bg-emerald-50',      text: 'text-emerald-700', dot: 'bg-emerald-500' },
  no_interesado:       { label: 'Descartado',         bg: 'bg-gray-100',        text: 'text-gray-500',    dot: 'bg-gray-400' },
}

// ── Email status badge ─────────────────────────────────────────────────────────
const emailStatusConfig: Record<EmailStatus, { label: string; icon: ElementType; color: string }> = {
  not_sent: { label: 'Sin enviar', icon: Clock,         color: 'text-gray-400' },
  sent:     { label: 'Enviado',    icon: Mail,          color: 'text-blue-500' },
  opened:   { label: 'Abierto',    icon: Mail,          color: 'text-amber-500' },
  clicked:  { label: 'Click',      icon: Mail,          color: 'text-orange-500' },
  replied:  { label: 'Respondido', icon: MessageSquare, color: 'text-emerald-600' },
  bounced:  { label: 'Rebotado',   icon: AlertCircle,   color: 'text-red-500' },
}

// ── Priority badge ─────────────────────────────────────────────────────────────
const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  alta:  { label: 'Alta',  bg: 'bg-red-50',    text: 'text-red-600' },
  media: { label: 'Media', bg: 'bg-amber-50',  text: 'text-amber-700' },
  baja:  { label: 'Baja',  bg: 'bg-gray-100',  text: 'text-gray-500' },
}

// ── View tabs ──────────────────────────────────────────────────────────────────
type ViewTab = 'all' | 'hot' | 'phone' | 'instagram' | 'opened' | 'replied' | 'platform'

const viewTabs: { id: ViewTab; label: string; icon?: ElementType }[] = [
  { id: 'all',       label: 'Todos' },
  { id: 'hot',       label: '🔥 Calientes' },
  { id: 'phone',     label: 'Con teléfono',   icon: Phone },
  { id: 'instagram', label: 'Con Instagram',  icon: Instagram },
  { id: 'opened',    label: 'Email abierto',  icon: Mail },
  { id: 'replied',   label: 'Respondidos',    icon: MessageSquare },
  { id: 'platform',  label: 'En plataforma',  icon: CheckCircle2 },
]

export default function LeadsPage() {
  const [leads, setLeads] = useState(allLeads)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<ViewTab>('all')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterSegment, setFilterSegment] = useState<string>('all')
  const [filterEmailStatus, setFilterEmailStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const segments = Array.from(new Set(allLeads.map(l => l.segment)))

  const filtered = leads.filter(l => {
    // Tab filter
    if (activeTab === 'hot' && !['respondio_interesado', 'reunion_agendada'].includes(l.stage)) return false
    if (activeTab === 'phone' && !l.phone) return false
    if (activeTab === 'instagram' && !l.instagram) return false
    if (activeTab === 'opened' && l.emailStatus !== 'opened') return false
    if (activeTab === 'replied' && l.emailStatus !== 'replied') return false
    if (activeTab === 'platform' && !l.inPlatform) return false

    // Advanced filters
    if (filterStage !== 'all' && l.stage !== filterStage) return false
    if (filterSegment !== 'all' && l.segment !== filterSegment) return false
    if (filterEmailStatus !== 'all' && l.emailStatus !== filterEmailStatus) return false
    if (filterPriority !== 'all' && l.priority !== filterPriority) return false

    // Search
    if (search) {
      const q = search.toLowerCase()
      return (
        l.company.toLowerCase().includes(q) ||
        l.contact.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
      )
    }
    return true
  })

  const updateStage = (id: string, stage: FunnelStage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l))
  }

  const togglePlatform = (id: string) => {
    setLeads(prev => prev.map(l =>
      l.id === id ? { ...l, inPlatform: !l.inPlatform, stage: !l.inPlatform ? 'dentro_plataforma' : l.stage } : l
    ))
  }

  const hasActiveFilters = filterStage !== 'all' || filterSegment !== 'all' || filterEmailStatus !== 'all' || filterPriority !== 'all'
  const clearFilters = () => {
    setFilterStage('all'); setFilterSegment('all'); setFilterEmailStatus('all'); setFilterPriority('all')
  }

  // Stats
  const statsPhone = allLeads.filter(l => l.phone).length
  const statsInstagram = allLeads.filter(l => l.instagram).length
  const statsReplied = allLeads.filter(l => l.emailStatus === 'replied').length
  const statsOpened = allLeads.filter(l => l.emailStatus === 'opened').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px]">

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Leads / CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} de {leads.length} contactos</p>
        </div>
        {/* Quick stats pills */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-gray-600">
            <Phone size={12} className="text-blue-500" /> <span className="font-semibold text-gray-900">{statsPhone}</span> con teléfono
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-gray-600">
            <Instagram size={12} className="text-purple-500" /> <span className="font-semibold text-gray-900">{statsInstagram}</span> con Instagram
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-gray-600">
            <Mail size={12} className="text-amber-500" /> <span className="font-semibold text-gray-900">{statsOpened}</span> abiertos
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-gray-600">
            <MessageSquare size={12} className="text-emerald-500" /> <span className="font-semibold text-gray-900">{statsReplied}</span> respondidos
          </div>
        </div>
      </div>

      {/* ── View Tabs ── */}
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
            {tab.icon && <tab.icon size={13} />}
            {tab.label}
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {leads.filter(l => {
                if (tab.id === 'all') return true
                if (tab.id === 'hot') return ['respondio_interesado', 'reunion_agendada'].includes(l.stage)
                if (tab.id === 'phone') return !!l.phone
                if (tab.id === 'instagram') return !!l.instagram
                if (tab.id === 'opened') return l.emailStatus === 'opened'
                if (tab.id === 'replied') return l.emailStatus === 'replied'
                if (tab.id === 'platform') return l.inPlatform
                return true
              }).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresa, contacto, email…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          >
            <option value="all">Todas las fases</option>
            {FUNNEL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          <select
            value={filterSegment}
            onChange={e => setFilterSegment(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          >
            <option value="all">Todos los segmentos</option>
            {segments.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filterEmailStatus}
            onChange={e => setFilterEmailStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          >
            <option value="all">Estado email</option>
            <option value="not_sent">Sin enviar</option>
            <option value="sent">Enviado</option>
            <option value="opened">Abierto</option>
            <option value="clicked">Click</option>
            <option value="replied">Respondido</option>
            <option value="bounced">Rebotado</option>
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          >
            <option value="all">Prioridad</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              <X size={14} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Table (desktop) ── */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Empresa', 'Contacto', 'Email', 'Canales', 'Segmento', 'Fase', 'Email status', 'Prioridad', 'Plataforma'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(l => {
                const sc = stageConfig[l.stage]
                const ec = emailStatusConfig[l.emailStatus]
                const EIcon = ec.icon
                const pc = priorityConfig[l.priority]
                const isHot = ['respondio_interesado', 'reunion_agendada'].includes(l.stage)
                return (
                  <tr
                    key={l.id}
                    className={`hover:bg-blue-50/30 transition-colors ${isHot ? 'bg-yellow-50/40' : ''}`}
                  >
                    {/* Empresa */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {l.priority === 'alta' && <Star size={13} className="text-amber-400 shrink-0" fill="currentColor" />}
                        <span className="font-semibold text-gray-900">{l.company}</span>
                      </div>
                      <span className="text-xs text-gray-400 ml-0">{l.city}</span>
                    </td>

                    {/* Contacto */}
                    <td className="px-4 py-3">
                      <p className="text-gray-700 font-medium">{l.contact}</p>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <span className="text-gray-500 text-xs font-mono">{l.email}</span>
                    </td>

                    {/* Canales — phone + instagram indicators */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${l.phone ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'}`} title={l.phone || 'Sin teléfono'}>
                          <Phone size={11} />
                        </span>
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${l.instagram ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-300'}`} title={l.instagram || 'Sin Instagram'}>
                          <Instagram size={11} />
                        </span>
                      </div>
                    </td>

                    {/* Segmento */}
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">{l.segment}</span>
                    </td>

                    {/* Fase */}
                    <td className="px-4 py-3">
                      <select
                        value={l.stage}
                        onChange={e => updateStage(l.id, e.target.value as FunnelStage)}
                        className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none font-medium appearance-none ${sc.bg} ${sc.text} border-transparent`}
                      >
                        {FUNNEL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>

                    {/* Email status */}
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${ec.color}`}>
                        <EIcon size={13} />
                        {ec.label}
                      </div>
                    </td>

                    {/* Prioridad */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${pc.bg} ${pc.text}`}>
                        {pc.label}
                      </span>
                    </td>

                    {/* Plataforma toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePlatform(l.id)}
                        className={`relative w-10 h-5 rounded-full transition-all ${l.inPlatform ? 'bg-blue-600' : 'bg-gray-200'}`}
                        title={l.inPlatform ? 'En plataforma' : 'No registrado'}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${l.inPlatform ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <SlidersHorizontal size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No hay leads con estos filtros</p>
            <p className="text-gray-400 text-sm mt-1">Prueba cambiando los filtros o la búsqueda</p>
          </div>
        )}
      </div>

      {/* ── Mobile Cards ── */}
      <div className="md:hidden space-y-3">
        {filtered.map(l => {
          const sc = stageConfig[l.stage]
          const ec = emailStatusConfig[l.emailStatus]
          const EIcon = ec.icon
          const isHot = ['respondio_interesado', 'reunion_agendada'].includes(l.stage)
          return (
            <div
              key={l.id}
              className={`bg-white rounded-xl border shadow-sm p-4 ${isHot ? 'border-yellow-200' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {l.priority === 'alta' && <Star size={13} className="text-amber-400" fill="currentColor" />}
                    <p className="font-semibold text-gray-900">{l.company}</p>
                  </div>
                  <p className="text-sm text-gray-500">{l.contact} · {l.city}</p>
                </div>
                <button
                  onClick={() => togglePlatform(l.id)}
                  className={`shrink-0 relative w-10 h-5 rounded-full transition-all ${l.inPlatform ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${l.inPlatform ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <p className="text-xs text-gray-400 font-mono mb-3">{l.email}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
                <span className={`flex items-center gap-1 text-xs font-medium ${ec.color}`}>
                  <EIcon size={12} />{ec.label}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">{l.segment}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${l.phone ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Phone size={11} /> {l.phone || 'Sin tel.'}
                  </span>
                  {l.instagram && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-purple-50 text-purple-600">
                      <Instagram size={11} /> {l.instagram}
                    </span>
                  )}
                </div>

                <select
                  value={l.stage}
                  onChange={e => updateStage(l.id, e.target.value as FunnelStage)}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 focus:outline-none bg-white"
                >
                  {FUNNEL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No hay leads con estos filtros</p>
          </div>
        )}
      </div>
    </div>
  )
}
