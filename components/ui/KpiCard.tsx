import { type LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  accentColor?: string   // e.g. 'var(--blue)' or '#22C55E'
  loading?: boolean
  trend?: number         // positive = up, negative = down
}

export default function KpiCard({
  label, value, sub, icon: Icon, accentColor = 'var(--blue)', loading = false, trend,
}: KpiCardProps) {
  return (
    <div
      className="surface-card p-4 sm:p-5 flex flex-col gap-3 transition-all hover:border-white/10"
    >
      <div className="flex items-start justify-between gap-2">
        {/* Icon */}
        <div
          className="p-2 rounded-lg shrink-0"
          style={{ background: `${accentColor}18` }}
        >
          <Icon size={16} style={{ color: accentColor }} />
        </div>
        {/* Trend badge */}
        {trend !== undefined && !loading && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
            style={{
              color: trend >= 0 ? 'var(--success)' : 'var(--error)',
              background: trend >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            }}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      <div className="min-w-0">
        {loading ? (
          <>
            <div className="skeleton h-8 w-16 mb-1 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </>
        ) : (
          <>
            <p
              className="text-2xl sm:text-3xl font-bold leading-none truncate"
              style={{ color: 'var(--text-1)' }}
            >
              {value}
            </p>
            {sub && (
              <p className="text-[11px] mt-1.5 truncate" style={{ color: 'var(--text-2)' }}>
                {sub}
              </p>
            )}
          </>
        )}
      </div>

      <p
        className="text-[10px] uppercase tracking-wider font-semibold truncate"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </p>
    </div>
  )
}
