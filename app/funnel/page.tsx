'use client'
import { useState, useMemo } from 'react'
import { leads as initialLeads, FUNNEL_STAGES, type Lead, type FunnelStage, type Segment } from '@/data/mock'

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

export default function FunnelPage() {
  const [leads, setLeads] = useState(initialLeads)
  const [segment, setSegment] = useState<string>('all')

  const moveCard = (id: string, newStage: FunnelStage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l))
  }

  const filtered = useMemo(() =>
    segment === 'all' ? leads : leads.filter(l => l.segment === segment),
    [leads, segment]
  )

  // Count per segment for badges
  const segCounts = useMemo(() =>
    SEGMENTS.slice(1).reduce<Record<string, number>>((acc, s) => {
      acc[s.id] = leads.filter(l => l.segment === s.id).length
      return acc
    }, {}),
    [leads]
  )

  // Non-empty stages only (for readability)
  const activeStages = FUNNEL_STAGES.filter(s =>
    filtered.some(l => l.stage === s.id)
  )
  const emptyStages = FUNNEL_STAGES.filter(s =>
    !filtered.some(l => l.stage === s.id)
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Funnel</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} leads{segment !== 'all' ? ` en ${segment}` : ' en total'}
          </p>
        </div>
      </div>

      {/* Segment filter pills */}
      <div className="mb-5 flex gap-2 flex-wrap">
        {SEGMENTS.map(s => {
          const count = s.id === 'all' ? leads.length : (segCounts[s.id] ?? 0)
          const active = segment === s.id
          return (
            <button
              key={s.id}
              onClick={() => setSegment(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {s.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Kanban — only non-empty stages shown prominently */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {FUNNEL_STAGES.map(stage => {
          const stageLeads = filtered.filter(l => l.stage === stage.id)
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

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <span className="font-medium">Prioridad:</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Alta</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" />Media / Baja</span>
      </div>
    </div>
  )
}
