'use client'
import { domainWarmup } from '@/data/mock'

function GaugeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

function Ring({ percent, color }: { percent: number; color: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <svg width="136" height="136" className="-rotate-90">
      <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
      <circle
        cx="68" cy="68" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

export default function WarmupPage() {
  return (
    <div className="p-8 max-w-[900px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Warm-up de dominios</h1>
        <p className="text-sm text-white/30 mt-1">Estado de reputación y calentamiento de los dominios de envío</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {domainWarmup.map(d => {
          const color = d.status === 'ready' ? '#CCFF00' : d.status === 'warming' ? '#2563EB' : '#6B7280'
          const statusLabel = { ready: 'Listo', warming: 'Calentando', paused: 'Pausado' }[d.status]
          const statusClass = {
            ready: 'text-[#CCFF00] bg-[#CCFF00]/10 border-[#CCFF00]/20',
            warming: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
            paused: 'text-white/30 bg-white/5 border-white/10',
          }[d.status]

          return (
            <div key={d.domain} className="bg-[#111827] border border-white/5 rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">{d.domain}</h2>
                  <p className="text-sm text-white/40 mt-0.5 font-mono">{d.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Ring + percent */}
              <div className="flex items-center gap-8 mb-6">
                <div className="relative shrink-0">
                  <Ring percent={d.warmupPercent} color={color} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">{d.warmupPercent}%</span>
                    <span className="text-[10px] text-white/30">warm-up</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/40">Reputación</span>
                      <span className="text-white font-mono">{d.reputationScore}/100</span>
                    </div>
                    <GaugeBar value={d.reputationScore} max={100} color={color} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/40">Volumen diario actual</span>
                      <span className="text-white font-mono">{d.warmupEmailsToday + d.campaignEmailsToday}/{d.dailyTarget}</span>
                    </div>
                    <GaugeBar value={d.warmupEmailsToday + d.campaignEmailsToday} max={d.dailyTarget} color="#2563EB" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Warm-up hoy', value: d.warmupEmailsToday, note: 'emails' },
                  { label: 'Campaña hoy', value: d.campaignEmailsToday, note: 'emails' },
                  { label: 'Objetivo diario', value: d.dailyTarget, note: 'emails/día' },
                ].map(s => (
                  <div key={s.label} className="bg-[#0A0A0A] rounded-lg p-3 border border-white/5 text-center">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-white/20">{s.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-white/30">
                Inicio warm-up: {d.startDate} ·{' '}
                {d.status === 'ready'
                  ? 'Dominio listo para campañas a volumen completo'
                  : `Estimado ${Math.ceil((100 - d.warmupPercent) / 3)} días para completar`}
              </div>
            </div>
          )
        })}
      </div>

      {/* Objetivo */}
      <div className="mt-6 bg-[#111827] border border-white/5 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Progreso hacia objetivo de volumen</h3>
        <div className="space-y-3">
          {domainWarmup.map(d => {
            const current = d.warmupEmailsToday + d.campaignEmailsToday
            const pct = Math.min(100, (current / d.dailyTarget) * 100)
            return (
              <div key={d.domain} className="flex items-center gap-4">
                <span className="text-sm text-white/60 w-36 shrink-0">{d.email}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: d.status === 'ready' ? '#CCFF00' : '#2563EB' }}
                  />
                </div>
                <span className="text-xs font-mono text-white/40 w-20 text-right shrink-0">
                  {current} / {d.dailyTarget}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-white/20 mt-4">Objetivo: 100–150 emails/día por dominio para máximo volumen sin afectar deliverability</p>
      </div>
    </div>
  )
}
