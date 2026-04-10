'use client'
import { useState } from 'react'
import { leads as initialLeads, FUNNEL_STAGES, type Lead, type FunnelStage } from '@/data/mock'

const channelEmoji: Record<string, string> = {
  email: '✉️', whatsapp: '💬', instagram: '📸', telefono: '📞'
}
const priorityDot: Record<string, string> = {
  alta: 'bg-red-400', media: 'bg-amber-400', baja: 'bg-white/20'
}

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (id: string, stage: FunnelStage) => void }) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div className={`bg-[#0A0A0A] border rounded-lg p-3 text-xs cursor-pointer group relative ${
      lead.priority === 'alta' ? 'border-[#CCFF00]/30' : 'border-white/5'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-medium text-white leading-tight">{lead.company}</p>
        <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${priorityDot[lead.priority]}`} />
      </div>
      <p className="text-white/40 mb-2">{lead.contact}</p>
      <div className="flex items-center justify-between">
        <span className="text-white/30">{channelEmoji[lead.channel]} {lead.channel}</span>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-white/20 hover:text-white transition-colors text-[10px] px-2 py-0.5 rounded bg-white/5"
        >
          mover →
        </button>
      </div>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#1F2937] border border-white/10 rounded-lg py-1 w-48 shadow-xl">
          {FUNNEL_STAGES.filter(s => s.id !== lead.stage).map(s => (
            <button
              key={s.id}
              onClick={() => { onMove(lead.id, s.id); setShowMenu(false) }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 text-white/60 hover:text-white transition-colors"
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

  const moveCard = (id: string, newStage: FunnelStage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l))
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Funnel</h1>
        <p className="text-sm text-white/30 mt-1">Pipeline de contacto — {leads.length} leads en total</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {FUNNEL_STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage.id)
          return (
            <div key={stage.id} className="w-48 shrink-0">
              {/* Column header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium" style={{ color: stage.color }}>
                  {stage.label}
                </span>
                <span className="text-xs text-white/20 font-mono">{stageLeads.length}</span>
              </div>
              {/* Cards */}
              <div
                className="min-h-[120px] rounded-xl p-2 space-y-2 border border-white/5"
                style={{ backgroundColor: stage.color + '08' }}
              >
                {stageLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} onMove={moveCard} />
                ))}
                {stageLeads.length === 0 && (
                  <div className="h-20 flex items-center justify-center text-[10px] text-white/15">
                    vacío
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-white/30">
        <span>Prioridad:</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Alta</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Media</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/20" />Baja</span>
      </div>
    </div>
  )
}
