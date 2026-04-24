'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Flame, UserPlus, RefreshCw,
  ExternalLink, CheckCircle2, MailOpen, ChevronRight, Send,
} from 'lucide-react'
import KpiCard from '@/components/ui/KpiCard'
import PillBadge from '@/components/ui/PillBadge'
import EmptyState from '@/components/ui/EmptyState'

// ── Types ──────────────────────────────────────────────────────────────────────

interface HoyData {
  needsReply:  { email: string; company: string; campaignName: string; replies: number; lastReply: string }[]
  hotOpened:   { email: string; company: string; campaignName: string; opens: number; lastOpen: string }[]
  newToday:    { email: string; name: string; subscription: string; hasAgency: boolean; createdAt: string }[]
  stats: {
    totalNeedsReply: number; totalHot: number; totalNewToday: number
    totalOutbound: number; totalInPlatform: number
    artiverseTotal: number; artiverseToday: number
    sentToday: number; openedToday: number
  }
  last_updated: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  if (!iso) return '—'
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60)    return 'ahora'
  if (d < 3600)  return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

// ── Section card ───────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, iconColor, title, badge, badgeVariant, linkHref, linkLabel, children,
}: {
  icon: React.ElementType; iconColor: string; title: string
  badge: number; badgeVariant: 'red' | 'amber' | 'green' | 'blue' | 'gray'
  linkHref: string; linkLabel: string; children: React.ReactNode
}) {
  return (
    <div
      className="surface-card overflow-hidden flex flex-col"
      style={{ minHeight: 240 }}
    >
      <div
        className="flex items-center justify-between px-4 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: `${iconColor}18` }}
          >
            <Icon size={14} style={{ color: iconColor }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h2>
          <PillBadge label={String(badge)} variant={badgeVariant} size="xs" />
        </div>
        <Link
          href={linkHref}
          className="text-[10px] font-medium flex items-center gap-0.5"
          style={{ color: 'var(--text-3)' }}
        >
          {linkLabel} <ChevronRight size={10} />
        </Link>
      </div>
      <div className="flex-1 divide-y" style={{ borderColor: 'var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function HoyPage() {
  const [data,    setData]    = useState<HoyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/hoy?token=AETHER2026')
      if (res.ok) {
        setData(await res.json())
        setLastUpdated(new Date().toLocaleTimeString('es-ES'))
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 10 minutes
    const t = setInterval(fetchData, 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchData])

  const stats = data?.stats

  const allEmpty = data && data.needsReply.length === 0 && data.hotOpened.length === 0 && data.newToday.length === 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px]">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
            Hoy
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            Acciones urgentes
            {lastUpdated && ` · act. ${lastUpdated}`}
            {' · '}
            <span style={{ color: 'var(--text-2)' }}>auto-refresh cada 10 min</span>
          </p>
        </div>
        <button
          onClick={fetchData}
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
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="Necesitan respuesta"
          value={loading ? '…' : stats?.totalNeedsReply ?? 0}
          icon={MessageSquare}
          accentColor="#EF4444"
          loading={loading && !data}
        />
        <KpiCard
          label="Hot (3+ aperturas)"
          value={loading ? '…' : stats?.totalHot ?? 0}
          icon={Flame}
          accentColor="#F59E0B"
          loading={loading && !data}
        />
        <KpiCard
          label="Nuevos hoy"
          value={loading ? '…' : stats?.totalNewToday ?? 0}
          sub={stats?.artiverseTotal ? `de ${stats.artiverseTotal} total` : undefined}
          icon={UserPlus}
          accentColor="var(--success)"
          loading={loading && !data}
        />
        <KpiCard
          label="En plataforma"
          value={loading ? '…' : stats?.totalInPlatform ?? 0}
          icon={CheckCircle2}
          accentColor="var(--blue)"
          loading={loading && !data}
        />
        <KpiCard
          label="Enviados hoy"
          value={loading ? '…' : stats?.sentToday ?? 0}
          icon={Send}
          accentColor="var(--text-2)"
          loading={loading && !data}
        />
        <KpiCard
          label="Abiertos hoy"
          value={loading ? '…' : stats?.openedToday ?? 0}
          icon={MailOpen}
          accentColor="#F59E0B"
          loading={loading && !data}
        />
      </div>

      {/* All empty state */}
      {allEmpty && !loading && (
        <div className="surface-card">
          <EmptyState
            icon={CheckCircle2}
            title="Todo al día"
            subtitle="No hay acciones urgentes pendientes. ¡Buen trabajo!"
          />
        </div>
      )}

      {/* Section grid */}
      {!allEmpty && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Necesitan respuesta */}
          <SectionCard
            icon={MessageSquare}
            iconColor="#EF4444"
            title="Han respondido"
            badge={data?.needsReply.length ?? 0}
            badgeVariant="red"
            linkHref="/contactos?activeTab=needs_reply"
            linkLabel="Ver todos"
          >
            {loading && !data ? (
              <div className="px-4 py-8 text-center text-xs animate-pulse" style={{ color: 'var(--text-3)' }}>Cargando…</div>
            ) : data?.needsReply.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Sin respuestas pendientes" />
            ) : (
              data.needsReply.slice(0, 6).map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                  >
                    {(c.company?.[0] || c.email[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
                      {c.company || c.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>
                      {c.campaignName || c.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PillBadge label={`${c.replies} resp.`} variant="red" size="xs" />
                    <Link
                      href={`/contactos?email=${encodeURIComponent(c.email)}`}
                      className="flex items-center gap-0.5 text-[10px] font-medium transition-colors"
                      style={{ color: 'var(--blue)' }}
                    >
                      Ver <ExternalLink size={9} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          {/* Hot - 3+ aperturas */}
          <SectionCard
            icon={Flame}
            iconColor="#F59E0B"
            title="Hot — 3+ aperturas sin respuesta"
            badge={data?.hotOpened.length ?? 0}
            badgeVariant="amber"
            linkHref="/contactos?activeTab=opened"
            linkLabel="Ver todos"
          >
            {loading && !data ? (
              <div className="px-4 py-8 text-center text-xs animate-pulse" style={{ color: 'var(--text-3)' }}>Cargando…</div>
            ) : data?.hotOpened.length === 0 ? (
              <EmptyState icon={MailOpen} title="Sin contactos calientes ahora" />
            ) : (
              data.hotOpened.slice(0, 6).map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
                  >
                    {(c.company?.[0] || c.email[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
                      {c.company || c.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>
                      {c.campaignName} · última apertura {timeAgo(c.lastOpen)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PillBadge label={`${c.opens}x`} variant="amber" size="xs" />
                    <Link
                      href={`/contactos?email=${encodeURIComponent(c.email)}`}
                      className="flex items-center gap-0.5 text-[10px] font-medium"
                      style={{ color: 'var(--blue)' }}
                    >
                      Ver <ExternalLink size={9} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          {/* Nuevos hoy */}
          <SectionCard
            icon={UserPlus}
            iconColor="var(--success)"
            title="Nuevos en Artiverse hoy"
            badge={data?.newToday.length ?? 0}
            badgeVariant="green"
            linkHref="/contactos?activeTab=in_platform"
            linkLabel="Ver plataforma"
          >
            {loading && !data ? (
              <div className="px-4 py-8 text-center text-xs animate-pulse" style={{ color: 'var(--text-3)' }}>Cargando…</div>
            ) : data?.newToday.length === 0 ? (
              <EmptyState icon={UserPlus} title="Sin nuevos registros hoy" />
            ) : (
              data.newToday.slice(0, 6).map((u, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}
                  >
                    {(u.name?.[0] || u.email[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
                      {u.name || u.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] truncate font-mono" style={{ color: 'var(--text-3)' }}>{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <PillBadge
                      label={u.subscription !== 'free' ? 'Pro' : 'Free'}
                      variant={u.subscription !== 'free' ? 'lime' : 'gray'}
                      size="xs"
                    />
                    {u.hasAgency && <PillBadge label="Agencia" variant="purple" size="xs" />}
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          {/* Resumen general */}
          <div className="surface-card p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
              Resumen del estado
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Total outbound',    value: stats?.totalOutbound   ?? 0, color: 'var(--text-1)' },
                { label: 'En plataforma',     value: stats?.totalInPlatform ?? 0, color: '#22C55E' },
                { label: 'Total Artiverse',   value: stats?.artiverseTotal  ?? 0, color: 'var(--blue)' },
                { label: 'Nuevos hoy',        value: stats?.artiverseToday  ?? 0, color: '#CCFF00' },
                { label: 'Necesitan reply',   value: stats?.totalNeedsReply ?? 0, color: '#EF4444' },
                { label: 'Hot (3+ opens)',     value: stats?.totalHot        ?? 0, color: '#F59E0B' },
                { label: 'Enviados hoy',      value: stats?.sentToday       ?? 0, color: 'var(--text-2)' },
                { label: 'Abiertos hoy',      value: stats?.openedToday     ?? 0, color: '#F59E0B' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-2)' }}>{m.label}</span>
                  <span className="text-sm font-bold" style={{ color: m.color }}>
                    {loading ? '…' : m.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <Link
                href="/contactos"
                className="flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(37,99,235,0.2)' }}
              >
                Ver CRM completo
              </Link>
              <Link
                href="/ruta"
                className="flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
              >
                Ver Ruta
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
