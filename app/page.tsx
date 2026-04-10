'use client'
import { useEffect, useState } from 'react'
import { campaigns as mockCampaigns, summary as mockSummary, leads, FUNNEL_STAGES } from '@/data/mock'
import { Mail, TrendingUp, MessageSquare, Users, Zap, Clock, RefreshCw } from 'lucide-react'

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: React.ElementType
}) {
  return (
    <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-bold" style={{ color: color || '#F9FAFB' }}>{value}</p>
          {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-lg bg-white/5">
          <Icon size={18} className="text-white/40" />
        </div>
      </div>
    </div>
  )
}

const statusColors: Record<string, string> = {
  1: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',  // active
  0: 'text-white/30 bg-white/5 border-white/10',                   // draft/pending
  2: 'text-amber-400 bg-amber-400/10 border-amber-400/20',         // paused
  3: 'text-purple-400 bg-purple-400/10 border-purple-400/20',      // completed
}
const statusLabel: Record<string, string> = { '1': 'Activa', '0': 'Pendiente', '2': 'Pausada', '3': 'Completada' }

export default function DashboardPage() {
  const [liveData, setLiveData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/instantly')
      if (res.ok) {
        const data = await res.json()
        setLiveData(data)
        setLastUpdated(new Date().toLocaleTimeString('es-ES'))
      }
    } catch {
      // fallback to mock
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000) // refresh every 5 min
    return () => clearInterval(interval)
  }, [])

  const campaigns = liveData?.campaigns || mockCampaigns.map(c => ({
    ...c, status: c.status === 'active' ? 1 : c.status === 'paused' ? 2 : 0
  }))
  const summary = liveData?.summary || mockSummary

  const funnelCounts = FUNNEL_STAGES.map(s => ({
    ...s, count: leads.filter(l => l.stage === s.id).length,
  }))
  const hotLeads = leads.filter(l => l.stage === 'respondio_interesado' || l.stage === 'reunion_agendada')

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/30 mt-1">Artiverse Outreach Control Center</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-white/30">Actualizado: {lastUpdated}</span>}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white text-xs transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
          {liveData && <span className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Live</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Emails enviados" value={(summary.totalEmailsSent || 0).toLocaleString()} sub="todas las campañas" icon={Mail} />
        <StatCard label="Open rate" value={`${summary.avgOpenRate || 0}%`} sub="promedio" color="#CCFF00" icon={TrendingUp} />
        <StatCard label="Reply rate" value={`${summary.avgReplyRate || 0}%`} sub="promedio" icon={MessageSquare} />
        <StatCard label="Total contactos" value={(summary.totalContacts || 0).toLocaleString()} sub="en pipeline" icon={Users} />
        <StatCard label="En Artiverse" value={130} sub="usuarios activos" color="#2563EB" icon={Zap} />
        <StatCard label="Pendientes" value={(summary.emailsPending || 0).toLocaleString()} sub="por enviar" icon={Clock} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Campaigns table */}
        <div className="xl:col-span-2 bg-[#111827] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Estado de campañas</h2>
            {loading && <span className="text-xs text-white/30 animate-pulse">Cargando datos reales…</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Campaña', 'Enviados', 'Open', 'Reply', 'Bounces', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: any, i: number) => (
                  <tr key={c.id} className={`hover:bg-white/[0.02] transition-colors ${i < campaigns.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">
                      {c.sent ?? c.emailsSent ?? 0}/{c.total ?? c.totalContacts ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={(c.openRate ?? 0) > 0 ? 'text-[#CCFF00] font-mono text-xs' : 'text-white/20 text-xs'}>
                        {(c.openRate ?? 0) > 0 ? `${c.openRate}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={(c.replyRate ?? 0) > 0 ? 'text-white font-mono text-xs' : 'text-white/20 text-xs'}>
                        {(c.replyRate ?? 0) > 0 ? `${c.replyRate}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/30 font-mono text-xs">
                      {(c.bounced ?? 0) > 0 ? c.bounced : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[String(c.status)] || statusColors['0']}`}>
                        {statusLabel[String(c.status)] || 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Funnel mini */}
        <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Pipeline</h2>
          </div>
          <div className="p-5 space-y-2.5">
            {funnelCounts.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-32 truncate shrink-0">{s.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (s.count / Math.max(...funnelCounts.map(x => x.count), 1)) * 100)}%`, backgroundColor: s.color }}
                  />
                </div>
                <span className="text-xs font-mono text-white/50 w-4 text-right shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hot leads */}
      {hotLeads.length > 0 && (
        <div className="bg-[#111827] border border-[#CCFF00]/20 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse" />
            <h2 className="text-sm font-semibold text-white">Leads calientes — interesados sin registrar</h2>
            <span className="ml-auto text-xs text-[#CCFF00] font-mono">{hotLeads.length}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Empresa', 'Contacto', 'Email', 'Fase', 'Próxima acción', 'Notas'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-white/30 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hotLeads.map(l => (
                <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-[#CCFF00]">{l.company}</td>
                  <td className="px-4 py-3 text-white/70">{l.contact}</td>
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">{l.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${l.stage === 'reunion_agendada' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-[#CCFF00] bg-[#CCFF00]/10 border-[#CCFF00]/20'}`}>
                      {l.stage === 'reunion_agendada' ? 'Reunión agendada' : 'Interesado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70 text-xs">{l.nextAction}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{l.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
