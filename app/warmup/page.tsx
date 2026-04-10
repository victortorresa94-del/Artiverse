'use client'
import { domainWarmup } from '@/data/mock'

function GaugeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function Ring({ percent, color }: { percent: number; color: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <svg width="136" height="136" className="-rotate-90">
      <circle cx="68" cy="68" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10" />
      <circle cx="68" cy="68" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

export default function WarmupPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[900px]">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Warm-up de dominios</h1>
        <p className="text-sm text-gray-500 mt-1">Estado de reputación y calentamiento de los dominios de envío</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {domainWarmup.map(d => {
          const color = d.status === 'ready' ? '#059669' : d.status === 'warming' ? '#2563EB' : '#9CA3AF'
          const statusConf = {
            ready:   { label: 'Listo',      bg: 'bg-emerald-50', text: 'text-emerald-700' },
            warming: { label: 'Calentando', bg: 'bg-blue-50',    text: 'text-blue-700' },
            paused:  { label: 'Pausado',    bg: 'bg-gray-100',   text: 'text-gray-500' },
          }[d.status]

          return (
            <div key={d.domain} className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">{d.domain}</h2>
                  <p className="text-sm text-gray-400 mt-0.5 font-mono">{d.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConf.bg} ${statusConf.text}`}>
                  {statusConf.label}
                </span>
              </div>

              {/* Ring + bars */}
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mb-6">
                <div className="relative shrink-0">
                  <Ring percent={d.warmupPercent} color={color} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{d.warmupPercent}%</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">warm-up</span>
                  </div>
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500 font-medium">Reputación</span>
                      <span className="text-gray-900 font-semibold font-mono">{d.reputationScore}/100</span>
                    </div>
                    <GaugeBar value={d.reputationScore} max={100} color={color} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500 font-medium">Volumen diario</span>
                      <span className="text-gray-900 font-semibold font-mono">{d.warmupEmailsToday + d.campaignEmailsToday}/{d.dailyTarget}</span>
                    </div>
                    <GaugeBar value={d.warmupEmailsToday + d.campaignEmailsToday} max={d.dailyTarget} color="#2563EB" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Warm-up hoy',   value: d.warmupEmailsToday,    note: 'emails' },
                  { label: 'Campaña hoy',   value: d.campaignEmailsToday,  note: 'emails' },
                  { label: 'Objetivo',      value: d.dailyTarget,          note: 'emails/día' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-medium">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-[10px] text-gray-400">{s.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                Inicio warm-up: {d.startDate} ·{' '}
                {d.status === 'ready'
                  ? 'Dominio listo para campañas a volumen completo'
                  : `~${Math.ceil((100 - d.warmupPercent) / 3)} días para completar`}
              </div>
            </div>
          )
        })}
      </div>

      {/* Volume progress */}
      <div className="mt-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Progreso hacia objetivo de volumen diario</h3>
        <div className="space-y-3">
          {domainWarmup.map(d => {
            const current = d.warmupEmailsToday + d.campaignEmailsToday
            return (
              <div key={d.domain} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-36 sm:w-48 shrink-0 truncate font-mono text-xs">{d.email}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (current / d.dailyTarget) * 100)}%`, backgroundColor: d.status === 'ready' ? '#059669' : '#2563EB' }} />
                </div>
                <span className="text-xs font-semibold font-mono text-gray-600 w-20 text-right shrink-0">
                  {current} / {d.dailyTarget}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4">Objetivo: 100–150 emails/día por dominio para máximo volumen sin afectar deliverability</p>
      </div>
    </div>
  )
}
