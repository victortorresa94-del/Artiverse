'use client'
import { useState, useMemo } from 'react'
import {
  platformUsers as initialUsers,
  INBOUND_STAGES,
  type PlatformUser,
  type InboundStage,
  type UserSource,
  type Subscription,
} from '@/data/mock'
import {
  Search, UserPlus, Mail, CheckCircle2, AlertCircle, Building2,
  ExternalLink, X, Clock, ArrowRight, Star, CreditCard,
} from 'lucide-react'

const sourceConfig: Record<UserSource, { label: string; bg: string; text: string }> = {
  outreach:  { label: 'Outreach',    bg: 'bg-blue-50',   text: 'text-blue-700' },
  organic:   { label: 'Orgánico',    bg: 'bg-green-50',  text: 'text-green-700' },
  referral:  { label: 'Referido',    bg: 'bg-purple-50', text: 'text-purple-700' },
  unknown:   { label: 'Desconocido', bg: 'bg-gray-100',  text: 'text-gray-500' },
}

const stageConfig: Record<InboundStage, { label: string; bg: string; text: string; dot: string }> = {
  registrado:         { label: 'Registrado',         bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500' },
  perfil_incompleto:  { label: 'Perfil incompleto',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  perfil_completo:    { label: 'Perfil completo',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  bienvenida_enviada: { label: 'Bienvenida enviada', bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  activo:             { label: 'Activo',             bg: 'bg-green-50',   text: 'text-green-700',   dot: 'bg-green-500' },
  inactivo:           { label: 'Inactivo',           bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400' },
}

const subConfig: Record<Subscription, { label: string; bg: string; text: string }> = {
  free:     { label: 'Free',     bg: 'bg-gray-100',    text: 'text-gray-500' },
  pro:      { label: 'Pro',      bg: 'bg-amber-50',    text: 'text-amber-700' },
  business: { label: 'Business', bg: 'bg-indigo-50',   text: 'text-indigo-700' },
  custom:   { label: 'Custom',   bg: 'bg-purple-50',   text: 'text-purple-700' },
}

type MainView = 'usuarios' | 'agencias'
type ViewTab  = 'all' | 'recent' | 'outreach' | 'organic' | 'incomplete' | 'active'

const viewTabs: { id: ViewTab; label: string }[] = [
  { id: 'all',        label: 'Todos' },
  { id: 'recent',     label: 'Recientes' },
  { id: 'outreach',   label: 'De mails' },
  { id: 'organic',    label: 'Orgánicos' },
  { id: 'incomplete', label: 'Perfil incompleto' },
  { id: 'active',     label: 'Activos' },
]

export default function UsuariosPage() {
  const [users, setUsers]         = useState(initialUsers)
  const [search, setSearch]       = useState('')
  const [mainView, setMainView]   = useState<MainView>('usuarios')
  const [activeTab, setActiveTab] = useState<ViewTab>('all')
  const [filterStage, setFilterStage]   = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [expanded, setExpanded]   = useState<string | null>(null)

  const updateStage = (id: string, stage: InboundStage) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, inboundStage: stage } : u))
  }

  const updateNextAction = (id: string, nextAction: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, nextAction } : u))
  }

  const basePool = useMemo(() =>
    mainView === 'agencias' ? users.filter(u => u.hasAgency) : users,
    [users, mainView]
  )

  const filtered = useMemo(() => {
    return basePool.filter(u => {
      if (activeTab === 'recent') {
        const d = new Date(u.registeredAt)
        const week = new Date(); week.setDate(week.getDate() - 7)
        if (d < week) return false
      }
      if (activeTab === 'outreach' && u.source !== 'outreach') return false
      if (activeTab === 'organic' && u.source !== 'organic') return false
      if (activeTab === 'incomplete' && u.inboundStage !== 'perfil_incompleto') return false
      if (activeTab === 'active' && u.inboundStage !== 'activo') return false
      if (filterStage !== 'all' && u.inboundStage !== filterStage) return false
      if (filterSource !== 'all' && u.source !== filterSource) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          u.email.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          u.company.toLowerCase().includes(q) ||
          (u.agencyName || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [basePool, search, activeTab, filterStage, filterSource])

  const total        = basePool.length
  const fromOutreach = basePool.filter(u => u.source === 'outreach').length
  const fromOrganic  = basePool.filter(u => u.source === 'organic' || u.source === 'referral').length
  const incomplete   = basePool.filter(u => u.inboundStage === 'perfil_incompleto').length
  const active       = basePool.filter(u => u.inboundStage === 'activo').length
  const unverified   = basePool.filter(u => !u.emailVerified).length

  const tabCounts: Record<ViewTab, number> = {
    all: total,
    recent: basePool.filter(u => { const d = new Date(u.registeredAt); const w = new Date(); w.setDate(w.getDate() - 7); return d >= w }).length,
    outreach: fromOutreach,
    organic: fromOrganic,
    incomplete,
    active,
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px]">

      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Contactos registrados en Artiverse</p>
        </div>

        {/* Main view toggle */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setMainView('usuarios'); setActiveTab('all') }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mainView === 'usuarios' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Usuarios
            </button>
            <button
              onClick={() => { setMainView('agencias'); setActiveTab('all') }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mainView === 'agencias' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Agencias
            </button>
          </div>

          {/* Quick stats */}
          <div className="hidden sm:flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-gray-600">
              <UserPlus size={12} className="text-indigo-500" />
              <span className="font-semibold text-gray-900">{total}</span> total
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-gray-600">
              <Mail size={12} className="text-blue-500" />
              <span className="font-semibold text-gray-900">{fromOutreach}</span> mails
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-gray-600">
              <ExternalLink size={12} className="text-green-500" />
              <span className="font-semibold text-gray-900">{fromOrganic}</span> orgánicos
            </div>
            {unverified > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full border border-red-200 text-xs text-red-600">
                <AlertCircle size={12} />
                <span className="font-semibold">{unverified}</span> sin verificar
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inbound Stage Progress */}
      <div className="mb-5 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {INBOUND_STAGES.map(stage => {
          const count = basePool.filter(u => u.inboundStage === stage.id).length
          const sc = stageConfig[stage.id]
          return (
            <button
              key={stage.id}
              onClick={() => setFilterStage(filterStage === stage.id ? 'all' : stage.id)}
              className={`p-3 rounded-xl border transition-all text-left ${
                filterStage === stage.id
                  ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                <span className="text-[10px] font-medium text-gray-500 truncate">{sc.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1.5 flex-wrap">
        {viewTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {tab.label}
            <span className={`font-semibold px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}>{tabCounts[tab.id]}</span>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Email, nombre, empresa..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          />
        </div>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-indigo-400"
        >
          <option value="all">Todas las fuentes</option>
          <option value="outreach">De mails</option>
          <option value="organic">Orgánico</option>
          <option value="referral">Referido</option>
        </select>
        {(filterStage !== 'all' || filterSource !== 'all') && (
          <button
            onClick={() => { setFilterStage('all'); setFilterSource('all') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-500 border border-red-200 hover:bg-red-50"
          >
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {(mainView === 'agencias'
                  ? ['Email', 'Empresa / Agencia', 'Suscripción', 'Fuente', 'Fase inbound', 'Verificado', 'Perfil', 'Promotor', 'Acción']
                  : ['Email', 'Empresa', 'Suscripción', 'Fuente', 'Campaña', 'Fase inbound', 'Verificado', 'Perfil', 'Promotor', 'Agencia', 'Acción']
                ).map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => {
                const src = sourceConfig[u.source]
                const sc  = stageConfig[u.inboundStage]
                const sub = subConfig[u.subscription]
                const isExpanded = expanded === u.id
                return (
                  <>
                    <tr
                      key={u.id}
                      onClick={() => setExpanded(isExpanded ? null : u.id)}
                      className={`cursor-pointer transition-colors ${
                        !u.emailVerified ? 'bg-red-50/30' : isExpanded ? 'bg-indigo-50/30' : 'hover:bg-gray-50/50'
                      }`}
                    >
                      {/* Email */}
                      <td className="px-4 py-3 min-w-[180px]">
                        <span className="text-gray-800 font-mono text-xs">{u.email}</span>
                        {u.name && <p className="text-xs text-gray-400 mt-0.5">{u.name}</p>}
                      </td>

                      {/* Empresa */}
                      <td className="px-4 py-3 min-w-[130px]">
                        <span className="text-gray-700 font-medium text-xs">{u.company || '-'}</span>
                        {mainView === 'agencias' && u.agencyName && (
                          <p className="text-[10px] text-indigo-500 mt-0.5">{u.agencyName}</p>
                        )}
                      </td>

                      {/* Suscripción */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.bg} ${sub.text}`}>
                          {sub.label}
                        </span>
                      </td>

                      {/* Fuente */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${src.bg} ${src.text}`}>
                          {src.label}
                        </span>
                      </td>

                      {/* Campaña — solo en vista usuarios */}
                      {mainView === 'usuarios' && (
                        <td className="px-4 py-3 min-w-[110px]">
                          {u.sourceCampaign ? (
                            <span className="text-xs text-gray-500">{u.sourceCampaign}</span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                          {u.sourceSegment && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{u.sourceSegment}</p>
                          )}
                        </td>
                      )}

                      {/* Fase inbound */}
                      <td className="px-4 py-3">
                        <select
                          value={u.inboundStage}
                          onChange={e => { e.stopPropagation(); updateStage(u.id, e.target.value as InboundStage) }}
                          onClick={e => e.stopPropagation()}
                          className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none font-medium appearance-none ${sc.bg} ${sc.text} border-transparent`}
                        >
                          {INBOUND_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </td>

                      {/* Verificado */}
                      <td className="px-4 py-3 text-center">
                        {u.emailVerified
                          ? <CheckCircle2 size={15} className="text-green-500 mx-auto" />
                          : <AlertCircle size={15} className="text-red-400 mx-auto" />
                        }
                      </td>

                      {/* Perfil completo */}
                      <td className="px-4 py-3 text-center">
                        {u.profileComplete
                          ? <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />
                          : <span className="text-xs text-gray-300">-</span>
                        }
                      </td>

                      {/* Promotor */}
                      <td className="px-4 py-3 text-center">
                        {u.isPromotor
                          ? <Star size={14} className="text-amber-400 mx-auto" fill="currentColor" />
                          : <span className="text-xs text-gray-300">-</span>
                        }
                      </td>

                      {/* Agencia — solo en vista usuarios */}
                      {mainView === 'usuarios' && (
                        <td className="px-4 py-3">
                          {u.hasAgency ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 size={13} className="text-indigo-500" />
                              <span className="text-xs text-gray-700">{u.agencyName || 'Sí'}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                      )}

                      {/* Acción */}
                      <td className="px-4 py-3 min-w-[120px]">
                        {u.nextAction && u.nextAction !== '-' ? (
                          <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                            <ArrowRight size={11} />
                            {u.nextAction}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr key={`${u.id}-exp`}>
                        <td colSpan={mainView === 'agencias' ? 9 : 11} className="p-0">
                          <div className="border-t border-indigo-100 bg-indigo-50/30 px-6 py-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-gray-400 font-medium mb-1">Notas</p>
                                <p className="text-gray-700">{u.notes || 'Sin notas'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-1">Siguiente acción</p>
                                <input
                                  value={u.nextAction}
                                  onChange={e => updateNextAction(u.id, e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-indigo-400"
                                />
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-1">Fuente campaña</p>
                                <p className="text-gray-700">{u.sourceCampaign || '-'} {u.sourceSegment ? `(${u.sourceSegment})` : ''}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-1">Agencia</p>
                                <p className="text-gray-700">{u.hasAgency ? (u.agencyName || 'Sí, sin nombre') : 'No tiene'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-1">Registro</p>
                                <div className="flex items-center gap-1 text-gray-700">
                                  <Clock size={11} />
                                  {u.registeredAt || 'Desconocido'}
                                </div>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-1">Suscripción</p>
                                <span className={`px-2 py-0.5 rounded-full font-medium ${subConfig[u.subscription].bg} ${subConfig[u.subscription].text}`}>
                                  {subConfig[u.subscription].label}
                                </span>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-1">Perfil completo</p>
                                <p className="text-gray-700">{u.profileComplete ? 'Sí' : 'No'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-1">Promotor</p>
                                <p className="text-gray-700">{u.isPromotor ? 'Sí' : 'No'}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <UserPlus size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No hay usuarios con estos filtros</p>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(u => {
          const src = sourceConfig[u.source]
          const sc  = stageConfig[u.inboundStage]
          const sub = subConfig[u.subscription]
          return (
            <div key={u.id} className={`bg-white rounded-xl border shadow-sm p-4 ${!u.emailVerified ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-gray-800 truncate">{u.email}</p>
                  {u.company && <p className="text-xs text-gray-500 mt-0.5">{u.company}</p>}
                </div>
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  {u.isPromotor && <Star size={12} className="text-amber-400" fill="currentColor" />}
                  {!u.emailVerified && <AlertCircle size={14} className="text-red-400" />}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${src.bg} ${src.text}`}>{src.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sub.bg} ${sub.text}`}>{sub.label}</span>
                {u.hasAgency && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                    {u.agencyName || 'Agencia'}
                  </span>
                )}
                {u.profileComplete && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Perfil ✓</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{u.registeredAt}</span>
                {u.nextAction && u.nextAction !== '-' && (
                  <span className="text-indigo-600 font-medium truncate ml-2">{u.nextAction}</span>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No hay usuarios con estos filtros</p>
          </div>
        )}
      </div>
    </div>
  )
}
