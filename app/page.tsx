'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { campaigns as mockCampaigns, summary as mockSummary, leads, FUNNEL_STAGES } from '@/data/mock'
import {
  Mail, TrendingUp, MessageSquare, Users, Zap, Clock, RefreshCw,
  CheckCircle2, AlertCircle, MessageCircle, XCircle, PlayCircle,
  ChevronRight, Building2, CreditCard, UserCheck, TrendingDown,
  Award, UserPlus, ArrowUpRight, MailOpen, MailCheck, ChevronDown, ChevronUp,
} from 'lucide-react'

const TOTAL_CONTACTS = 2597

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArtiverseStats {
  total: number
  today: number
  thisWeek: number
  verified: number
  profileComplete: number
  withAgency: number
  free: number
  pro: number
  agencyCount: number
  artistCount: number
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

/** Collapsible section wrapper */
function Collapsible({
  title, badge, badgeColor = 'bg-gray-500', icon: Icon, iconColor = 'text-gray-500',
  defaultOpen = false, onRefresh, refreshing, children,
}: {
  title: string
  badge?: number | string
  badgeColor?: string
  icon: React.ElementType
  iconColor?: string
  defaultOpen?: boolean
  onRefresh?: () => void
  refreshing?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {badge !== undefined && (
            <span className={`text-xs font-bold text-white ${badgeColor} rounded-full px-2 py-0.5`}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {open && onRefresh && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onRefresh() }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Cargando…' : 'Actualizar'}
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>
      {open && children}
    </div>
  )
}

const statusStyle: Record<string, { label: string; bg: string; text: string }> = {
  '1': { label: 'Activa',     bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  '0': { label: 'Pendiente',  bg: 'bg-gray-100',    text: 'text-gray-500' },
  '2': { label: 'Pausada',    bg: 'bg-amber-50',    text: 'text-amber-700' },
  '3': { label: 'Completada', bg: 'bg-purple-50',   text: 'text-purple-700' },
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [liveData,          setLiveData]          = useState<any>(null)
  const [loading,           setLoading]           = useState(true)
  const [lastUpdated,       setLastUpdated]       = useState('')
  const [tasks,             setTasks]             = useState<any[]>([])
  const [tasksLoading,      setTasksLoading]      = useState(true)
  const [artiverseStats,    setArtiverseStats]    = useState<ArtiverseStats | null>(null)
  const [artiverseLoading,  setArtiverseLoading]  = useState(true)
  const [registrados,       setRegistrados]       = useState<any | null>(null)
  const [registradosLoading,setRegistradosLoading]= useState(true)
  const [opens,             setOpens]             = useState<any | null>(null)
  const [opensLoading,      setOpensLoading]      = useState(true)

  // ── Fetchers ─────────────────────────────────────────────────────────────

  const fetchInstantly = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/instantly')
      if (res.ok) {
        setLiveData(await res.json())
        setLastUpdated(new Date().toLocaleTimeString('es-ES'))
      }
    } catch { /* fallback to mock */ }
    finally { setLoading(false) }
  }

  const fetchTasks = async () => {
    setTasksLoading(true)
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const d = await res.json()
        setTasks(d.tasks || [])
      }
    } catch { /* ignore */ }
    finally { setTasksLoading(false) }
  }

  const fetchRegistrados = async () => {
    setRegistradosLoading(true)
    try {
      const res = await fetch('/api/registrados')
      if (res.ok) setRegistrados(await res.json())
    } catch { /* ignore */ }
    finally { setRegistradosLoading(false) }
  }

  // Artiverse API: 30 req/min — only poll every 5 min to stay well within limits.
  // At ~124 users this makes 2 paginated requests per call = ~0.4 req/min.
  const fetchArtiverseStats = async () => {
    setArtiverseLoading(true)
    try {
      const res = await fetch('/api/artiverse-users')
      if (res.ok) {
        const d = await res.json()
        if (d.stats) setArtiverseStats(d.stats)
      }
    } catch { /* ignore */ }
    finally { setArtiverseLoading(false) }
  }

  const fetchOpens = async () => {
    setOpensLoading(true)
    try {
      const res = await fetch('/api/opens')
      if (res.ok) setOpens(await res.json())
    } catch { /* ignore */ }
    finally { setOpensLoading(false) }
  }

  useEffect(() => {
    // Stagger fetches slightly to spread API load
    fetchInstantly()
    fetchArtiverseStats()
    setTimeout(() => { fetchTasks(); fetchRegistrados(); fetchOpens() }, 500)

    // Refresh all every 5 minutes
    const t = setInterval(() => {
      fetchInstantly()
      fetchArtiverseStats()
      fetchTasks()
      fetchRegistrados()
      fetchOpens()
    }, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // ── Derived data ──────────────────────────────────────────────────────────

  const campaigns = liveData?.campaigns || mockCampaigns.map(c => ({
    ...c, status: c.status === 'active' ? 1 : c.status === 'paused' ? 2 : 0,
  }))
  const summary = liveData?.summary || mockSummary

  const funnelCounts = FUNNEL_STAGES.map(s => ({
    ...s, count: leads.filter(l => l.stage === s.id).length,
  }))
  const hotLeads = leads.filter(l =>
    l.stage === 'respondio_interesado' || l.stage === 'reunion_agendada'
  )

  // Live platform stats (falls back to zero while loading)
  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0

  const platform = artiverseStats ? {
    totalUsers:        artiverseStats.total,
    totalAgencies:     artiverseStats.agencyCount,
    totalArtists:      artiverseStats.artistCount,
    paidSubscribers:   artiverseStats.pro,
    emailVerification: pct(artiverseStats.verified,        artiverseStats.total),
    completeProfiles:  pct(artiverseStats.profileComplete, artiverseStats.total),
    usersInAgencies:   pct(artiverseStats.withAgency,      artiverseStats.total),
    free:              artiverseStats.free,
  } : null

  // ── Render ────────────────────────────────────────────────────────────────

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
            onClick={() => { fetchInstantly(); fetchArtiverseStats(); fetchOpens(); fetchTasks(); fetchRegistrados() }}
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

      {/* Stats grid — 6 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <StatCard label="Emails enviados" value={(summary.totalEmailsSent || 0).toLocaleString()} sub="todas las campañas" icon={Mail} />
        <StatCard
          label="Abiertos"
          value={opensLoading ? '…' : opens ? opens.totalOpened : `${summary.avgOpenRate || 0}%`}
          sub={opensLoading ? 'cargando…' : opens ? 'contactos han abierto' : 'promedio'}
          accent="#D97706"
          icon={MailOpen}
        />
        <StatCard
          label="Replies"
          value={opensLoading ? '…' : opens ? opens.totalReplied : `${summary.avgReplyRate || 0}%`}
          sub={opensLoading ? 'cargando…' : opens ? 'han respondido' : 'promedio'}
          accent="#059669"
          icon={MessageSquare}
        />
        <StatCard label="Total contactos" value={TOTAL_CONTACTS.toLocaleString()} sub="en base de datos" icon={Users} />
        <StatCard
          label="En Artiverse"
          value={artiverseLoading ? '…' : artiverseStats?.total ?? '—'}
          sub={artiverseStats
            ? `${artiverseStats.today > 0 ? `+${artiverseStats.today} hoy · ` : ''}${artiverseStats.thisWeek} esta semana`
            : 'usuarios registrados'}
          accent="#2563EB"
          icon={UserCheck}
        />
        <StatCard label="Pendientes" value={(summary.emailsPending || 0).toLocaleString()} sub="por enviar" icon={Clock} />
      </div>

      {/* ── KPI: Usuarios en plataforma + conversión ───────────────────────── */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Card izquierda — usuarios en plataforma */}
        <Link href="/usuarios" className="block group">
          <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-emerald-100/50 blur-2xl pointer-events-none" />
            <div className="relative px-5 py-5 flex items-start gap-4">
              <div className="flex-shrink-0 p-3 bg-emerald-500 rounded-xl shadow-sm">
                <UserPlus size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                  Usuarios en Artiverse
                  {!artiverseLoading && artiverseStats && (
                    <span className="ml-2 text-[10px] font-normal text-emerald-500">● live</span>
                  )}
                </p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl font-bold text-emerald-900">
                    {artiverseLoading ? '…' : artiverseStats?.total ?? '—'}
                  </span>
                  <span className="text-sm text-emerald-600">usuarios registrados</span>
                </div>
                {artiverseStats && artiverseStats.today > 0 && (
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                    +{artiverseStats.today} alta{artiverseStats.today > 1 ? 's' : ''} hoy · {artiverseStats.thisWeek} esta semana
                  </p>
                )}
                {!registradosLoading && registrados && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {registrados.fromCampaign} de tus campañas email
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      {registrados.fromOrganic} orgánicos
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-700 group-hover:text-emerald-900 transition-colors">
                Ver todos <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
            {!registradosLoading && registrados?.registeredUsers?.length > 0 && (
              <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                {registrados.registeredUsers.slice(0, 6).map((u: any, i: number) => (
                  <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium truncate max-w-[140px] ${
                    u.source === 'outreach' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {u.company || u.email?.split('@')[0]}
                  </span>
                ))}
                {registrados.registeredUsers.length > 6 && (
                  <span className="text-[10px] text-emerald-500 px-2 py-0.5">+{registrados.registeredUsers.length - 6} más</span>
                )}
              </div>
            )}
          </div>
        </Link>

        {/* Card derecha — conversión outreach → plataforma */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-indigo-500" />
            <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Conversión outreach → plataforma</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">De {TOTAL_CONTACTS.toLocaleString()} contactos en Instantly</span>
                <span className="text-xs font-bold text-indigo-700">
                  {registradosLoading ? '…' : `${registrados?.fromCampaign ?? 0} registrados`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${Math.min(100, ((registrados?.fromCampaign ?? 0) / TOTAL_CONTACTS) * 100 * 50)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {registradosLoading ? '' : `Tasa: ${(((registrados?.fromCampaign ?? 0) / TOTAL_CONTACTS) * 100).toFixed(2)}%`}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: 'De campañas', value: registrados?.fromCampaign ?? 0,           color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Orgánicos',   value: registrados?.fromOrganic ?? 0,            color: 'text-blue-700',   bg: 'bg-blue-50' },
                { label: 'Total',       value: artiverseStats?.total ?? registrados?.registeredCount ?? '…', color: 'text-indigo-700', bg: 'bg-indigo-50' },
              ].map(m => (
                <div key={m.label} className={`${m.bg} rounded-lg p-2.5 text-center`}>
                  <p className={`text-xl font-bold ${m.color}`}>{registradosLoading ? '…' : m.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
            <Link href="/usuarios?filter=outreach" className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800">
              Ver usuarios de outreach <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Plataforma Artiverse — live stats ──────────────────────────────── */}
      <div className="mb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-900">Plataforma Artiverse</h2>
              {!artiverseLoading && artiverseStats && (
                <span className="text-[10px] text-emerald-500 font-medium">● live</span>
              )}
            </div>
            {artiverseLoading && (
              <span className="text-xs text-gray-400 animate-pulse">Actualizando…</span>
            )}
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            {/* Row 1 — core counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Total Usuarios"
                value={artiverseLoading ? '…' : (platform?.totalUsers ?? '—')}
                icon={Users}
                accent="#2563EB"
              />
              <StatCard
                label="Total Artistas"
                value={artiverseLoading ? '…' : (platform?.totalArtists ?? '—')}
                sub="en agencias"
                icon={UserCheck}
                accent="#7C3AED"
              />
              <StatCard
                label="Total Agencias"
                value={artiverseLoading ? '…' : (platform?.totalAgencies ?? '—')}
                icon={Building2}
                accent="#0891B2"
              />
              <StatCard
                label="Suscriptores Pagos"
                value={artiverseLoading ? '…' : (platform?.paidSubscribers ?? '—')}
                sub={platform ? `${platform.free} gratuitos` : undefined}
                icon={TrendingUp}
                accent="#059669"
              />
            </div>
            {/* Row 2 — health metrics with progress bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Verificación Email',  value: platform?.emailVerification, color: '#059669' },
                { label: 'Perfiles Completos',  value: platform?.completeProfiles,  color: '#2563EB' },
                { label: 'Usuarios en Agencias',value: platform?.usersInAgencies,   color: '#7C3AED' },
              ].map(m => (
                <div key={m.label} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">{m.label}</span>
                    <span className="text-sm font-bold" style={{ color: m.color }}>
                      {artiverseLoading ? '…' : m.value !== undefined ? `${m.value}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${m.value ?? 0}%`, backgroundColor: m.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Pipeline mini — always visible ──────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Pipeline de leads</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-2.5">
            {funnelCounts.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 truncate shrink-0">{s.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (s.count / Math.max(...funnelCounts.map(x => x.count), 1)) * 100)}%`,
                      backgroundColor: s.color,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600 w-4 text-right shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hot leads — right side of pipeline row */}
        {hotLeads.length > 0 && (
          <div className="xl:col-span-2 bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 sm:px-5 py-4 border-b border-amber-100 flex items-center gap-2 bg-amber-50/40">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-amber-900">Leads calientes</h2>
              <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{hotLeads.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-100/60">
                    {['Empresa', 'Contacto', 'Fase', 'Próxima acción'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {hotLeads.map(l => (
                    <tr key={l.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 text-xs">{l.company}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{l.contact}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          l.stage === 'reunion_agendada' ? 'bg-amber-50 text-amber-700' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {l.stage === 'reunion_agendada' ? 'Reunión' : 'Interesado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{l.nextAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── COLLAPSIBLE SECTIONS ────────────────────────────────────────────── */}

      {/* Quién ha abierto tus emails */}
      <Collapsible
        title="Quién ha abierto tus emails"
        badge={opens ? `${opens.totalOpened} abiertos${opens.totalReplied > 0 ? ` · ${opens.totalReplied} respondidos` : ''}` : undefined}
        badgeColor="bg-amber-500"
        icon={MailOpen}
        iconColor="text-amber-500"
        defaultOpen={false}
        onRefresh={fetchOpens}
        refreshing={opensLoading}
      >
        {opensLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400 animate-pulse">Consultando Instantly…</div>
        ) : !opens || opens.leads.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <MailOpen size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 font-medium">Sin datos de aperturas todavía</p>
            <p className="text-xs text-gray-400 mt-0.5">Los datos aparecen cuando Instantly registra aperturas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Estado', 'Empresa', 'Email', 'Campaña', 'Última actividad'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {opens.leads.map((lead: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      {lead.status === 'replied'
                        ? <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit"><MailCheck size={11} /> Respondió</span>
                        : <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full w-fit"><MailOpen size={11} /> Abrió</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{lead.company || lead.firstName || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-[11px]">{lead.email}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{lead.campaign || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Collapsible>

      {/* Estado de campañas */}
      <Collapsible
        title="Estado de campañas"
        badge={campaigns.length}
        badgeColor="bg-indigo-500"
        icon={Mail}
        iconColor="text-indigo-500"
        defaultOpen={false}
        onRefresh={fetchInstantly}
        refreshing={loading}
      >
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
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.sent ?? c.emailsSent ?? 0}/{c.total ?? c.totalContacts ?? 0}</td>
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
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Collapsible>

      {/* Tareas pendientes */}
      <Collapsible
        title="Tareas pendientes"
        badge={tasks.length > 0 ? tasks.length : undefined}
        badgeColor="bg-red-500"
        icon={AlertCircle}
        iconColor="text-red-500"
        defaultOpen={tasks.length > 0}
        onRefresh={fetchTasks}
        refreshing={tasksLoading}
      >
        {tasksLoading && tasks.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400 animate-pulse">Cargando tareas…</div>
        ) : tasks.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-sm text-gray-500 font-medium">Sin tareas pendientes</p>
            <p className="text-xs text-gray-400 mt-0.5">Todo en orden</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tasks.map(task => {
              const icons: Record<string, any> = { reply: MessageCircle, bounce: XCircle, campaign: PlayCircle }
              const colors: Record<string, string> = {
                reply: 'text-blue-600 bg-blue-50',
                bounce: 'text-red-500 bg-red-50',
                campaign: 'text-amber-600 bg-amber-50',
              }
              const priorities: Record<string, string> = {
                alta: 'text-red-500 bg-red-50 border-red-100',
                media: 'text-amber-600 bg-amber-50 border-amber-100',
                baja: 'text-gray-500 bg-gray-100 border-gray-200',
              }
              const Icon = icons[task.type] || AlertCircle
              return (
                <div key={task.id} className="px-4 sm:px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/60 transition-colors">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${colors[task.type] || 'text-gray-500 bg-gray-100'}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${priorities[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
                    {task.email && <p className="text-[10px] text-gray-400 font-mono mt-1">{task.email}</p>}
                  </div>
                  <div className="shrink-0">
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-0.5 hover:text-blue-800 cursor-pointer">
                      {task.action} <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Collapsible>

    </div>
  )
}
