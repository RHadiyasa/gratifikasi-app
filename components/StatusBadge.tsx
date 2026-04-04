type Status = 'Belum Dicek' | 'Sedang Dicek' | 'Selesai' | 'Perlu Revisi'

const MAP: Record<Status, string> = {
  'Belum Dicek':  'bg-default-100 text-default-600',
  'Sedang Dicek': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Selesai':      'bg-green-500/10 text-green-600 dark:text-green-400',
  'Perlu Revisi': 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export function StatusBadge({ status }: { status: string }) {
  const cls = MAP[status as Status] ?? 'bg-default-100 text-default-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
