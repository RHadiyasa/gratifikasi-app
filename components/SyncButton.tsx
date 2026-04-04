'use client'

import { Button } from '@heroui/react'
import { RefreshCw } from 'lucide-react'

interface Props {
  id:       string
  syncing:  boolean
  onSync:   (id: string) => void
  size?:    'sm' | 'md'
}

export function SyncButton({ id, syncing, onSync, size = 'sm' }: Props) {
  return (
    <Button
      size={size}
      variant="flat"
      color="primary"
      isIconOnly
      isDisabled={syncing}
      onPress={() => onSync(id)}
      aria-label="Sync LKE"
    >
      <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
    </Button>
  )
}
