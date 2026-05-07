type PillVariant = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple' | 'lime'

const variants: Record<PillVariant, { bg: string; text: string; dot?: string }> = {
  blue:   { bg: 'rgba(37,99,235,0.15)',   text: '#60A5FA' },
  green:  { bg: 'rgba(34,197,94,0.12)',   text: '#22C55E' },
  amber:  { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B' },
  red:    { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444' },
  gray:   { bg: 'rgba(139,139,168,0.12)', text: '#8B8BA8' },
  purple: { bg: 'rgba(168,85,247,0.12)',  text: '#C084FC' },
  lime:   { bg: 'rgba(204,255,0,0.10)',   text: '#CCFF00' },
}

interface PillBadgeProps {
  label: string
  variant?: PillVariant
  pulse?: boolean    // animated status dot
  size?: 'xs' | 'sm'
}

export default function PillBadge({
  label, variant = 'gray', pulse = false, size = 'sm',
}: PillBadgeProps) {
  const { bg, text } = variants[variant]
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs'
  const px = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${textSize} ${px} shrink-0`}
      style={{ background: bg, color: text }}
    >
      {pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full status-pulse shrink-0"
          style={{ background: text }}
        />
      )}
      {label}
    </span>
  )
}
