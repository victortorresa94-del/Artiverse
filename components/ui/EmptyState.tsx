import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <Icon size={22} style={{ color: 'var(--text-3)' }} />
      </div>
      <p
        className="text-sm font-semibold mb-1"
        style={{ color: 'var(--text-1)' }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          className="text-xs max-w-xs"
          style={{ color: 'var(--text-2)' }}
        >
          {subtitle}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: 'var(--blue-dim)',
            color:      'var(--blue)',
            border:     '1px solid rgba(37,99,235,0.2)',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
