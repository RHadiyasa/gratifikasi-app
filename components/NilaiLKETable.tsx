import type { NilaiLKE } from '@/types/zi'

interface Props {
  nilai:    NilaiLKE
  target:   'WBK' | 'WBBM'
  compact?: boolean
}

// Max nilai per komponen (Pemenuhan + Reform)
const MAX = {
  mp:               8.00,
  tt:               7.00,
  sdm:             10.00,
  ak:              10.00,
  pw:              15.00,
  pp:              10.00,
  total_pengungkit: 60.00,
  ipak:            17.50,
  capaian_kinerja:  5.00,
  birokrasi_bersih: 22.50,
  ipkp:            17.50,
  pelayanan_prima:  17.50,
  total_hasil:     40.00,
  nilai_akhir:    100.00,
}

function fmt(v: number | null | undefined) {
  if (v == null) return '—'
  return v.toFixed(2)
}

function pct(v: number | null | undefined, max: number) {
  if (v == null) return 0
  return Math.min(100, Math.max(0, (v / max) * 100))
}

// Warna berdasarkan persentase pencapaian terhadap max
function colorByPct(p: number): { bar: string; text: string; bg: string; dot: string } {
  if (p >= 70) return { bar: 'bg-green-500',  text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5',  dot: 'bg-green-500' }
  if (p >= 40) return { bar: 'bg-amber-400',  text: 'text-amber-500',                    bg: 'bg-amber-500/5',  dot: 'bg-amber-400' }
  return        { bar: 'bg-red-500',    text: 'text-red-500',                      bg: 'bg-red-500/5',    dot: 'bg-red-500'   }
}

function nilaiColor(v: number | null | undefined, max: number) {
  if (v == null) return { text: 'text-default-300', bg: 'bg-default-50', dot: 'bg-default-200', bar: 'bg-default-200' }
  return colorByPct(pct(v, max))
}

function nilaiColorByThreshold(v: number | null | undefined, threshold: number) {
  if (v == null) return { text: 'text-default-300', bg: 'bg-default-50', dot: 'bg-default-200', bar: 'bg-default-200' }
  return v >= threshold
    ? { bar: 'bg-green-500', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5',  dot: 'bg-green-500' }
    : { bar: 'bg-red-500',   text: 'text-red-500',                       bg: 'bg-red-500/5',    dot: 'bg-red-500'   }
}

// Mini horizontal bar dengan max yang tepat
function MiniBar({ value, max, barColor }: { value: number | null; max: number; barColor: string }) {
  if (value == null) return <div className="h-1 w-full rounded-full bg-default-100 mt-1.5" />
  return (
    <div className="h-1 w-full rounded-full bg-default-100 overflow-hidden mt-1.5">
      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct(value, max)}%` }} />
    </div>
  )
}

// Card komponen individual
function KomponenCard({ label, nilai, max }: { label: string; nilai: number | null; max: number }) {
  const c = nilaiColor(nilai, max)
  return (
    <div className={`rounded-xl p-3 border border-default-100 ${c.bg} space-y-1`}>
      <p className="text-[11px] text-default-500 leading-tight">{label}</p>
      <div className="flex items-end justify-between gap-1">
        <p className={`text-xl font-bold tabular-nums leading-none ${c.text}`}>{fmt(nilai)}</p>
        <p className="text-[10px] text-default-400 tabular-nums pb-0.5">/ {max.toFixed(2)}</p>
      </div>
      <MiniBar value={nilai} max={max} barColor={c.bar} />
    </div>
  )
}

// Baris total/subtotal
function TotalRow({ label, nilai, max, threshold }: { label: string; nilai: number | null; max: number; threshold?: number }) {
  const c = threshold != null ? nilaiColorByThreshold(nilai, threshold) : nilaiColor(nilai, max)
  return (
    <div className={`rounded-xl px-4 py-3 border border-default-200 ${c.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
          <span className="text-sm font-semibold text-default-700">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-bold tabular-nums ${c.text}`}>{fmt(nilai)}</span>
          <span className="text-xs text-default-400">/ {max.toFixed(2)}</span>
        </div>
      </div>
      <MiniBar value={nilai} max={max} barColor={c.bar} />
      {threshold != null && (
        <p className="text-[10px] text-default-400 mt-1">
          Threshold {threshold} — {nilai != null ? `${pct(nilai, max).toFixed(0)}% tercapai` : '—'}
        </p>
      )}
    </div>
  )
}

export function NilaiLKETable({ nilai, target }: Props) {
  const { pengungkit, hasil, nilai_akhir } = nilai
  const threshold = target === 'WBK' ? 75 : 85
  const c = nilaiColorByThreshold(nilai_akhir, threshold)

  return (
    <div className="space-y-5">

      {/* ── Nilai Akhir ── */}
      <div className={`rounded-xl p-4 border-2 ${nilai_akhir != null && nilai_akhir >= threshold ? 'border-green-300 dark:border-green-800' : nilai_akhir != null ? 'border-red-300 dark:border-red-800' : 'border-default-200'} ${c.bg}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-default-500">Nilai Akhir LKE</p>
            <p className={`text-5xl font-bold tabular-nums mt-1 leading-none ${c.text}`}>{fmt(nilai_akhir)}</p>
            <p className="text-xs text-default-400 mt-2">dari {MAX.nilai_akhir.toFixed(0)} poin</p>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${nilai_akhir != null && nilai_akhir >= threshold ? 'bg-green-500/10 text-green-600 dark:text-green-400' : nilai_akhir != null ? 'bg-red-500/10 text-red-500' : 'bg-default-100 text-default-400'}`}>
              {nilai_akhir != null && nilai_akhir >= threshold ? `✅ ${target} Tercapai` : nilai_akhir != null ? `❌ Belum Tercapai` : '—'}
            </span>
            <p className="text-xs text-default-400 mt-2">Min. <strong>{threshold}</strong></p>
          </div>
        </div>
        {nilai_akhir != null && (
          <div className="mt-4 space-y-1">
            <div className="h-2.5 w-full rounded-full bg-default-100 overflow-hidden relative">
              <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width: `${pct(nilai_akhir, MAX.nilai_akhir)}%` }} />
              <div className="absolute top-0 h-full w-0.5 bg-default-400/60" style={{ left: `${threshold}%` }} title={`Threshold ${threshold}`} />
            </div>
            <div className="flex justify-between text-[10px] text-default-400">
              <span>0</span>
              <span className="font-medium">{pct(nilai_akhir, MAX.nilai_akhir).toFixed(0)}% dari nilai maksimal</span>
              <span>{MAX.nilai_akhir}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Pengungkit ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs font-bold uppercase tracking-widest text-default-500">Komponen Pengungkit</p>
          <p className="text-xs text-default-400">Maks. {MAX.total_pengungkit}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <KomponenCard label="Manajemen Perubahan"      nilai={pengungkit.manajemen_perubahan.nilai}     max={MAX.mp}  />
          <KomponenCard label="Penataan Tatalaksana"     nilai={pengungkit.penataan_tatalaksana.nilai}    max={MAX.tt}  />
          <KomponenCard label="Penataan SDM"             nilai={pengungkit.penataan_sdm.nilai}            max={MAX.sdm} />
          <KomponenCard label="Penguatan Akuntabilitas"  nilai={pengungkit.penguatan_akuntabilitas.nilai} max={MAX.ak}  />
          <KomponenCard label="Penguatan Pengawasan"     nilai={pengungkit.penguatan_pengawasan.nilai}    max={MAX.pw}  />
          <KomponenCard label="Peningkatan Pelayanan"    nilai={pengungkit.peningkatan_pelayanan.nilai}   max={MAX.pp}  />
        </div>
        <TotalRow label="Total Pengungkit" nilai={pengungkit.total.nilai} max={MAX.total_pengungkit} />
      </div>

      {/* ── Hasil ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs font-bold uppercase tracking-widest text-default-500">Komponen Hasil</p>
          <p className="text-xs text-default-400">Maks. {MAX.total_hasil}</p>
        </div>

        {/* Birokrasi Bersih */}
        <div className="rounded-xl border border-default-200 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-default-400 px-3 py-2 bg-default-50 border-b border-default-100">
            Birokrasi Bersih <span className="font-normal normal-case">— maks. {MAX.birokrasi_bersih}</span>
          </p>
          <div className="grid grid-cols-2 gap-2 p-2">
            <KomponenCard label="IPAK"             nilai={hasil.birokrasi_bersih.ipak.nilai}            max={MAX.ipak}            />
            <KomponenCard label="Capaian Kinerja"  nilai={hasil.birokrasi_bersih.capaian_kinerja.nilai} max={MAX.capaian_kinerja} />
          </div>
          <div className="px-2 pb-2">
            <TotalRow label="Total Birokrasi Bersih" nilai={hasil.birokrasi_bersih.total.nilai} max={MAX.birokrasi_bersih} />
          </div>
        </div>

        {/* Pelayanan Prima */}
        <div className="rounded-xl border border-default-200 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-default-400 px-3 py-2 bg-default-50 border-b border-default-100">
            Pelayanan Prima <span className="font-normal normal-case">— maks. {MAX.pelayanan_prima}</span>
          </p>
          <div className="p-2">
            <KomponenCard label="IPKP" nilai={hasil.pelayanan_prima.ipkp.nilai} max={MAX.ipkp} />
          </div>
          <div className="px-2 pb-2">
            <TotalRow label="Total Pelayanan Prima" nilai={hasil.pelayanan_prima.total.nilai} max={MAX.pelayanan_prima} />
          </div>
        </div>

        <TotalRow label="Total Hasil" nilai={hasil.total.nilai} max={MAX.total_hasil} />
      </div>

    </div>
  )
}
