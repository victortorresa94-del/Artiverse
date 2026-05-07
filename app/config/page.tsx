'use client'
import { useState } from 'react'
import { domainWarmup } from '@/data/mock'
import { CheckCircle2, XCircle, RefreshCw, Settings, Shield, Zap, Info } from 'lucide-react'
import PillBadge from '@/components/ui/PillBadge'

// ── Warm-up components (dark-themed) ──────────────────────────────────────────

function GaugeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function Ring({ percent, color }: { percent: number; color: string }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <svg width="120" height="120" className="-rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

function WarmupTab() {
  return (
    <div className="max-w-[900px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {domainWarmup.map(d => {
          const color = d.status === 'ready' ? 'var(--success)' : d.status === 'warming' ? 'var(--blue)' : 'var(--text-3)'
          const statusVariant: Record<string, 'green' | 'blue' | 'gray'> = {
            ready: 'green', warming: 'blue', paused: 'gray',
          }
          const statusLabel: Record<string, string> = {
            ready: 'Listo', warming: 'Calentando', paused: 'Pausado',
          }

          return (
            <div key={d.domain} className="surface-card p-5">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{d.domain}</h2>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>{d.email}</p>
                </div>
                <PillBadge
                  label={statusLabel[d.status] ?? d.status}
                  variant={statusVariant[d.status] ?? 'gray'}
                  pulse={d.status === 'warming'}
                  size="xs"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 mb-5">
                <div className="relative shrink-0">
                  <Ring percent={d.warmupPercent} color={color} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{d.warmupPercent}%</span>
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>warm-up</span>
                  </div>
                </div>
                <div className="flex-1 w-full space-y-3.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: 'var(--text-2)' }}>Reputación</span>
                      <span className="font-semibold font-mono" style={{ color }}>{d.reputationScore}/100</span>
                    </div>
                    <GaugeBar value={d.reputationScore} max={100} color={color} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: 'var(--text-2)' }}>Volumen diario</span>
                      <span className="font-semibold font-mono" style={{ color: 'var(--blue)' }}>
                        {d.warmupEmailsToday + d.campaignEmailsToday}/{d.dailyTarget}
                      </span>
                    </div>
                    <GaugeBar value={d.warmupEmailsToday + d.campaignEmailsToday} max={d.dailyTarget} color="var(--blue)" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Warm-up hoy', value: d.warmupEmailsToday },
                  { label: 'Campaña hoy', value: d.campaignEmailsToday },
                  { label: 'Objetivo',    value: d.dailyTarget },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--bg-elevated)' }}>
                    <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }}>
                Inicio: {d.startDate} ·{' '}
                {d.status === 'ready'
                  ? 'Dominio listo para volumen completo'
                  : `~${Math.ceil((100 - d.warmupPercent) / 3)} días para completar`}
              </div>
            </div>
          )
        })}
      </div>

      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
          Progreso hacia objetivo de volumen diario
        </h3>
        <div className="space-y-3">
          {domainWarmup.map(d => {
            const current = d.warmupEmailsToday + d.campaignEmailsToday
            const color = d.status === 'ready' ? 'var(--success)' : 'var(--blue)'
            return (
              <div key={d.domain} className="flex items-center gap-4">
                <span className="text-xs font-mono w-44 shrink-0 truncate" style={{ color: 'var(--text-2)' }}>
                  {d.email}
                </span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (current / d.dailyTarget) * 100)}%`, background: color }}
                  />
                </div>
                <span className="text-xs font-semibold font-mono w-16 text-right shrink-0" style={{ color: 'var(--text-2)' }}>
                  {current} / {d.dailyTarget}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] mt-4" style={{ color: 'var(--text-3)' }}>
          Objetivo: 100–150 emails/día por dominio para máximo volumen sin afectar deliverability
        </p>
      </div>
    </div>
  )
}

// ── Credenciales tab ───────────────────────────────────────────────────────────

function CredencialesTab() {
  const [verifying, setVerifying] = useState<Record<string, boolean>>({})
  const [results,   setResults]   = useState<Record<string, boolean | null>>({})

  async function verify(key: string, url: string) {
    setVerifying(v => ({ ...v, [key]: true }))
    try {
      const res = await fetch(url)
      setResults(r => ({ ...r, [key]: res.ok }))
    } catch {
      setResults(r => ({ ...r, [key]: false }))
    } finally {
      setVerifying(v => ({ ...v, [key]: false }))
    }
  }

  const rows = [
    {
      label:    'Instantly API Key',
      masked:   'NzYzNzhlMDQ…Q0Om9tWnlSYWVmclpHTQ==',
      key:      'instantly',
      verifyUrl: '/api/instantly?lite=1',
    },
    {
      label:    'Artiverse API Key',
      masked:   process.env.ARTIVERSE_API_KEY ? '••••••••••••' : '(no configurada)',
      key:      'artiverse',
      verifyUrl: '/api/artiverse-users',
    },
    {
      label:    'HubSpot Portal ID',
      masked:   '148220932',
      key:      null,
      verifyUrl: null,
    },
    {
      label:    'Token de acceso',
      masked:   'AETHER2026',
      key:      null,
      verifyUrl: null,
    },
  ]

  return (
    <div className="surface-card overflow-hidden max-w-[700px]">
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>API Keys y credenciales</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Solo visibles para el equipo de Aether Labs</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between px-5 py-4 gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: 'var(--text-1)' }}>{row.label}</p>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-3)' }}>{row.masked}</p>
            </div>
            {row.key && row.verifyUrl ? (
              <div className="flex items-center gap-2 shrink-0">
                {results[row.key] !== undefined && (
                  results[row.key]
                    ? <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                    : <XCircle      size={14} style={{ color: 'var(--error)' }} />
                )}
                <button
                  onClick={() => verify(row.key!, row.verifyUrl!)}
                  disabled={verifying[row.key]}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: 'var(--blue-dim)',
                    color:      'var(--blue)',
                    border:     '1px solid rgba(37,99,235,0.2)',
                  }}
                >
                  <RefreshCw size={10} className={verifying[row.key] ? 'animate-spin' : ''} />
                  Verificar
                </button>
              </div>
            ) : (
              <PillBadge label="Info" variant="gray" size="xs" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sync tab ───────────────────────────────────────────────────────────────────

function SyncTab() {
  const [refreshing, setRefreshing] = useState(false)
  const [done,       setDone]       = useState(false)

  const apis = [
    { name: '/api/summary',         ttl: '5 min', label: 'Instantly campaigns' },
    { name: '/api/ruta',            ttl: '5 min', label: 'Growth map' },
    { name: '/api/pipeline',        ttl: '3 min', label: 'CRM pipeline' },
    { name: '/api/artiverse-users', ttl: '5 min', label: 'Artiverse platform' },
    { name: '/api/opens',           ttl: '5 min', label: 'Email opens' },
  ]

  async function forceRefresh() {
    setRefreshing(true); setDone(false)
    await Promise.allSettled(
      apis.map(a => fetch(`${a.name}?token=AETHER2026&_t=${Date.now()}`, { cache: 'no-store' }))
    )
    setRefreshing(false); setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  return (
    <div className="surface-card overflow-hidden max-w-[700px]">
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Estado de caché de APIs</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Los datos se refrescan automáticamente según el TTL</p>
        </div>
        <button
          onClick={forceRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: done ? 'rgba(34,197,94,0.12)' : 'var(--bg-elevated)',
            color:      done ? 'var(--success)'        : 'var(--text-2)',
            border:     `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
          }}
        >
          <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          {done ? '¡Listo!' : refreshing ? 'Refrescando…' : 'Forzar refresh global'}
        </button>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {apis.map(api => (
          <div key={api.name} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-xs font-mono font-medium" style={{ color: 'var(--text-1)' }}>{api.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{api.label}</p>
            </div>
            <PillBadge label={`TTL ${api.ttl}`} variant="blue" size="xs" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sobre tab ──────────────────────────────────────────────────────────────────

function SobreTab() {
  const info = [
    { label: 'Versión',       value: '2.0.0' },
    { label: 'Framework',     value: 'Next.js 14 (App Router)' },
    { label: 'Estilos',       value: 'Tailwind CSS + CSS Variables' },
    { label: 'Tipografía',    value: 'Poppins + JetBrains Mono' },
    { label: 'Fuentes datos', value: 'Instantly.ai API v2 + Artiverse API' },
    { label: 'Deployment',    value: 'Vercel (artiverse-sigma.vercel.app)' },
    { label: 'Desarrollado por', value: 'Víctor Torres · Aether Labs' },
    { label: 'Para',          value: 'Dani Bonito · Artiverse' },
  ]

  return (
    <div className="surface-card overflow-hidden max-w-[600px]">
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Artiverse Control Center</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Información técnica del sistema</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {info.map(row => (
          <div key={row.label} className="flex items-center justify-between px-5 py-3">
            <span className="text-xs" style={{ color: 'var(--text-2)' }}>{row.label}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-1)' }}>{row.value}</span>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        <a
          href="https://artiverse-sigma.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(37,99,235,0.2)' }}
        >
          → Production
        </a>
        <a
          href="https://app.instantly.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
        >
          → Instantly
        </a>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'warmup',       label: 'Warm-up',       icon: Zap },
  { id: 'credenciales', label: 'Credenciales',  icon: Shield },
  { id: 'sync',         label: 'Sync / Caché',  icon: RefreshCw },
  { id: 'sobre',        label: 'Sobre',         icon: Info },
]

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState('warmup')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={16} style={{ color: 'var(--text-2)' }} />
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Config</h1>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Warm-up de dominios, credenciales y estado del sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-all relative"
              style={{
                color:        active ? 'var(--text-1)' : 'var(--text-3)',
                borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'warmup'       && <WarmupTab />}
      {activeTab === 'credenciales' && <CredencialesTab />}
      {activeTab === 'sync'         && <SyncTab />}
      {activeTab === 'sobre'        && <SobreTab />}
    </div>
  )
}
