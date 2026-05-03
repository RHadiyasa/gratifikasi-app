import { Award, CheckCircle2, BarChart3, Search, FileSpreadsheet, ArrowRight } from 'lucide-react'
import { Button } from '@heroui/button'
import NextLink from 'next/link'
import { VisaCredit } from '@/components/visa-brand'

const STEPS = [
  {
    icon: FileSpreadsheet,
    title: 'Input LKE',
    desc: 'Tambahkan link Google Sheet LKE unit kerja dan tentukan target (WBK/WBBM).',
  },
  {
    icon: Search,
    title: 'Pemeriksaan AI',
    desc: 'Sistem membaca dokumen bukti dan mengevaluasi kelengkapan data dukung secara otomatis.',
  },
  {
    icon: BarChart3,
    title: 'Nilai & Monitoring',
    desc: 'Hasil penilaian LKE ditampilkan beserta progress pengerjaan dan status pencapaian target.',
  },
  {
    icon: CheckCircle2,
    title: 'Laporan',
    desc: 'Unduh laporan Excel atau kirimkan ringkasan hasil evaluasi ke email PIC unit.',
  },
]

const COLUMNS = [
  { col: 'A',  label: 'ID',              note: 'Nomor urut data' },
  { col: 'M',  label: 'Bukti Data',      note: 'Nama file bukti dukung' },
  { col: 'N',  label: 'Link Drive',      note: 'URL folder Google Drive' },
  { col: 'S',  label: 'Reviu AI',        note: 'Output detail hasil evaluasi AI' },
  { col: 'T',  label: 'Result AI',       note: 'Verdict singkat (✅ / ⚠️ / ❌)' },
]

export default function ZonaIntegritasPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-14">

      {/* Hero */}
      <div className="text-center space-y-4">
        <VisaCredit size="md" className="mx-auto" />
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 mb-2">
          <Award size={32} className="text-violet-600 dark:text-violet-400" />
        </div>
        <h1 className="text-3xl font-bold">Zona Integritas</h1>
        <p className="text-default-500 max-w-xl mx-auto text-sm leading-relaxed">
          Platform evaluasi Lembar Kerja Evaluasi (LKE) berbantuan AI untuk membantu unit kerja
          mencapai predikat <strong>WBK</strong> dan <strong>WBBM</strong> Kementerian ESDM.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button as={NextLink} href="/zona-integritas/lke-checker" color="primary" endContent={<ArrowRight size={16} />}>
            Buka LKE Checker
          </Button>
          <Button as={NextLink} href="/zona-integritas/monitoring" variant="flat">
            Lihat Monitoring
          </Button>
        </div>
      </div>

      {/* Alur */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-center">Alur Kerja</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="rounded-xl border border-default-200 p-4 space-y-2 relative">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-default-400 w-5">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Icon size={16} className="text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-default-500 leading-relaxed">{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Struktur Kolom */}
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <FileSpreadsheet size={18} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-base font-semibold">Struktur Kolom LKE yang Diperlukan</h2>
            <p className="text-xs text-default-500 mt-0.5">
              Pastikan Google Sheet LKE memiliki kolom berikut sesuai posisinya.
              Kolom S dan T akan dibuat otomatis jika belum ada.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-default-200">
          <table className="w-full text-sm">
            <thead className="bg-default-100">
              <tr>
                <th className="text-left py-2 px-4 font-medium text-default-600 w-16">Kolom</th>
                <th className="text-left py-2 px-4 font-medium text-default-600">Nama Field</th>
                <th className="text-left py-2 px-4 font-medium text-default-600">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {COLUMNS.map((c) => (
                <tr key={c.col} className="hover:bg-default-50 transition-colors">
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
                      {c.col}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium">{c.label}</td>
                  <td className="py-2.5 px-4 text-default-500">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-default-400 px-1">
          * Data dimulai dari baris dengan ID numerik pertama di Kolom A (biasanya baris 6 atau 7, setelah header).
        </p>
      </div>

      {/* Threshold */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-500/5 p-5 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-500">Target WBK</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">≥ 75</p>
          <p className="text-xs text-default-500">Nilai minimum LKE untuk meraih predikat Wilayah Bebas dari Korupsi</p>
        </div>
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-500/5 p-5 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-500">Target WBBM</p>
          <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">≥ 85</p>
          <p className="text-xs text-default-500">Nilai minimum LKE untuk meraih predikat Wilayah Birokrasi Bersih dan Melayani</p>
        </div>
      </div>

    </div>
  )
}
