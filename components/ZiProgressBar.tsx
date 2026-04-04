interface Props {
  value:   number  // 0-100
  label?:  string
  size?:   'sm' | 'md'
}

export function ZiProgressBar({ value, label, size = 'md' }: Props) {
  const h    = size === 'sm' ? 'h-1.5' : 'h-2.5'
  const color = value >= 75 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-400'
  const pct  = Math.min(100, Math.max(0, value))

  return (
    <div className="w-full space-y-1">
      <div className={`w-full bg-default-200 rounded-full ${h} overflow-hidden`}>
        <div className={`${h} ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {label !== undefined && (
        <p className="text-xs text-default-500 text-right">{label}</p>
      )}
    </div>
  )
}
