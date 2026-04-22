import { connect } from '@/config/dbconfig'
import LkeSubmission from '@/modules/models/LkeSubmission'
import type { LkeSubmission as ILke, ZiSummary } from '@/types/zi'
import { TARGET_THRESHOLD } from '@/types/zi'
import { StatusBadge } from '@/components/StatusBadge'
import { TargetBadge } from '@/components/TargetBadge'
import { ZiProgressBar } from '@/components/ZiProgressBar'
import { StatCard } from '@/components/StatCard'
import { BarChart3, Award, CheckCircle2, Clock, AlertCircle, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getData() {
  await connect()
  const docs = await LkeSubmission.find({}).sort({ created_at: -1 }).lean()
  return docs as unknown as ILke[]
}

function buildSummary(docs: ILke[]): ZiSummary {
  const selesai   = docs.filter((d) => d.status === 'Selesai').length
  const sedang    = docs.filter((d) => d.status === 'Sedang Dicek').length
  const belum     = docs.filter((d) => d.status === 'Belum Dicek').length

  const withNilai = docs.filter((d) => d.nilai_lke_ai?.nilai_akhir != null)
  const wbkTercapai  = withNilai.filter((d) => d.target === 'WBK'  && d.nilai_lke_ai!.nilai_akhir! >= TARGET_THRESHOLD.WBK).length
  const wbbmTercapai = withNilai.filter((d) => d.target === 'WBBM' && d.nilai_lke_ai!.nilai_akhir! >= TARGET_THRESHOLD.WBBM).length
  const rata = withNilai.length > 0
    ? withNilai.reduce((sum, d) => sum + d.nilai_lke_ai!.nilai_akhir!, 0) / withNilai.length
    : null

  return { total: docs.length, selesai, sedang, belum, wbk_tercapai: wbkTercapai, wbbm_tercapai: wbbmTercapai, rata_nilai_akhir: rata }
}

export default async function MonitoringPage() {
  const docs = await getData()
  const summary = buildSummary(docs)

  // group by eselon1
  const byEselon1 = docs.reduce<Record<string, ILke[]>>((acc, d) => {
    const key = d.eselon1 || 'Lainnya'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

      <div>
        <h1 className="text-2xl font-bold">Monitoring Zona Integritas</h1>
        <p className="text-sm text-default-500 mt-1">Rekap perkembangan evaluasi LKE seluruh unit kerja</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Unit"     value={summary.total}           icon={<Users size={18} />}       color="default" />
        <StatCard label="Selesai"        value={summary.selesai}         icon={<CheckCircle2 size={18} />} color="green" />
        <StatCard label="Sedang Dicek"   value={summary.sedang}          icon={<Clock size={18} />}       color="amber" />
        <StatCard label="Belum Dicek"    value={summary.belum}           icon={<AlertCircle size={18} />} color="red" />
        <StatCard label="WBK Tercapai"   value={summary.wbk_tercapai}    icon={<Award size={18} />}       color="blue" />
        <StatCard label="WBBM Tercapai"  value={summary.wbbm_tercapai}   icon={<Award size={18} />}       color="violet" />
      </div>

      {/* Rata nilai akhir */}
      {summary.rata_nilai_akhir !== null && (
        <div className="rounded-xl border border-default-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default-500 font-medium">Rata-rata Nilai Akhir LKE</p>
            <p className="text-3xl font-bold tabular-nums mt-0.5">{summary.rata_nilai_akhir.toFixed(2)}</p>
          </div>
          <BarChart3 size={32} className="text-default-300" />
        </div>
      )}

      {/* Table by eselon1 */}
      {Object.entries(byEselon1).map(([eselon1, units]) => (
        <div key={eselon1} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{eselon1}</h2>
            <span className="text-xs text-default-400 bg-default-100 px-2 py-0.5 rounded-full">{units.length} unit</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-default-200">
            <table className="w-full text-sm">
              <thead className="bg-default-50">
                <tr>
                  <th className="text-left py-2.5 px-4 font-medium text-default-500 text-xs">Unit Kerja</th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-28">Target</th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-32">Status</th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-40">Progress Cek</th>
                  <th className="text-right py-2.5 px-4 font-medium text-default-500 text-xs w-24">Nilai Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {units.map((sub) => {
                  const threshold = TARGET_THRESHOLD[sub.target]
                  const val       = sub.nilai_lke_ai?.nilai_akhir ?? null
                  const achieved  = val !== null && val >= threshold
                  return (
                    <tr key={sub._id} className="hover:bg-default-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium">{sub.eselon2}</div>
                        {sub.pic_unit && <div className="text-xs text-default-400">{sub.pic_unit}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <TargetBadge target={sub.target} tercapai={achieved} showStatus={val !== null} />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="py-3 px-3">
                        <ZiProgressBar
                          value={sub.progress_percent}
                          label={`${sub.checked_count}/${sub.total_data}`}
                          size="sm"
                        />
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {val !== null ? (
                          <span className={`font-bold ${achieved ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                            {val.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-default-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {docs.length === 0 && (
        <div className="text-center py-20 text-default-400 text-sm">
          Belum ada data unit. Tambahkan melalui LKE Checker.
        </div>
      )}
    </div>
  )
}
