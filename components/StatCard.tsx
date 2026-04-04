import { ReactNode } from 'react'

interface Props {
  label:     string
  value:     string | number
  sub?:      string
  icon?:     ReactNode
  color?:    'default' | 'green' | 'amber' | 'red' | 'blue' | 'violet'
  size?:     'sm' | 'md'
}

const COLOR_MAP: Record<NonNullable<Props['color']>, string> = {
  default: 'bg-default-100 text-default-700',
  green:   'bg-green-500/10 text-green-600 dark:text-green-400',
  amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  red:     'bg-red-500/10 text-red-600 dark:text-red-400',
  blue:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  violet:  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
}

export function StatCard({ label, value, sub, icon, color = 'default', size = 'md' }: Props) {
  const colorCls = COLOR_MAP[color]
  const isLg = size === 'md'

  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 ${colorCls}`}>
      {icon && (
        <div className="shrink-0 opacity-80">{icon}</div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium opacity-70 truncate">{label}</p>
        <p className={`font-bold leading-tight ${isLg ? 'text-2xl' : 'text-lg'}`}>{value}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
