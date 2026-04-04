'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@heroui/button'
import { X, ExternalLink, RefreshCw, Clock, User, Bot, Award, TrendingUp } from 'lucide-react'
import type { LkeSubmission, NilaiLKE } from '@/types/zi'
import { StatusBadge } from '@/components/StatusBadge'
import { TargetBadge } from '@/components/TargetBadge'
import { ZiProgressBar } from '@/components/ZiProgressBar'
import { TARGET_THRESHOLD } from '@/types/zi'

interface Props {
  unit:       LkeSubmission | null
  onClose:    () => void
  onSync:     (id: string) => void
  syncingIds: string[]
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

function KomponenTable({ lke, ai }: { lke: LkeSubmission['nilai_lke']; ai: LkeSubmission['nilai_lke_ai'] }) {
  const hasLke = lke?.nilai_akhir != null
  const hasAi  = ai?.nilai_akhir != null
  if (!hasLke && !hasAi) return null

  type PengungkitKey = typeof KOMPONEN_KEYS[number]['key']
  const getL = (k: PengungkitKey) => lke?.pengungkit?.[k]?.nilai ?? null
  const getA = (k: PengungkitKey) => ai?.pengungkit?.[k]?.nilai ?? null

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-default-400">Komponen Pengungkit</p>
      <div className="rounded-xl border border-default-200 overflow-hidden text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-default-50 text-default-400">
              <th className="text-left py-2 px-3 font-medium">Komponen</th>
              {hasLke && <th className="text-right py-2 px-3 font-medium w-16">ZI</th>}
              {hasAi  && <th className="text-right py-2 px-3 font-medium w-16 text-violet-500">AI</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-default-100">
            {KOMPONEN_KEYS.map(({ key, label }) => (
              <tr key={key} className="hover:bg-default-50">
                <td className="py-1.5 px-3 text-default-600">{label}</td>
                {hasLke && <td className="py-1.5 px-3 text-right tabular-nums font-mono">{fmt(getL(key))}</td>}
                {hasAi  && <td className="py-1.5 px-3 text-right tabular-nums font-mono text-violet-600 dark:text-violet-400">{fmt(getA(key))}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-default-50 font-semibold border-t border-default-200">
              <td className="py-2 px-3">Total Pengungkit</td>
              {hasLke && <td className="py-2 px-3 text-right tabular-nums font-mono">{fmt(lke?.pengungkit?.total?.nilai)}</td>}
              {hasAi  && <td className="py-2 px-3 text-right tabular-nums font-mono text-violet-600 dark:text-violet-400">{fmt(ai?.pengungkit?.total?.nilai)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-default-400 pt-1">Komponen Hasil</p>
      <div className="rounded-xl border border-default-200 overflow-hidden text-xs">
        <table className="w-full">
          <tbody className="divide-y divide-default-100">
            {[
              { label: 'IPAK',            lv: lke?.hasil?.birokrasi_bersih?.ipak?.nilai,            av: ai?.hasil?.birokrasi_bersih?.ipak?.nilai },
              { label: 'Capaian Kinerja', lv: lke?.hasil?.birokrasi_bersih?.capaian_kinerja?.nilai, av: ai?.hasil?.birokrasi_bersih?.capaian_kinerja?.nilai },
              { label: 'IPKP',            lv: lke?.hasil?.pelayanan_prima?.ipkp?.nilai,             av: ai?.hasil?.pelayanan_prima?.ipkp?.nilai },
            ].map(({ label, lv, av }) => (
              <tr key={label} className="hover:bg-default-50">
                <td className="py-1.5 px-3 text-default-600">{label}</td>
                {hasLke && <td className="py-1.5 px-3 text-right tabular-nums font-mono">{fmt(lv)}</td>}
                {hasAi  && <td className="py-1.5 px-3 text-right tabular-nums font-mono text-violet-600 dark:text-violet-400">{fmt(av)}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-default-50 font-semibold border-t border-default-200">
              <td className="py-2 px-3">Total Hasil</td>
              {hasLke && <td className="py-2 px-3 text-right tabular-nums font-mono">{fmt(lke?.hasil?.total?.nilai)}</td>}
              {hasAi  && <td className="py-2 px-3 text-right tabular-nums font-mono text-violet-600 dark:text-violet-400">{fmt(ai?.hasil?.total?.nilai)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function UnitDrawer({ unit, onClose, onSync, syncingIds }: Props) {
  if (!unit) return null

  const isSyncing = syncingIds.includes(unit._id)
  const threshold = TARGET_THRESHOLD[unit.target]
  const hasLke    = unit.nilai_lke?.nilai_akhir != null
  const hasAi     = unit.nilai_lke_ai?.nilai_akhir != null

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
            <div className="min-w-0">
              <h2 className="font-bold text-base leading-tight">{unit.eselon2}</h2>
              <p className="text-xs text-default-400 mt-0.5 truncate">{unit.eselon1}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <TargetBadge target={unit.target} tercapai={hasLke ? (unit.nilai_lke!.nilai_akhir! >= threshold) : undefined} showStatus={hasLke} />
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

              {/* ── Score Cards ── */}
              <div className={`grid gap-3 ${hasLke && hasAi ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {hasLke && (
                  <ScoreCard
                    label="Penilaian ZI"
                    icon={<Award size={11} />}
                    nilai={unit.nilai_lke!.nilai_akhir!}
                    threshold={threshold}
                    accentClass="border-default-200"
                    subLabel="Penilaian resmi tim ZI"
                  />
                )}
                {hasAi && (
                  <ScoreCard
                    label="Penilaian AI"
                    icon={<Bot size={11} />}
                    nilai={unit.nilai_lke_ai!.nilai_akhir!}
                    threshold={threshold}
                    accentClass="border-violet-200 dark:border-violet-800 bg-violet-500/5"
                    subLabel="Referensi — bukan nilai resmi"
                  />
                )}
                {!hasLke && !hasAi && (
                  <div className="text-sm text-default-400 text-center py-6 border border-dashed border-default-200 rounded-xl">
                    Belum ada nilai. Jalankan AI Checker lalu klik Sync.
                  </div>
                )}
              </div>

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
              </div>

              {/* ── Komponen Breakdown ── */}
              <KomponenTable lke={unit.nilai_lke} ai={unit.nilai_lke_ai} />

              {/* ── Meta ── */}
              <div className="grid grid-cols-2 gap-2 text-xs text-default-500">
                {unit.pic_unit && (
                  <div className="flex items-center gap-1.5">
                    <User size={11} className="shrink-0" />
                    <span className="truncate">{unit.pic_unit}</span>
                  </div>
                )}
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
              </div>

              {/* ── Catatan ── */}
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
