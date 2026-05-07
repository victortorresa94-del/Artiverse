'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  RefreshCw, UserCheck, Search, Download, Building2,
  CheckCircle2, Mail, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react'
import PillBadge from '@/components/ui/PillBadge'
import { SkeletonRows } from '@/components/ui/SkeletonRow'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ArtUser {
  id: string; email: string; name: string; company: string
  subscription: string; registeredAt: string; registeredDate: string
  emailVerified: boolean; profileComplete: boolean; hasAgency: boolean; agencyName: string
  city: string; country: string
}

interface Stats {
  total: number; today: number; thisWeek: number
  verified: number; profileComplete: number; withAgency: number
  free: number; pro: number; agencyCount: number; artistCount: number
}

const PAGE_SIZE = 50

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60)    return 'ahora'
  if (d < 3600)  return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

function exportCsv(users: ArtUser[]) {
  const header = 'Email,Nombre,Empresa,Plan,Verificado,Perfil,Agencia,Ciudad,Fecha registro'
  const rows = users.map(u => [
    u.email, u.name, u.company || u.agencyName,
    u.subscription, u.emailVerified ? 'Sí' : 'No',
    u.profileComplete ? 'Sí' : 'No',
    u.hasAgency ? 'Sí' : 'No', u.city,
    u.registeredDate,
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `registros-artiverse-${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
      <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
        Mostrando {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: 'var(--text-2)' }}
          onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        ><ChevronLeft size={13} /></button>
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className="w-7 h-7 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: p === page ? 'var(--blue)' : 'transparent',
              color:      p === page ? '#fff'         : 'var(--text-2)',
            }}
          >{p}</button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === Math.ceil(total / pageSize)}
          className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: 'var(--text-2)' }}
          onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        ><ChevronRight size={13} /></button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RegistrosPage() {
  const [users,       setUsers]       = useState<ArtUser[]>([])
  const [stats,       setStats]       = useState<Stats | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [search,      setSearch]      = useState('')
  const [planFilter,  setPlanFilter]  = useState<'all' | 'free' | 'pro'>('all')
  const [page,        setPage]        = useState(1)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/artiverse-users')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      // Sort newest first
      const sorted = (d.users ?? []).sort((a: ArtUser, b: ArtUser) =>
        new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime()
      )
      setUsers(sorted)
      if (d.stats) setStats(d.stats)
      setLastUpdated(new Date().toLocaleTimeString('es-ES'))
    } catch (e) {
      console.error('Error fetching registros:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { setPage(1) }, [search, planFilter])

  const filtered = useMemo(() => {
    let list = users
    if (planFilter === 'pro')  list = list.filter(u => u.subscription !== 'free')
    if (planFilter === 'free') list = list.filter(u => u.subscription === 'free')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        (u.company || u.agencyName || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [users, search, planFilter])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-3)' }}>
              Dashboard
            </Link>
            <span style={{ color: 'var(--text-3)' }}>›</span>
            <span className="text-xs" style={{ color: 'var(--text-2)' }}>Registros</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
            Todos los registros
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            Acumulado desde el inicio de las campañas · Artiverse Platform
            {lastUpdated && ` · act. ${lastUpdated}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCsv(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total registrados', value: stats.total,    color: 'var(--text-1)' },
            { label: 'Registrados hoy',   value: stats.today,    color: 'var(--success)' },
            { label: 'Esta semana',       value: stats.thisWeek, color: 'var(--blue)' },
            { label: 'Usuarios Pro',      value: stats.pro,      color: 'var(--lime)' },
          ].map(m => (
            <div
              key={m.label}
              className="rounded-xl px-4 py-3.5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Daily bar chart (last 14 days) — only when data loaded ──────────── */}
      {/* Simplified: just a compact label row */}
      {stats && (
        <div
          className="surface-card px-5 py-3.5 mb-5 flex flex-wrap items-center gap-5"
          style={{ fontSize: 11 }}
        >
          {[
            { label: 'Verificados',     value: stats.verified,       pct: Math.round((stats.verified       / Math.max(stats.total, 1)) * 100) },
            { label: 'Perfil completo', value: stats.profileComplete, pct: Math.round((stats.profileComplete / Math.max(stats.total, 1)) * 100) },
            { label: 'Con agencia',     value: stats.withAgency,      pct: Math.round((stats.withAgency     / Math.max(stats.total, 1)) * 100) },
            { label: 'Gratis',          value: stats.free },
            { label: 'Pro',             value: stats.pro },
            { label: 'Agencias',        value: stats.agencyCount },
            { label: 'Artistas',        value: stats.artistCount },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-1.5">
              <span style={{ color: 'var(--text-3)' }}>{m.label}</span>
              <span className="font-bold" style={{ color: 'var(--text-1)' }}>{m.value}</span>
              {m.pct !== undefined && (
                <span style={{ color: 'var(--text-3)' }}>({m.pct}%)</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar email, nombre, empresa…"
            className="text-xs rounded-lg pl-8 pr-3 py-1.5 w-56 focus:outline-none"
            style={{
              background: 'var(--bg-elevated)',
              color:      'var(--text-1)',
              border:     '1px solid var(--border)',
            }}
          />
        </div>

        {/* Plan pills */}
        {(['all', 'free', 'pro'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPlanFilter(p)}
            className="text-[10px] font-medium px-3 py-1.5 rounded-full transition-all"
            style={{
              background: planFilter === p ? 'var(--blue)' : 'var(--bg-elevated)',
              color:      planFilter === p ? '#fff'         : 'var(--text-2)',
              border:     `1px solid ${planFilter === p ? 'var(--blue)' : 'var(--border)'}`,
            }}
          >
            {p === 'all' ? 'Todos' : p === 'pro' ? 'Pro' : 'Gratis'}
            {p !== 'all' && stats && (
              <span className="ml-1 opacity-70">
                ({p === 'pro' ? stats.pro : stats.free})
              </span>
            )}
          </button>
        ))}

        <span className="text-xs ml-auto" style={{ color: 'var(--text-3)' }}>
          {filtered.length} usuario{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table / List ────────────────────────────────────────────────────── */}
      <div className="surface-card overflow-hidden">
        {loading && users.length === 0 ? (
          <table className="w-full">
            <tbody><SkeletonRows count={10} cols={5} /></tbody>
          </table>
        ) : filtered.length === 0 ? (
          <EmptyState icon={UserCheck} title="Sin registros" subtitle="Ajusta el filtro o la búsqueda" />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Usuario', 'Plan', 'Verificado', 'Perfil', 'Agencia', 'Registro', ''].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(u => {
                  const isPro = u.subscription !== 'free'
                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
                          >
                            {(u.name?.[0] || u.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-1)' }}>
                              {u.name || '—'}
                            </p>
                            <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-3)' }}>
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PillBadge
                          label={isPro ? `Pro · ${u.subscription}` : 'Gratis'}
                          variant={isPro ? 'lime' : 'gray'}
                          size="xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {u.emailVerified
                          ? <span className="text-xs flex items-center gap-1" style={{ color: 'var(--success)' }}>
                              <CheckCircle2 size={12} /> Sí
                            </span>
                          : <span className="text-xs" style={{ color: 'var(--text-3)' }}>No</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {u.profileComplete
                          ? <span className="text-xs flex items-center gap-1" style={{ color: 'var(--success)' }}>
                              <CheckCircle2 size={12} /> Completo
                            </span>
                          : <span className="text-xs" style={{ color: 'var(--text-3)' }}>—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>
                        {u.agencyName || (u.hasAgency ? 'Sí' : <span style={{ color: 'var(--text-3)' }}>—</span>)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                        <span title={fmtDate(u.registeredAt)}>{timeAgo(u.registeredAt)}</span>
                        <span className="ml-1 hidden lg:inline">· {u.registeredDate}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`mailto:${u.email}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--blue)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <Mail size={11} />
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginated.map(u => {
                const isPro = u.subscription !== 'free'
                return (
                  <div
                    key={u.id}
                    className="px-4 py-3.5"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
                        >
                          {(u.name?.[0] || u.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
                            {u.name || u.email?.split('@')[0]}
                          </p>
                          <p className="text-[10px] truncate font-mono" style={{ color: 'var(--text-3)' }}>
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <PillBadge label={isPro ? 'Pro' : 'Free'} variant={isPro ? 'lime' : 'gray'} size="xs" />
                    </div>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      {u.emailVerified && (
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--success)' }}>
                          <CheckCircle2 size={10} /> Verificado
                        </span>
                      )}
                      {u.hasAgency && (
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#A78BFA' }}>
                          <Building2 size={10} /> {u.agencyName || 'Agencia'}
                        </span>
                      )}
                      <span className="text-[10px] flex items-center gap-0.5 ml-auto" style={{ color: 'var(--text-3)' }}>
                        <Calendar size={10} /> {timeAgo(u.registeredAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
