import type { NilaiLKE } from '@/types/zi'
import { ZiProgressBar } from './ZiProgressBar'

interface Props {
  nilai:   NilaiLKE
  target:  'WBK' | 'WBBM'
  compact?: boolean
}

function fmt(v: number | null) {
  if (v === null || v === undefined) return '—'
  return v.toFixed(2)
}

function fmtPct(v: number | null) {
  if (v === null || v === undefined) return '—'
  return `${v.toFixed(1)}%`
}

function Row({ label, nilai, persen, indent = false, bold = false }: {
  label:  string
  nilai:  number | null
  persen: number | null
  indent?: boolean
  bold?:   boolean
}) {
  return (
    <tr className={bold ? 'font-semibold bg-default-50' : ''}>
      <td className={`py-1.5 pr-3 text-sm ${indent ? 'pl-6 text-default-600' : 'pl-3 text-default-800 dark:text-default-200'}`}>
        {label}
      </td>
      <td className="py-1.5 px-3 text-right text-sm tabular-nums w-20">
        {fmt(nilai)}
      </td>
      <td className="py-1.5 pl-3 text-right text-sm tabular-nums w-20 text-default-500">
        {fmtPct(persen)}
      </td>
    </tr>
  )
}

export function NilaiLKETable({ nilai, target, compact = false }: Props) {
  const { pengungkit, hasil, nilai_akhir } = nilai
  const threshold = target === 'WBK' ? 60 : 75

  return (
    <div className="space-y-4">
      {/* Pengungkit */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-default-500 mb-1 px-1">
          Komponen Pengungkit
        </p>
        <table className="w-full border-separate border-spacing-0 rounded-lg overflow-hidden border border-default-200">
          <thead>
            <tr className="bg-default-100 text-xs text-default-500">
              <th className="text-left py-1.5 pl-3 pr-3 font-medium">Komponen</th>
              <th className="text-right py-1.5 px-3 font-medium w-20">Nilai</th>
              <th className="text-right py-1.5 pl-3 font-medium w-20">Bobot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default-100">
            <Row label="Manajemen Perubahan"    nilai={pengungkit.manajemen_perubahan.nilai}     persen={pengungkit.manajemen_perubahan.persen}     indent />
            <Row label="Penataan Tatalaksana"   nilai={pengungkit.penataan_tatalaksana.nilai}    persen={pengungkit.penataan_tatalaksana.persen}    indent />
            <Row label="Penataan SDM"           nilai={pengungkit.penataan_sdm.nilai}            persen={pengungkit.penataan_sdm.persen}            indent />
            <Row label="Penguatan Akuntabilitas" nilai={pengungkit.penguatan_akuntabilitas.nilai} persen={pengungkit.penguatan_akuntabilitas.persen} indent />
            <Row label="Penguatan Pengawasan"   nilai={pengungkit.penguatan_pengawasan.nilai}    persen={pengungkit.penguatan_pengawasan.persen}    indent />
            <Row label="Peningkatan Pelayanan"  nilai={pengungkit.peningkatan_pelayanan.nilai}   persen={pengungkit.peningkatan_pelayanan.persen}   indent />
            <Row label="Total Pengungkit"       nilai={pengungkit.total.nilai}                   persen={pengungkit.total.persen}                   bold />
          </tbody>
        </table>
      </div>

      {/* Hasil */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-default-500 mb-1 px-1">
          Komponen Hasil
        </p>
        <table className="w-full border-separate border-spacing-0 rounded-lg overflow-hidden border border-default-200">
          <thead>
            <tr className="bg-default-100 text-xs text-default-500">
              <th className="text-left py-1.5 pl-3 pr-3 font-medium">Komponen</th>
              <th className="text-right py-1.5 px-3 font-medium w-20">Nilai</th>
              <th className="text-right py-1.5 pl-3 font-medium w-20">Bobot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default-100">
            <Row label="IPAK"            nilai={hasil.birokrasi_bersih.ipak.nilai}            persen={hasil.birokrasi_bersih.ipak.persen}            indent />
            <Row label="Capaian Kinerja" nilai={hasil.birokrasi_bersih.capaian_kinerja.nilai} persen={hasil.birokrasi_bersih.capaian_kinerja.persen} indent />
            <Row label="Birokrasi Bersih" nilai={hasil.birokrasi_bersih.total.nilai}          persen={hasil.birokrasi_bersih.total.persen}           bold />
            <Row label="IPKP"            nilai={hasil.pelayanan_prima.ipkp.nilai}             persen={hasil.pelayanan_prima.ipkp.persen}             indent />
            <Row label="Pelayanan Prima" nilai={hasil.pelayanan_prima.total.nilai}            persen={hasil.pelayanan_prima.total.persen}            bold />
            <Row label="Total Hasil"     nilai={hasil.total.nilai}                            persen={hasil.total.persen}                            bold />
          </tbody>
        </table>
      </div>

      {/* Nilai Akhir */}
      <div className="rounded-lg border border-default-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Nilai Akhir LKE</span>
          <span className={`text-xl font-bold tabular-nums ${
            nilai_akhir === null ? 'text-default-400' :
            nilai_akhir >= threshold ? 'text-green-600 dark:text-green-400' : 'text-red-500'
          }`}>
            {fmt(nilai_akhir)}
          </span>
        </div>
        {nilai_akhir !== null && (
          <ZiProgressBar
            value={nilai_akhir}
            label={`Threshold ${target}: ${threshold}`}
          />
        )}
      </div>
    </div>
  )
}
