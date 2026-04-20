'use client'
import { useState, useMemo } from 'react'
import {
  leads as initialLeads,
  platformUsers as initialUsers,
  FUNNEL_STAGES,
  INBOUND_STAGES,
  type Lead,
  type FunnelStage,
  type PlatformUser,
  type InboundStage,
  type Segment,
} from '@/data/mock'

type FunnelView = 'outreach' | 'inbound'

const SEGMENTS: { id: string; label: string }[] = [
  { id: 'all', label: 'Todos los segmentos' },
  { id: 'Teatro-Danza',     label: 'Teatro-Danza' },
  { id: 'Salas Conciertos', label: 'Salas Conciertos' },
  { id: 'Dance from Spain', label: 'Dance from Spain' },
  { id: 'Festivales',       label: 'Festivales' },
  { id: 'Socios ARTE',      label: 'Socios ARTE' },
  { id: 'Distribuidoras',   label: 'Distribuidoras' },
]

const channelEmoji: Record<string, string> = {
  email: '✉️', whatsapp: '💬', instagram: '📸', telefono: '📞'
}

const sourceEmoji: Record<string, string> = {
  outreach: '✉️', organic: '🌱', referral: '🔗', unknown: '❓'
}

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (id: string, stage: FunnelStage) => void }) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div className={`bg-white border rounded-xl p-3 text-xs cursor-pointer relative shadow-sm ${
      lead.priority === 'alta' ? 'border-amber-300' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className={`font-semibold leading-tight ${lead.priority === 'alta' ? 'text-amber-800' : 'text-gray-900'}`}>{lead.company}</p>
        {lead.priority === 'alta' && <span className="text-amber-400 text-[10px] shrink-0">★</span>}
      </div>
      {lead.city && <p className="text-gray-400 mb-1.5 text-[10px]">{lead.city}</p>}
      <div className="flex items-center justify-between">
        <span className="text-gray-400">{channelEmoji[lead.channel]}</span>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-blue-500 hover:text-blue-700 transition-colors text-[10px] px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 font-medium"
        >
          Mover →
        </button>
      </div>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl py-1.5 w-48 shadow-xl">
          {FUNNEL_STAGES.filter(s => s.id !== lead.stage).map(s => (
            <button
              key={s.id}
              onClick={() => { onMove(lead.id, s.id); setShowMenu(false) }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function UserCard({ user, onMove }: { user: PlatformUser; onMove: (id: string, stage: InboundStage) => void }) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div className={`bg-white border rounded-xl p-3 text-xs cursor-pointer relative shadow-sm ${
      !user.emailVerified ? 'border-red-300' : user.hasAgency ? 'border-indigo-200' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold leading-tight text-gray-900 truncate">
          {user.company || user.name || user.email.split('@')[0]}
        </p>
        {!user.emailVerified && <span className="text-red-400 text-[10px] shrink-0">!</span>}
      </div>
      <p className="text-gray-400 mb-1 text-[10px] truncate">{user.email}</p>
      {user.hasAgency && (
        <p className="text-indigo-500 mb-1 text-[10px]">{user.agencyName || 'Agencia'}</p>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-gray-400 text-[10px]">{sourceEmoji[user.source]} {user.source}</span>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-indigo-500 hover:text-indigo-700 transition-colors text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 font-medium"
        >
          Mover →
        </button>
      </div>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl py-1.5 w-48 shadow-xl">
          {INBOUND_STAGES.filter(s => s.id !== user.inboundStage).map(s => (
            <button
              key={s.id}
              onClick={() => { onMove(user.id, s.id); setShowMenu(false) }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FunnelPage() {
  const [funnelView, setFunnelView] = useState<FunnelView>('outreach')
  const [leads, setLeads] = useState(initialLeads)
  const [users, setUsers] = useState(initialUsers)
  const [segment, setSegment] = useState<string>('all')

  const moveCard = (id: string, newStage: FunnelStage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l))
  }

  const moveUser = (id: string, newStage: InboundStage) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, inboundStage: newStage } : u))
  }

  const filteredLeads = useMemo(() =>
    segment === 'all' ? leads : leads.filter(l => l.segment === segment),
    [leads, segment]
  )

  const filteredUsers = useMemo(() => {
    if (segment === 'all') return users
    return users.filter(u => u.sourceSegment === segment)
  }, [users, segment])

  const segCounts = useMemo(() =>
    SEGMENTS.slice(1).reduce<Record<string, number>>((acc, s) => {
      acc[s.id] = funnelView === 'outreach'
        ? leads.filter(l => l.segment === s.id).length
        : users.filter(u => u.sourceSegment === s.id).length
      return acc
    }, {}),
    [leads, users, funnelView]
  )

  const totalItems = funnelView === 'outreach' ? filteredLeads.length : filteredUsers.length

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Funnel</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalItems} {funnelView === 'outreach' ? 'leads' : 'usuarios'}{segment !== 'all' ? ` en ${segment}` : ' en total'}
          </p>
        </div>

        {/* Funnel view toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setFunnelView('outreach')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              funnelView === 'outreach'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Outreach
          </button>
          <button
            onClick={() => setFunnelView('inbound')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              funnelView === 'inbound'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inbound
          </button>
        </div>
      </div>

      {/* Segment filter pills */}
      <div className="mb-5 flex gap-2 flex-wrap">
        {SEGMENTS.map(s => {
          const count = s.id === 'all'
            ? (funnelView === 'outreach' ? leads.length : users.length)
            : (segCounts[s.id] ?? 0)
          const active = segment === s.id
          const accent = funnelView === 'outreach' ? 'blue' : 'indigo'
          return (
            <button
              key={s.id}
              onClick={() => setSegment(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                active
                  ? `bg-${accent}-600 text-white border-${accent}-600 shadow-sm`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
              style={active ? { backgroundColor: funnelView === 'outreach' ? '#2563EB' : '#4F46E5', borderColor: funnelView === 'outreach' ? '#2563EB' : '#4F46E5', color: 'white' } : {}}
            >
              {s.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                active ? 'text-white' : 'bg-gray-100 text-gray-500'
              }`} style={active ? { backgroundColor: funnelView === 'outreach' ? '#1D4ED8' : '#4338CA' } : {}}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Kanban — Outreach funnel */}
      {funnelView === 'outreach' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {FUNNEL_STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.id)
            const isEmpty = stageLeads.length === 0
            return (
              <div key={stage.id} className={`shrink-0 ${isEmpty ? 'w-32 opacity-40' : 'w-44 sm:w-48'}`}>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold text-gray-700 truncate">{stage.label}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-semibold bg-gray-100 rounded-full px-1.5 py-0.5 min-w-[20px] text-center ml-1 shrink-0">
                    {stageLeads.length}
                  </span>
                </div>
                <div
                  className="min-h-[80px] rounded-xl p-2 space-y-2 border"
                  style={{ backgroundColor: stage.color + '0D', borderColor: stage.color + '20' }}
                >
                  {stageLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onMove={moveCard} />
                  ))}
                  {isEmpty && (
                    <div className="h-12 flex items-center justify-center text-[10px] text-gray-300 italic">
                      vacío
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Kanban — Inbound funnel */}
      {funnelView === 'inbound' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {INBOUND_STAGES.map(stage => {
            const stageUsers = filteredUsers.filter(u => u.inboundStage === stage.id)
            const isEmpty = stageUsers.length === 0
            return (
              <div key={stage.id} className={`shrink-0 ${isEmpty ? 'w-32 opacity-40' : 'w-44 sm:w-52'}`}>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold text-gray-700 truncate">{stage.label}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-semibold bg-gray-100 rounded-full px-1.5 py-0.5 min-w-[20px] text-center ml-1 shrink-0">
                    {stageUsers.length}
                  </span>
                </div>
                <div
                  className="min-h-[80px] rounded-xl p-2 space-y-2 border"
                  style={{ backgroundColor: stage.color + '0D', borderColor: stage.color + '20' }}
                >
                  {stageUsers.map(user => (
                    <UserCard key={user.id} user={user} onMove={moveUser} />
                  ))}
                  {isEmpty && (
                    <div className="h-12 flex items-center justify-center text-[10px] text-gray-300 italic">
                      vacío
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
        {funnelView === 'outreach' ? (
          <>
            <span className="font-medium">Prioridad:</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Alta</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" />Media / Baja</span>
          </>
        ) : (
          <>
            <span className="font-medium">Fuente:</span>
            <span className="flex items-center gap-1.5">✉️ Outreach</span>
            <span className="flex items-center gap-1.5">🌱 Orgánico</span>
            <span className="flex items-center gap-1.5">🔗 Referido</span>
            <span className="ml-4 font-medium">Estado:</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Email no verificado</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400" />Tiene agencia</span>
          </>
        )}
      </div>
    </div>
  )
}
