import { CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  target:    'WBK' | 'WBBM'
  tercapai?: boolean
  showStatus?: boolean
}

export function TargetBadge({ target, tercapai, showStatus = false }: Props) {
  const base = target === 'WBK'
    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${base}`}>
        {target}
      </span>
      {showStatus && tercapai !== undefined && (
        tercapai
          ? <CheckCircle2 size={13} className="text-green-500" />
          : <XCircle      size={13} className="text-red-400" />
      )}
    </span>
  )
}
