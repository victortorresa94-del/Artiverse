'use client'

interface FilterPillsProps {
  options: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
}

export default function FilterPills({ options, active, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const isActive = opt.id === active
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: isActive ? 'var(--blue)' : 'var(--bg-elevated)',
              color:      isActive ? '#fff'       : 'var(--text-2)',
              border:     `1px solid ${isActive ? 'var(--blue)' : 'var(--border)'}`,
            }}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)',
                  color:      isActive ? '#fff' : 'var(--text-2)',
                }}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
