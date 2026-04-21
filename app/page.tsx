'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RefreshCw, Database, Send, UserCheck, Building2, Code,
  MailOpen, MessageSquare, AlertCircle, CheckCircle2,
  MessageCircle, XCircle, PlayCircle, Mail, ChevronRight,
  TrendingUp, Zap,
} from 'lucide-react'
import KpiCard from '@/components/ui/KpiCard'
import Collapsible from '@/components/ui/Collapsible'
import PillBadge from '@/components/ui/PillBadge'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonRows } from '@/components/ui/SkeletonRow'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ArtStats {
  total: number; today: number; thisWeek: number
  verified: number; profileComplete: number; withAgency: number
  free: number; pro: number; agencyCount: number; artistCount: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

function timeAgo(iso: string) {
  if (!iso) return '—'
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60)    return 'ahora'
  if (d < 3600)  return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

// ── Mini Funnel ────────────────────────────────────────────────────────────────

function MiniFunnel({ ruta }: { ruta: any }) {
  if (!ruta) {
    return (
      <div className="surface-card p-5 mb-5">
        <div className="skeleton h-4 w-40 mb-4 rounded" />
        <div className="skeleton h-6 w-full rounded-full" />
      </div>
    )
  }

  const nodes = ruta.nodes
  const TOTAL_BASE = nodes.base_contactos?.count || 1

  const stages = [
    { label: 'Universo',   count: nodes.base_contactos?.count  || 0, color: '#44445A' },
    { label: 'Enviado',    count: nodes.enviado?.count          || 0, color: 'var(--blue)' },
    { label: 'Abierto',    count: nodes.abierto?.count          || 0, color: '#60A5FA' },
    { label: 'Respondido', count: nodes.respondido?.count       || 0, color: '#F59E0B' },
    { label: 'Registrado', count: nodes.registrado?.count       || 0, color: 'var(--success)' },
  ]

  return (
    <div className="surface-card p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} style={{ color: 'var(--blue)' }} />
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
          Funnel de conversión
        </h2>
        <Link
          href="/ruta"
          className="ml-auto text-[10px] font-medium flex items-center gap-0.5 transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          Ver mapa completo <ChevronRight size={10} />
        </Link>
      </div>

      {/* Bar */}
      <div className="flex h-5 rounded-full overflow-hidden gap-px mb-3">
        {stages.map((s, i) => {
          const width = (s.count / TOTAL_BASE) * 100
          return (
            <div
              key={i}
              className="transition-all duration-700 first:rounded-l-full last:rounded-r-full"
              style={{ width: `${Math.max(width, 1)}%`, background: s.color }}
              title={`${s.label}: ${s.count}`}
            />
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        {stages.map((s, i) => (
          <div key={i} className="text-center" style={{ width: `${100 / stages.length}%` }}>
            <p className="text-xs font-bold" style={{ color: s.color }}>
              {s.count.toLocaleString()}
            </p>
            <p className="text-[9px] mt-0.5 truncate px-1" style={{ color: 'var(--text-3)' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Conversion rates */}
      {ruta.conversion_rates && (
        <div
          className="mt-4 pt-3 flex flex-wrap gap-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {[
            { label: 'Base → Enviado', rate: ruta.conversion_rates.base_to_enviado },
            { label: 'Enviado → Abierto', rate: ruta.conversion_rates.enviado_to_abierto },
            { label: 'Abierto → Reply', rate: ruta.conversion_rates.abierto_to_respondido },
            { label: 'Base → Pro', rate: ruta.conversion_rates.base_to_pro },
          ].map(({ label, rate }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{label}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--bg-elevated)',
                  color:      rate ? (rate > 0.1 ? 'var(--success)' : 'var(--text-2)') : 'var(--text-3)',
                }}
              >
                {rate != null ? `${(rate * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Health Bars ────────────────────────────────────────────────────────────────

function HealthBar({ label, value, color }: { label: string; value: number | undefined; color: string }) {
  const v = value ?? 0
  const threshold = v >= 80 ? 'var(--success)' : v >= 50 ? 'var(--warning)' : 'var(--error)'
  const finalColor = color || threshold

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: finalColor }}>
          {value !== undefined ? `${v}%` : '—'}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${v}%`, background: finalColor }}
        />
      </div>
    </div>
  )
}

// ── Campaign status badge ──────────────────────────────────────────────────────

const campaignStatus: Record<string, { label: string; variant: 'green' | 'gray' | 'amber' | 'purple' }> = {
  '1': { label: 'Activa',     variant: 'green' },
  '0': { label: 'Pendiente',  variant: 'gray' },
  '2': { label: 'Pausada',    variant: 'amber' },
  '3': { label: 'Completada', variant: 'purple' as any },
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [liveData,        setLiveData]        = useState<any>(null)
  const [loading,         setLoading]         = useState(true)
  const [lastUpdated,     setLastUpdated]     = useState('')
  const [tasks,           setTasks]           = useState<any[]>([])
  const [tasksLoading,    setTasksLoading]    = useState(true)
  const [artStats,        setArtStats]        = useState<ArtStats | null>(null)
  const [artUsers,        setArtUsers]        = useState<any[]>([])
  const [artLoading,      setArtLoading]      = useState(true)
  const [opens,           setOpens]           = useState<any | null>(null)
  const [opensLoading,    setOpensLoading]    = useState(true)
  const [ruta,            setRuta]            = useState<any>(null)

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchInstantly = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/instantly')
      if (r.ok) {
        setLiveData(await r.json())
        setLastUpdated(new Date().toLocaleTimeString('es-ES'))
      }
    } finally { setLoading(false) }
  }

  const fetchArtiverse = async () => {
    setArtLoading(true)
    try {
      const r = await fetch('/api/artiverse-users')
      if (r.ok) {
        const d = await r.json()
        if (d.stats)        setArtStats(d.stats)
        if (d.todayUsers)   setArtUsers(d.todayUsers.slice(0, 8))
        else if (d.users)   setArtUsers(d.users.slice(0, 8))
      }
    } finally { setArtLoading(false) }
  }

  const fetchOpens = async () => {
    setOpensLoading(true)
    try {
      const r = await fetch('/api/opens')
      if (r.ok) setOpens(await r.json())
    } finally { setOpensLoading(false) }
  }

  const fetchTasks = async () => {
    setTasksLoading(true)
    try {
      const r = await fetch('/api/tasks')
      if (r.ok) {
        const d = await r.json()
        setTasks(d.tasks || [])
      }
    } finally { setTasksLoading(false) }
  }

  const fetchRuta = async () => {
    try {
      const r = await fetch('/api/ruta?token=AETHER2026')
      if (r.ok) setRuta(await r.json())
    } catch { /* ignore */ }
  }

  const refreshAll = () => {
    fetchInstantly()
    fetchArtiverse()
    fetchOpens()
    fetchTasks()
    fetchRuta()
  }

  useEffect(() => {
    fetchInstantly()
    fetchArtiverse()
    fetchRuta()
    setTimeout(() => { fetchTasks(); fetchOpens() }, 400)
    const t = setInterval(refreshAll, 5 * 60 * 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────

  const campaigns     = liveData?.campaigns    ?? []
  const summary       = liveData?.summary      ?? {}
  const rutaNodes     = ruta?.nodes

  const proAgencia     = rutaNodes?.pro_agencia?.count      ?? 0
  const proProgramador = rutaNodes?.pro_programador?.count  ?? 0
  const totalBase      = rutaNodes?.base_contactos?.count   ?? 2536
  const totalEnviado   = rutaNodes?.enviado?.count          ?? 0

  const artPlatform = artStats ? {
    emailVerification: pct(artStats.verified,        artStats.total),
    completeProfiles:  pct(artStats.profileComplete, artStats.total),
    usersInAgencies:   pct(artStats.withAgency,      artStats.total),
  } : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
            Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            Artiverse Control Center
            {lastUpdated && ` · actualizado ${lastUpdated}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'var(--bg-elevated)',
              color:      'var(--text-2)',
              border:     '1px solid var(--border)',
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: liveData ? 'var(--success)' : 'var(--text-3)' }}>
            <span className={`w-1.5 h-1.5 rounded-full ${liveData ? 'status-pulse' : ''}`} style={{ background: liveData ? 'var(--success)' : 'var(--text-3)' }} />
            {liveData ? 'Live' : 'Mock'}
          </span>
        </div>
      </div>

      {/* ── 5 KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KpiCard
          label="Base total"
          value={totalBase.toLocaleString()}
          sub="contactos en Excel"
          icon={Database}
          accentColor="var(--text-2)"
          loading={false}
        />
        <KpiCard
          label="Contactados"
          value={loading ? '…' : totalEnviado.toLocaleString()}
          sub={summary.totalEmailsSent ? `${summary.totalEmailsSent} emails enviados` : 'via Instantly'}
          icon={Send}
          accentColor="var(--blue)"
          loading={loading && !totalEnviado}
        />
        <KpiCard
          label="En plataforma"
          value={artLoading ? '…' : artStats?.verified ?? '—'}
          sub={artStats ? `+${artStats.today} hoy · ${artStats.thisWeek} semana` : 'verificados'}
          icon={UserCheck}
          accentColor="var(--success)"
          loading={artLoading && !artStats}
        />
        <KpiCard
          label="Pro agencia"
          value={artLoading ? '…' : proAgencia}
          sub="suscriptores activos"
          icon={Building2}
          accentColor="#A78BFA"
          loading={artLoading && !ruta}
        />
        <KpiCard
          label="Pro programador"
          value={artLoading ? '…' : proProgramador}
          sub="suscriptores activos"
          icon={Code}
          accentColor="var(--lime)"
          loading={artLoading && !ruta}
        />
      </div>

      {/* ── Mini Funnel ───────────────────────────────────────────────────── */}
      <MiniFunnel ruta={ruta} />

      {/* ── 2-col actividad ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

        {/* Últimos registros */}
        <div className="surface-card overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <UserCheck size={14} style={{ color: 'var(--success)' }} />
              <h2 className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                Últimos registros
              </h2>
              {artStats?.today ? (
                <PillBadge label={`+${artStats.today} hoy`} variant="green" size="xs" />
              ) : null}
            </div>
            <Link href="/contactos" className="text-[10px] font-medium" style={{ color: 'var(--text-3)' }}>
              Ver todos →
            </Link>
          </div>

          {artLoading && artUsers.length === 0 ? (
            <div className="overflow-hidden">
              <table className="w-full">
                <tbody><SkeletonRows count={5} cols={3} /></tbody>
              </table>
            </div>
          ) : artUsers.length === 0 ? (
            <EmptyState icon={UserCheck} title="Sin registros recientes" subtitle="Los nuevos usuarios aparecen aquí" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {artUsers.map((u: any, i: number) => {
                const plan = u.subscription?.planType ?? u.subscription ?? 'free'
                const isPro = plan !== 'free'
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{ cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Avatar placeholder */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
                    >
                      {(u.name?.[0] || u.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
                        {u.name || u.email?.split('@')[0] || '—'}
                      </p>
                      <p className="text-[10px] truncate font-mono" style={{ color: 'var(--text-3)' }}>
                        {u.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <PillBadge
                        label={isPro ? 'Pro' : 'Free'}
                        variant={isPro ? 'lime' : 'gray'}
                        size="xs"
                      />
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                        {timeAgo(u.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Últimas aperturas */}
        <div className="surface-card overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <MailOpen size={14} style={{ color: '#F59E0B' }} />
              <h2 className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                Actividad email
              </h2>
              {opens?.totalOpened ? (
                <PillBadge label={`${opens.totalOpened} abiertos`} variant="amber" size="xs" />
              ) : null}
            </div>
            <Link href="/campaigns" className="text-[10px] font-medium" style={{ color: 'var(--text-3)' }}>
              Ver campañas →
            </Link>
          </div>

          {opensLoading ? (
            <div className="overflow-hidden">
              <table className="w-full">
                <tbody><SkeletonRows count={5} cols={3} /></tbody>
              </table>
            </div>
          ) : !opens || opens.leads?.length === 0 ? (
            <EmptyState icon={MailOpen} title="Sin aperturas recientes" subtitle="Los datos aparecen cuando Instantly registra actividad" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {opens.leads.slice(0, 8).map((lead: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: lead.status === 'replied' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)' }}
                  >
                    {lead.status === 'replied'
                      ? <MessageSquare size={11} style={{ color: 'var(--success)' }} />
                      : <MailOpen size={11} style={{ color: '#F59E0B' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
                      {lead.company || lead.firstName || lead.email?.split('@')[0] || '—'}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>
                      {lead.campaign || '—'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <PillBadge
                      label={lead.status === 'replied' ? 'Respondió' : 'Abrió'}
                      variant={lead.status === 'replied' ? 'green' : 'amber'}
                      size="xs"
                    />
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {lead.updatedAt ? timeAgo(lead.updatedAt) : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Health metrics ────────────────────────────────────────────────── */}
      <div className="surface-card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} style={{ color: 'var(--blue)' }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
            Salud de la plataforma
          </h2>
          {!artLoading && artStats && (
            <span className="text-[10px] font-medium" style={{ color: 'var(--success)' }}>● live</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HealthBar label="Verificación email"   value={artPlatform?.emailVerification}  color="var(--success)" />
          <HealthBar label="Perfiles completos"    value={artPlatform?.completeProfiles}   color="var(--blue)"    />
          <HealthBar label="Usuarios en agencias"  value={artPlatform?.usersInAgencies}    color="#A78BFA"        />
          <HealthBar
            label="Conversión base → Pro"
            value={ruta?.conversion_rates?.base_to_pro != null
              ? Math.round(ruta.conversion_rates.base_to_pro * 100)
              : undefined}
            color="var(--lime)"
          />
        </div>
        {artStats && (
          <div
            className="mt-4 pt-3 flex flex-wrap gap-x-6 gap-y-1.5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {[
              { label: 'Total',       value: artStats.total },
              { label: 'Free',        value: artStats.free },
              { label: 'Pro',         value: artStats.pro },
              { label: 'Agencias',    value: artStats.agencyCount },
              { label: 'Artistas',    value: artStats.artistCount },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{m.label}</span>
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-1)' }}>
                  {artLoading ? '…' : m.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Collapsible: Estado campañas ──────────────────────────────────── */}
      <Collapsible
        title="Estado de campañas"
        badge={campaigns.length || undefined}
        badgeVariant="blue"
        icon={Mail}
        iconColor="var(--blue)"
        defaultOpen={false}
        onRefresh={fetchInstantly}
        refreshing={loading}
      >
        {loading && campaigns.length === 0 ? (
          <table className="w-full">
            <tbody><SkeletonRows count={4} cols={5} /></tbody>
          </table>
        ) : campaigns.length === 0 ? (
          <EmptyState icon={Mail} title="Sin campañas activas" subtitle="Los datos aparecen cuando Instantly está conectado" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                  {['Campaña', 'Enviados', 'Apertura', 'Reply', 'Estado'].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: any) => {
                  const st = campaignStatus[String(c.status)] ?? campaignStatus['0']
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--text-1)' }}>
                        {c.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
                        {c.sent ?? c.emailsSent ?? 0}/{c.total ?? c.totalContacts ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold font-mono"
                          style={{ color: (c.openRate ?? 0) > 0 ? '#F59E0B' : 'var(--text-3)' }}
                        >
                          {(c.openRate ?? 0) > 0 ? `${c.openRate}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold font-mono"
                          style={{ color: (c.replyRate ?? 0) > 0 ? 'var(--success)' : 'var(--text-3)' }}
                        >
                          {(c.replyRate ?? 0) > 0 ? `${c.replyRate}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PillBadge label={st.label} variant={st.variant} size="xs" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Collapsible>

      {/* ── Collapsible: Tareas pendientes ────────────────────────────────── */}
      <Collapsible
        title="Tareas pendientes"
        badge={tasks.length > 0 ? tasks.length : undefined}
        badgeVariant="red"
        icon={AlertCircle}
        iconColor="var(--error)"
        defaultOpen={tasks.length > 0}
        onRefresh={fetchTasks}
        refreshing={tasksLoading}
      >
        {tasksLoading && tasks.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs animate-pulse" style={{ color: 'var(--text-3)' }}>
            Cargando tareas…
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Sin tareas pendientes" subtitle="Todo en orden" />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {tasks.map(task => {
              const iconMap: Record<string, any> = { reply: MessageCircle, bounce: XCircle, campaign: PlayCircle }
              const colorMap: Record<string, string> = {
                reply:    'rgba(96,165,250,0.15)',
                bounce:   'rgba(239,68,68,0.15)',
                campaign: 'rgba(245,158,11,0.15)',
              }
              const textColorMap: Record<string, string> = {
                reply: '#60A5FA', bounce: 'var(--error)', campaign: '#F59E0B',
              }
              const priorityVariant: Record<string, 'red' | 'amber' | 'gray'> = {
                alta: 'red', media: 'amber', baja: 'gray',
              }
              const TaskIcon = iconMap[task.type] || AlertCircle

              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className="p-1.5 rounded-lg shrink-0 mt-0.5"
                    style={{ background: colorMap[task.type] ?? 'var(--bg-elevated)' }}
                  >
                    <TaskIcon size={13} style={{ color: textColorMap[task.type] ?? 'var(--text-2)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                        {task.title}
                      </p>
                      <PillBadge
                        label={task.priority}
                        variant={priorityVariant[task.priority] ?? 'gray'}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: 'var(--text-2)' }}>
                      {task.description}
                    </p>
                    {task.email && (
                      <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-3)' }}>
                        {task.email}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-xs font-medium flex items-center gap-0.5 shrink-0 cursor-pointer"
                    style={{ color: 'var(--blue)' }}
                  >
                    {task.action} <ChevronRight size={11} />
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Collapsible>

    </div>
  )
}
