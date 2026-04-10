'use client'
import { useEffect, useState } from 'react'
import { campaigns as mockCampaigns, summary as mockSummary, leads, FUNNEL_STAGES } from '@/data/mock'
import { Mail, TrendingUp, MessageSquare, Users, Zap, Clock, RefreshCw, CheckCircle2 } from 'lucide-react'

function StatCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string | number; sub?: string; accent?: string; icon: React.ElementType
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold truncate" style={{ color: accent || '#111827' }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-lg bg-gray-50 shrink-0 ml-2">
          <Icon size={18} className="text-gray-400" />
        </div>
      </div>
    </div>
  )
}

const statusStyle: Record<string, { label: string; bg: string; text: string }> = {
  '1': { label: 'Activa',     bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  '0': { label: 'Pendiente',  bg: 'bg-gray-100',    text: 'text-gray-500' },
  '2': { label: 'Pausada',    bg: 'bg-amber-50',    text: 'text-amber-700' },
  '3': { label: 'Completada', bg: 'bg-purple-50',   text: 'text-purple-700' },
}

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
    } catch { /* fallback to mock */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Artiverse Outreach Control Center</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {lastUpdated && <span className="text-xs text-gray-400">Actualizado: {lastUpdated}</span>}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 text-xs transition-colors shadow-sm"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
          {liveData
            ? <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Live</span>
            : <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Mock</span>
          }
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Emails enviados" value={(summary.totalEmailsSent || 0).toLocaleString()} sub="todas las campañas" icon={Mail} />
        <StatCard label="Open rate" value={`${summary.avgOpenRate || 0}%`} sub="promedio" accent="#D97706" icon={TrendingUp} />
        <StatCard label="Reply rate" value={`${summary.avgReplyRate || 0}%`} sub="promedio" accent="#059669" icon={MessageSquare} />
        <StatCard label="Total contactos" value={(summary.totalContacts || 0).toLocaleString()} sub="en pipeline" icon={Users} />
        <StatCard label="En Artiverse" value={130} sub="usuarios activos" accent="#2563EB" icon={Zap} />
        <StatCard label="Pendientes" value={(summary.emailsPending || 0).toLocaleString()} sub="por enviar" icon={Clock} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Campaigns table */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Estado de campañas</h2>
            {loading && <span className="text-xs text-gray-400 animate-pulse">Cargando datos…</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Campaña', 'Enviados', 'Open', 'Reply', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map((c: any) => {
                  const st = statusStyle[String(c.status)] || statusStyle['0']
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {c.sent ?? c.emailsSent ?? 0}/{c.total ?? c.totalContacts ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={(c.openRate ?? 0) > 0 ? 'text-amber-600 font-semibold font-mono text-xs' : 'text-gray-300 text-xs'}>
                          {(c.openRate ?? 0) > 0 ? `${c.openRate}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={(c.replyRate ?? 0) > 0 ? 'text-emerald-600 font-semibold font-mono text-xs' : 'text-gray-300 text-xs'}>
                          {(c.replyRate ?? 0) > 0 ? `${c.replyRate}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pipeline mini */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Pipeline</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-2.5">
            {funnelCounts.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 truncate shrink-0">{s.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (s.count / Math.max(...funnelCounts.map(x => x.count), 1)) * 100)}%`, backgroundColor: s.color }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600 w-4 text-right shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hot leads */}
      {hotLeads.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 sm:px-5 py-4 border-b border-amber-100 flex items-center gap-2 bg-amber-50/40">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-amber-900">Leads calientes — sin registrar</h2>
            <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{hotLeads.length}</span>
          </div>
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100/60">
                  {['Empresa', 'Contacto', 'Email', 'Fase', 'Próxima acción', 'Notas'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {hotLeads.map(l => (
                  <tr key={l.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{l.company}</td>
                    <td className="px-4 py-3 text-gray-700">{l.contact}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{l.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${l.stage === 'reunion_agendada' ? 'bg-amber-50 text-amber-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {l.stage === 'reunion_agendada' ? 'Reunión agendada' : 'Interesado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{l.nextAction}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{l.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="sm:hidden divide-y divide-amber-100">
            {hotLeads.map(l => (
              <div key={l.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{l.company}</p>
                    <p className="text-xs text-gray-500">{l.contact}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.stage === 'reunion_agendada' ? 'bg-amber-50 text-amber-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {l.stage === 'reunion_agendada' ? 'Reunión' : 'Interesado'}
                  </span>
                </div>
                {l.nextAction !== '-' && <p className="text-xs text-blue-600 mt-1">{l.nextAction}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
