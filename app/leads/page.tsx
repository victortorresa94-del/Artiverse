'use client'
import { useState } from 'react'
import { leads as allLeads, FUNNEL_STAGES, type FunnelStage } from '@/data/mock'
import { Search } from 'lucide-react'
const stageColor = Object.fromEntries(FUNNEL_STAGES.map(s => [s.id, s.color]))

const priorityColors: Record<string, string> = {
  alta: 'text-red-400 bg-red-400/10 border-red-400/20',
  media: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  baja: 'text-white/30 bg-white/5 border-white/10',
}

const channelIcon: Record<string, string> = {
  email: '✉️', whatsapp: '💬', instagram: '📸', telefono: '📞'
}

export default function LeadsPage() {
  const [leads, setLeads] = useState(allLeads)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [hotOnly, setHotOnly] = useState(false)

  const filtered = leads.filter(l => {
    if (hotOnly && l.inPlatform) return false
    if (hotOnly && !['respondio_interesado', 'reunion_agendada'].includes(l.stage)) return false
    if (filterStage !== 'all' && l.stage !== filterStage) return false
    if (filterPriority !== 'all' && l.priority !== filterPriority) return false
    if (search) {
      const q = search.toLowerCase()
      return l.company.toLowerCase().includes(q) || l.contact.toLowerCase().includes(q) || l.email.toLowerCase().includes(q)
    }
    return true
  })

  const updateStage = (id: string, stage: FunnelStage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l))
  }

  const togglePlatform = (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, inPlatform: !l.inPlatform, stage: !l.inPlatform ? 'dentro_plataforma' : l.stage } : l))
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads / CRM</h1>
          <p className="text-sm text-white/30 mt-1">{filtered.length} de {leads.length} contactos</p>
        </div>
        <button
          onClick={() => setHotOnly(!hotOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${
            hotOnly
              ? 'bg-[#CCFF00]/10 border-[#CCFF00]/30 text-[#CCFF00]'
              : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${hotOnly ? 'bg-[#CCFF00] animate-pulse' : 'bg-white/20'}`} />
          Leads calientes
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresa, contacto, email…"
            className="pl-8 pr-4 py-2 bg-[#111827] border border-white/5 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#2563EB]/50 w-64"
          />
        </div>
        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          className="px-3 py-2 bg-[#111827] border border-white/5 rounded-lg text-sm text-white/60 focus:outline-none focus:border-[#2563EB]/50"
        >
          <option value="all">Todas las fases</option>
          {FUNNEL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2 bg-[#111827] border border-white/5 rounded-lg text-sm text-white/60 focus:outline-none focus:border-[#2563EB]/50"
        >
          <option value="all">Toda prioridad</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Empresa', 'Contacto', 'Email', 'Ciudad', 'Segmento', 'Canal', 'Fase', 'Prioridad', 'En plataforma', 'Próxima acción'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr
                  key={l.id}
                  className={`border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors ${
                    l.priority === 'alta' && !l.inPlatform ? 'bg-[#CCFF00]/[0.02]' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className={`font-medium ${l.priority === 'alta' ? 'text-[#CCFF00]' : 'text-white'}`}>
                      {l.company}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{l.contact}</td>
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">{l.email}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{l.city}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">{l.segment}</span>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">{channelIcon[l.channel]} {l.channel}</td>
                  <td className="px-4 py-3">
                    <select
                      value={l.stage}
                      onChange={e => updateStage(l.id, e.target.value as FunnelStage)}
                      className="text-xs px-2 py-0.5 rounded-full border bg-transparent cursor-pointer focus:outline-none"
                      style={{ color: stageColor[l.stage], borderColor: stageColor[l.stage] + '40', backgroundColor: stageColor[l.stage] + '15' }}
                    >
                      {FUNNEL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[l.priority]}`}>
                      {l.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePlatform(l.id)}
                      className={`w-8 h-4 rounded-full transition-all ${l.inPlatform ? 'bg-[#2563EB]' : 'bg-white/10'}`}
                    >
                      <span className={`block w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${l.inPlatform ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs max-w-[160px] truncate">{l.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-white/20 text-sm">
            No hay leads con estos filtros
          </div>
        )}
      </div>
    </div>
  )
}
