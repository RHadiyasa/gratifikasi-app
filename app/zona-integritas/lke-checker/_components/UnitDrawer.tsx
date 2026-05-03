'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { X, ExternalLink, RefreshCw, Clock, User, Bot, Pencil, Check, X as XIcon, UserCheck, Building2, ChevronRight } from 'lucide-react'
import type { LkeSubmission } from '@/types/zi'
import { StatusBadge } from '@/components/StatusBadge'
import { TargetBadge } from '@/components/TargetBadge'
import { ZiProgressBar } from '@/components/ZiProgressBar'
import { TARGET_THRESHOLD } from '@/types/zi'
import { useAuthStore } from '@/store/authStore'
import { useZiStore } from '@/store/ziStore'
import { hasPermission } from '@/lib/permissions'

interface Props {
  unit:       LkeSubmission | null
  onClose:    () => void
  onSync:     (id: string) => void
  syncingIds: string[]
}

interface UnitZiAccount {
  _id: string
  name: string
  unitKerja?: string | null
  email?: string | null
  role?: string | null
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmt(v: number | null | undefined) {
  if (v == null) return '—'
  return v.toFixed(2)
}

const KOMPONEN_KEYS = [
  { key: 'manajemen_perubahan',     label: 'Manajemen Perubahan' },
  { key: 'penataan_tatalaksana',    label: 'Penataan Tatalaksana' },
  { key: 'penataan_sdm',            label: 'Penataan SDM' },
  { key: 'penguatan_akuntabilitas', label: 'Penguatan Akuntabilitas' },
  { key: 'penguatan_pengawasan',    label: 'Penguatan Pengawasan' },
  { key: 'peningkatan_pelayanan',   label: 'Peningkatan Pelayanan' },
] as const

function ScoreCard({
  label, icon, nilai, threshold, accentClass, subLabel,
}: {
  label: string
  icon: React.ReactNode
  nilai: number | null
  threshold: number
  accentClass: string
  subLabel?: string
}) {
  const achieved = nilai !== null && nilai >= threshold
  const scoreColor = nilai === null
    ? 'text-default-300'
    : achieved
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-500'

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${accentClass}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-default-500 uppercase tracking-wide">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-3xl font-bold tabular-nums leading-none ${scoreColor}`}>
        {fmt(nilai)}
      </div>
      {nilai !== null && (
        <ZiProgressBar value={nilai} label={`min ${threshold}`} size="sm" />
      )}
      {subLabel && (
        <p className="text-[10px] text-default-400">{subLabel}</p>
      )}
    </div>
  )
}

