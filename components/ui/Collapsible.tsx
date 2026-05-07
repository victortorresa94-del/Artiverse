'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, RefreshCw, type LucideIcon } from 'lucide-react'

interface CollapsibleProps {
  title: string
  badge?: number | string
  badgeVariant?: 'blue' | 'amber' | 'green' | 'red' | 'gray'
  icon: LucideIcon
  iconColor?: string
  defaultOpen?: boolean
  onRefresh?: () => void
  refreshing?: boolean
  children: React.ReactNode
}

const badgeColors: Record<string, { bg: string; text: string }> = {
  blue:  { bg: 'var(--blue)',            text: '#fff' },
  amber: { bg: 'rgba(245,158,11,0.15)',  text: '#F59E0B' },
  green: { bg: 'rgba(34,197,94,0.15)',   text: '#22C55E' },
  red:   { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444' },
  gray:  { bg: 'var(--bg-elevated)',     text: 'var(--text-2)' },
}

export default function Collapsible({
  title, badge, badgeVariant = 'gray', icon: Icon, iconColor,
  defaultOpen = false, onRefresh, refreshing, children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { bg: badgeBg, text: badgeText } = badgeColors[badgeVariant] ?? badgeColors.gray

  return (
    <div
      className="surface-card overflow-hidden mb-3"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left transition-colors"
        style={{ borderBottom: open ? '1px solid var(--border)' : 'none' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            size={15}
            style={{ color: iconColor ?? 'var(--text-2)', flexShrink: 0 }}
          />
          <h2
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text-1)' }}
          >
            {title}
          </h2>
          {badge !== undefined && (
            <span
              className="text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0"
              style={{ background: badgeBg, color: badgeText }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {open && onRefresh && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onRefresh() }}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Cargando…' : 'Actualizar'}
            </span>
          )}
          {open
            ? <ChevronUp  size={13} style={{ color: 'var(--text-3)' }} />
            : <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
          }
        </div>
      </button>
      {open && children}
    </div>
  )
}
