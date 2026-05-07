'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  Search, UserPlus, Mail, CheckCircle2, AlertCircle, Building2,
  RefreshCw, Clock, TrendingUp, Calendar, Zap, Users,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveUser {
  id: string
  email: string
  name: string
  company: string
  role: string
  subscription: string
  registeredAt: string
  registeredDate: string
  emailVerified: boolean
  profileComplete: boolean
  hasAgency: boolean
  agencyName: string
}

interface Stats {
  total: number
  today: number
  thisWeek: number
  verified: number
  profileComplete: number
  withAgency: number
  free: number
  pro: number
}

interface DailyEntry { date: string; count: number }

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBadge({ label, value, color = 'gray', icon: Icon }: {
  label: string; value: number | string; color?: string; icon?: React.ElementType
}) {
  const colors: Record<string, string> = {
    gray:    'bg-gray-100 text-gray-700',
    green:   'bg-emerald-50 text-emerald-700',
    blue:    'bg-blue-50 text-blue-700',
    indigo:  'bg-indigo-50 text-indigo-700',
    amber:   'bg-amber-50 text-amber-700',
    red:     'bg-red-50 text-red-600',
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors[color]}`}>
      {Icon && <Icon size={14} />}
      <span className="font-bold text-base">{value}</span>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  )
}

function DailyBar({ entries, max }: { entries: DailyEntry[]; max: number }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {entries.slice(0, 14).reverse().map(e => {
        const pct = max > 0 ? (e.count / max) * 100 : 0
        const isToday = e.date === new Date().toISOString().slice(0, 10)
        return (
          <div key={e.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className={`w-full rounded-t transition-all ${isToday ? 'bg-emerald-500' : 'bg-indigo-300 group-hover:bg-indigo-500'}`}
              style={{ height: `${Math.max(4, pct * 0.56)}px` }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
              <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                {e.date}: <strong>{e.count}</strong> alta{e.count !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'today' | 'week' | 'verified' | 'complete' | 'agencies'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',       label: 'Todos' },
  { id: 'today',     label: 'Hoy' },
  { id: 'week',      label: 'Esta semana' },
  { id: 'verified',  label: 'Verificados' },
  { id: 'complete',  label: 'Perfil completo' },
  { id: 'agencies',  label: 'Con agencia' },
]

export default function UsuariosPage() {
  const [users, setUsers]     = useState<LiveUser[]>([])
  const [stats, setStats]     = useState<Stats | null>(null)
  const [daily, setDaily]     = useState<DailyEntry[]>([])
  const [today, setToday]     = useState<LiveUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState<FilterTab>('all')

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/artiverse-users')
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setUsers(data.users ?? [])
      setStats(data.stats ?? null)
      setDaily(data.daily ?? [])
      setToday(data.todayUsers ?? [])
      setLastUpdated(new Date().toLocaleTimeString('es-ES'))
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    const iv = setInterval(fetchUsers, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  const todayStr = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    let pool = users
    if (tab === 'today')    pool = pool.filter(u => u.registeredDate === todayStr)
    if (tab === 'week')     pool = pool.filter(u => {
      const diff = (Date.now() - new Date(u.registeredAt).getTime()) / 86400000
      return diff <= 7
    })
    if (tab === 'verified') pool = pool.filter(u => u.emailVerified)
    if (tab === 'complete') pool = pool.filter(u => u.profileComplete)
    if (tab === 'agencies') pool = pool.filter(u => u.hasAgency)

    if (search) {
      const q = search.toLowerCase()
      pool = pool.filter(u =>
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.company.toLowerCase().includes(q)
      )
    }
    return pool
  }, [users, tab, search, todayStr])

  const maxDaily = Math.max(...daily.map(d => d.count), 1)

  // ── Error / loading states ─────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-red-500" />
            <h2 className="font-semibold text-red-800">Error conectando con Artiverse API</h2>
          </div>
          <p className="text-sm text-red-700 font-mono bg-red-100 rounded p-3">{error}</p>
          <p className="text-xs text-red-500 mt-2">Comprueba que ARTIVERSE_API_KEY es correcta en .env.local</p>
          <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px]">

      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Datos en tiempo real desde Artiverse
            {lastUpdated && <span className="ml-2 text-gray-400">· Actualizado: {lastUpdated}</span>}
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 text-xs shadow-sm transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────────── */}
      {stats && (
        <div className="flex flex-wrap gap-2 mb-5">
          <StatBadge label="total" value={stats.total} icon={Users} color="indigo" />
          <StatBadge label="hoy" value={stats.today} icon={Calendar} color={stats.today > 0 ? 'green' : 'gray'} />
          <StatBadge label="esta semana" value={stats.thisWeek} icon={TrendingUp} color="blue" />
          <StatBadge label="verificados" value={stats.verified} icon={CheckCircle2} color="green" />
          <StatBadge label="perfil completo" value={stats.profileComplete} icon={Zap} color="amber" />
          <StatBadge label="con agencia" value={stats.withAgency} icon={Building2} color="indigo" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 ml-auto">
            <span className="text-xs">Free <strong>{stats.free}</strong></span>
            <span className="text-gray-300">·</span>
            <span className="text-xs">Pro <strong className="text-amber-600">{stats.pro}</strong></span>
          </div>
        </div>
      )}

      {/* ── Daily registration chart ──────────────────────────────────────── */}
      {daily.length > 0 && (
        <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-900">Altas diarias</h2>
              <span className="text-xs text-gray-400">(últimas 2 semanas)</span>
            </div>
            {stats && stats.today > 0 && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                🟢 {stats.today} alta{stats.today > 1 ? 's' : ''} hoy
              </span>
            )}
          </div>
          <DailyBar entries={daily} max={maxDaily} />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400">{daily[daily.length - 1]?.date ?? ''}</span>
            <span className="text-[10px] text-gray-400 font-medium">hoy</span>
          </div>
        </div>
      )}

      {/* ── Altas de hoy — highlighted ───────────────────────────────────── */}
      {today.length > 0 && (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-emerald-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-emerald-900">Altas de hoy</h2>
            <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{today.length}</span>
          </div>
          <div className="divide-y divide-emerald-100">
            {today.map(u => (
              <div key={u.id || u.email} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.name || '—'}</p>
                  <p className="text-xs text-gray-500 font-mono truncate">{u.email}</p>
                </div>
                {u.company && (
                  <span className="hidden sm:block text-xs text-gray-500 truncate max-w-[150px]">{u.company}</span>
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  {u.emailVerified && <CheckCircle2 size={13} className="text-emerald-500" />}
                  {!u.emailVerified && <AlertCircle size={13} className="text-red-400" />}
                  {u.subscription !== 'free' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{u.subscription}</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {u.registeredAt ? new Date(u.registeredAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs + Search ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(t => {
            const count =
              t.id === 'all'      ? users.length :
              t.id === 'today'    ? (stats?.today ?? 0) :
              t.id === 'week'     ? (stats?.thisWeek ?? 0) :
              t.id === 'verified' ? (stats?.verified ?? 0) :
              t.id === 'complete' ? (stats?.profileComplete ?? 0) :
              t.id === 'agencies' ? (stats?.withAgency ?? 0) : 0
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  tab === t.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                }`}
              >
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  tab === t.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>
        <div className="relative sm:ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Email, nombre, empresa…"
            className="w-full sm:w-64 pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          />
        </div>
      </div>

      {/* ── User table ───────────────────────────────────────────────────── */}
      {loading && users.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <RefreshCw size={24} className="mx-auto text-indigo-400 mb-3 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Conectando con Artiverse…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <UserPlus size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Sin usuarios con este filtro</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
            <span className="text-xs text-gray-500 font-medium">{filtered.length} usuarios</span>
            {loading && <RefreshCw size={12} className="text-gray-400 animate-spin" />}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Email', 'Nombre', 'Empresa', 'Plan', 'Rol', 'Verificado', 'Perfil', 'Alta'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id || u.email} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono text-gray-700">{u.email}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-800 font-medium">{u.name || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{u.company || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        u.subscription !== 'free'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>{u.subscription}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        u.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-500'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {u.emailVerified
                        ? <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                        : <AlertCircle  size={14} className="text-red-400 mx-auto" />}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {u.profileComplete
                        ? <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock size={10} />
                      {u.registeredAt
                        ? new Date(u.registeredAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map(u => (
              <div key={u.id || u.email} className="px-4 py-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-mono text-gray-700 truncate">{u.email}</p>
                    {!u.emailVerified && <AlertCircle size={12} className="text-red-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{u.company || u.name || '—'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      u.subscription !== 'free' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>{u.subscription}</span>
                    {u.registeredAt && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(u.registeredAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="mt-4 text-xs text-gray-400 text-center">
        Datos en tiempo real · <a href="https://api.artiverse.es" target="_blank" rel="noreferrer" className="underline hover:text-gray-600">api.artiverse.es</a>
        {' · '}
        <button onClick={fetchUsers} className="underline hover:text-gray-600">Actualizar ahora</button>
      </p>
    </div>
  )
}