function KomponenTable({ ai }: { ai: LkeSubmission['nilai_lke_ai'] }) {
  if (!ai?.nilai_akhir) return null

  type PengungkitKey = typeof KOMPONEN_KEYS[number]['key']
  const getA = (k: PengungkitKey) => ai?.pengungkit?.[k]?.nilai ?? null

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-default-400">Komponen Pengungkit</p>
      <div className="rounded-xl border border-default-200 overflow-hidden text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-default-50 text-default-400">
              <th className="text-left py-2 px-3 font-medium">Komponen</th>
              <th className="text-right py-2 px-3 font-medium w-16">Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default-100">
            {KOMPONEN_KEYS.map(({ key, label }) => (
              <tr key={key} className="hover:bg-default-50">
                <td className="py-1.5 px-3 text-default-600">{label}</td>
                <td className="py-1.5 px-3 text-right tabular-nums font-mono">{fmt(getA(key))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-default-50 font-semibold border-t border-default-200">
              <td className="py-2 px-3">Total Pengungkit</td>
              <td className="py-2 px-3 text-right tabular-nums font-mono">{fmt(ai?.pengungkit?.total?.nilai)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-default-400 pt-1">Komponen Hasil</p>
      <div className="rounded-xl border border-default-200 overflow-hidden text-xs">
        <table className="w-full">
          <tbody className="divide-y divide-default-100">
            {[
              { label: 'IPAK',            v: ai?.hasil?.birokrasi_bersih?.ipak?.nilai },
              { label: 'Capaian Kinerja', v: ai?.hasil?.birokrasi_bersih?.capaian_kinerja?.nilai },
              { label: 'IPKP',            v: ai?.hasil?.pelayanan_prima?.ipkp?.nilai },
            ].map(({ label, v }) => (
              <tr key={label} className="hover:bg-default-50">
                <td className="py-1.5 px-3 text-default-600">{label}</td>
                <td className="py-1.5 px-3 text-right tabular-nums font-mono">{fmt(v)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-default-50 font-semibold border-t border-default-200">
              <td className="py-2 px-3">Total Hasil</td>
              <td className="py-2 px-3 text-right tabular-nums font-mono">{fmt(ai?.hasil?.total?.nilai)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Inline editable field ────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  label,
  saving,
}: {
  value: string
  onSave: (v: string) => Promise<void>
  label: string
  saving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)

  function startEdit() {
    setDraft(value)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setDraft(value)
  }

  async function save() {
    if (!draft.trim() || draft.trim() === value) { cancel(); return }
    setBusy(true)
    try {
      await onSave(draft.trim())
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <Input
          size="sm"
          value={draft}
          onValueChange={setDraft}
          placeholder={label}
          classNames={{ input: 'text-sm', inputWrapper: 'h-7 min-h-7' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') cancel()
          }}
        />
        <button
          onClick={save}
          disabled={busy || !draft.trim()}
          className="shrink-0 p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 disabled:opacity-40 transition-colors"
          title="Simpan"
        >
          <Check size={14} />
        </button>
        <button
          onClick={cancel}
          disabled={busy}
          className="shrink-0 p-1 rounded-md hover:bg-default-100 text-default-400 transition-colors"
          title="Batal"
        >
          <XIcon size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 group min-w-0">
      <span className="truncate">{value}</span>
      <button
        onClick={startEdit}
        className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-default-100 text-default-400 hover:text-default-600 transition-all"
        title={`Edit ${label}`}
      >
        <Pencil size={11} />
      </button>
    </div>
  )
}

// ── Main Drawer ──────────────────────────────────────────────────────────────

export default function UnitDrawer({ unit, onClose, onSync, syncingIds }: Props) {
  const { role } = useAuthStore()
  const { updateSubmission } = useZiStore()
  const [savingField, setSavingField] = useState<string | null>(null)
  const [unitZiUsers, setUnitZiUsers] = useState<UnitZiAccount[]>([])
  const [loadingUnitZiUsers, setLoadingUnitZiUsers] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignedUserId, setAssignedUserId] = useState('')
  const isDev = role === 'developer'
  const canSync = hasPermission(role, 'zi:sync')
  const canAssignUnitZi = hasPermission(role, 'zi:assign-unit')

  useEffect(() => {
    setAssignedUserId(unit?.assigned_unit_zi_id ?? '')
  }, [unit?._id, unit?.assigned_unit_zi_id])

  useEffect(() => {
    if (!canAssignUnitZi || !unit) return

    let active = true

    async function loadUnitZiUsers() {
      try {
        setLoadingUnitZiUsers(true)
        const res = await fetch('/api/auth/unit-zi-users')
        const data = await res.json()
        if (!active) return
        if (!res.ok) throw new Error(data.error || 'Gagal memuat akun Unit ZI')
        setUnitZiUsers(data.users ?? [])
      } catch (err) {
        if (!active) return
        console.error('[UnitDrawer] unit zi users', err)
      } finally {
        if (active) setLoadingUnitZiUsers(false)
      }
    }

    loadUnitZiUsers()
    return () => {
      active = false
    }
  }, [canAssignUnitZi, unit?._id])

  async function handleSave(field: 'eselon2' | 'pic_unit', value: string) {
    setSavingField(field)
    try {
      await updateSubmission(unit!._id, { [field]: value })
    } finally {
      setSavingField(null)
    }
  }

  async function handleAssignUnitZi() {
    if (!unit) return
    setAssigning(true)
    try {
      await updateSubmission(unit._id, {
        assigned_unit_zi_id: assignedUserId || null,
      })
    } finally {
      setAssigning(false)
    }
  }

  if (!unit) return null

  const isSyncing = syncingIds.includes(unit._id)
  const threshold = TARGET_THRESHOLD[unit.target]
  const hasAi     = unit.nilai_lke_ai?.nilai_akhir != null
  const selectedUnitZi = unitZiUsers.find((account) => account._id === assignedUserId) ?? null
  const currentAssignedLabel = unit.assigned_unit_zi_name || 'Belum di-assign'
  const hasAssignmentChanged = assignedUserId !== (unit.assigned_unit_zi_id ?? '')
  const assignmentOptions: UnitZiAccount[] = [
    { _id: '__unassigned', name: 'Belum di-assign', unitKerja: '' },
    ...unitZiUsers,
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end" role="presentation" onClick={onClose}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-md bg-background shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="shrink-0 bg-background/95 backdrop-blur border-b border-default-200 px-5 py-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-base leading-tight">
                <InlineEdit
                  value={unit.eselon2}
                  onSave={(v) => handleSave('eselon2', v)}
                  label="Nama Unit"
                  saving={savingField === 'eselon2'}
                />
              </div>
              <p className="text-xs text-default-400 mt-0.5 truncate">{unit.eselon1}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <TargetBadge target={unit.target} tercapai={hasAi ? (unit.nilai_lke_ai!.nilai_akhir! >= threshold) : undefined} showStatus={hasAi} />
                <StatusBadge status={unit.status} />
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-default-100 transition-colors mt-0.5">
              <X size={17} />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-5 space-y-5">

              {/* ── Progress ── */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-default-500">
                  <span className="font-medium">Progress Pemeriksaan AI</span>
                  <span className="tabular-nums font-mono">{unit.checked_count} / {unit.total_data}</span>
                </div>
                <ZiProgressBar value={unit.progress_percent} size="sm" />
              </div>

              {/* ── Score Card ── */}
              {hasAi ? (
                <ScoreCard
                  label="Nilai LKE"
                  icon={<Bot size={11} />}
                  nilai={unit.nilai_lke_ai!.nilai_akhir!}
                  threshold={threshold}
                  accentClass="border-default-200"
                />
              ) : (
                <div className="text-sm text-default-400 text-center py-6 border border-dashed border-default-200 rounded-xl">
                  Belum ada nilai. Jalankan AI Checker lalu klik Sync.
                </div>
              )}

              {/* ── Sync bar ── */}
              <div className="flex items-center gap-2 rounded-xl bg-default-50 dark:bg-default-100 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-default-500">
                    <Clock size={11} />
                    <span className="truncate">Sync terakhir: {fmtDate(unit.last_synced_at)}</span>
                  </div>
                  {unit.sync_status === 'error' && (
                    <p className="text-[10px] text-red-500 mt-0.5 truncate">{unit.sync_error}</p>
                  )}
                </div>
                {canSync && (
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    isLoading={isSyncing}
                    startContent={!isSyncing && <RefreshCw size={12} />}
                    onPress={() => onSync(unit._id)}
                    className="shrink-0"
                  >
                    {isSyncing ? 'Sinkron…' : 'Sync'}
                  </Button>
                )}
              </div>

              {/* ── Komponen Breakdown ── */}
              <KomponenTable ai={unit.nilai_lke_ai} />

              {/* ── Meta ── */}
              <div className="space-y-1.5 text-xs text-default-500">
                {/* PIC — editable only for developer */}
                <div className="flex items-center gap-1.5">
                  <User size={11} className="shrink-0 text-default-400" />
                  {isDev ? (
                    <InlineEdit
                      value={unit.pic_unit || ''}
                      onSave={(v) => handleSave('pic_unit', v)}
                      label="PIC Unit"
                      saving={savingField === 'pic_unit'}
                    />
                  ) : (
                    <span className="truncate">{unit.pic_unit || '—'}</span>
                  )}
                </div>
                {unit.link && (
                  <a
                    href={unit.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={11} className="shrink-0" />
                    <span>Buka Google Sheet</span>
                  </a>
                )}
              </div>

              {/* ── Catatan ── */}
              {canAssignUnitZi && (
                <div className="space-y-4 rounded-2xl border border-default-200 bg-default-50/80 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-default-400">
                        Assign Unit ZI
                      </p>
                      <p className="mt-1 text-xs leading-5 text-default-500">
                        Tentukan akun Unit ZI yang akan menangani LKE ini.
                      </p>
                    </div>
                    <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      {unit.assigned_unit_zi_id ? 'Assigned' : 'Open'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-default-200 bg-background px-3 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <UserCheck size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-default-400">
                          Penanggung Jawab Saat Ini
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-foreground">
                          {currentAssignedLabel}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-default-500">
                          {unit.assigned_unit_zi_id
                            ? 'LKE ini sudah terhubung ke akun Unit ZI dan bisa dipindahkan kapan saja.'
                            : 'Belum ada akun Unit ZI yang ditugaskan untuk menangani LKE ini.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Select
                      size="sm"
                      variant="bordered"
                      label="Akun Unit ZI"
                      labelPlacement="outside"
                      placeholder={loadingUnitZiUsers ? 'Memuat akun Unit ZI...' : 'Pilih akun Unit ZI'}
                      items={assignmentOptions}
                      selectedKeys={assignedUserId ? [assignedUserId] : []}
                      isDisabled={loadingUnitZiUsers || assigning}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string | undefined
                        setAssignedUserId(value === '__unassigned' ? '' : (value ?? ''))
                      }}
                      classNames={{
                        trigger: 'min-h-12 rounded-xl border-default-200 bg-background shadow-none',
                        value: 'text-sm',
                        popoverContent: 'rounded-xl',
                      }}
                    >
                      {(account) => (
                        <SelectItem
                          key={account._id}
                          textValue={`${account.name} ${account.unitKerja ?? ''}`}
                        >
                          {account.name}
                        </SelectItem>
                      )}
                    </Select>

                    <div className="rounded-xl bg-default-100/80 px-3 py-2.5 text-xs text-default-500">
                      <div className="flex items-start gap-2">
                        <Building2 size={14} className="mt-0.5 shrink-0 text-default-400" />
                        <div className="min-w-0">
                          <p className="font-medium text-default-700">
                            {selectedUnitZi?.name || 'Belum ada akun yang dipilih'}
                          </p>
                          <p className="mt-0.5 leading-5">
                            {selectedUnitZi?.unitKerja || 'Pilih akun untuk melihat unit kerja yang akan terhubung.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      color="primary"
                      fullWidth
                      isDisabled={loadingUnitZiUsers || assigning || !hasAssignmentChanged}
                      isLoading={assigning}
                      endContent={!assigning ? <ChevronRight size={16} /> : undefined}
                      onPress={handleAssignUnitZi}
                    >
                      {assignedUserId ? 'Simpan Penugasan Unit ZI' : 'Simpan Status Belum Di-assign'}
                    </Button>
                  </div>
                </div>
              )}

              {unit.catatan && (
                <div className="rounded-xl bg-default-100 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-default-400 uppercase tracking-wide mb-1">Catatan</p>
                  <p className="text-sm text-default-600">{unit.catatan}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
