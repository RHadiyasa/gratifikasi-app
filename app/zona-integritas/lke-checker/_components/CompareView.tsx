'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Button } from '@heroui/button'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LkeSubmission, NilaiKomponen } from '@/types/zi'
import { TargetBadge } from '@/components/TargetBadge'
import { ZiProgressBar } from '@/components/ZiProgressBar'
import { TARGET_THRESHOLD } from '@/types/zi'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts'

interface Props {
  ids:     string[]
  onClose: () => void
}

const KOMPONEN_LABELS: Record<string, string> = {
  manajemen_perubahan:     'Manajemen\nPerubahan',
  penataan_tatalaksana:    'Tatalaksana',
  penataan_sdm:            'SDM',
  penguatan_akuntabilitas: 'Akuntabilitas',
  penguatan_pengawasan:    'Pengawasan',
  peningkatan_pelayanan:   'Pelayanan',
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e']

function getVal(k: NilaiKomponen | undefined) {
  return k?.nilai ?? 0
}

/** Returns nilai_lke if available, otherwise falls back to nilai_lke_ai */
function effectiveNilai(u: LkeSubmission) {
  return u.nilai_lke ?? u.nilai_lke_ai ?? null
}

export default function CompareView({ ids, onClose }: Props) {
  const [units, setUnits]     = useState<LkeSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/zi/compare?ids=${ids.join(',')}`)
      .then(({ data }) => setUnits(data.submissions))
      .finally(() => setLoading(false))
  }, [ids.join(',')])

  // Build radar data — ZI penilaian + AI penilaian (suffix " (AI)")
  const radarData = Object.entries(KOMPONEN_LABELS).map(([key, label]) => {
    const entry: Record<string, any> = { subject: label.replace('\n', ' ') }
    units.forEach((u) => {
      const eff = effectiveNilai(u)
      entry[u.eselon2] = getVal(eff?.pengungkit?.[key as keyof typeof eff.pengungkit] as NilaiKomponen | undefined)
      if (u.nilai_lke_ai && u.nilai_lke) {
        // Show AI as separate radar only when official nilai also exists
        entry[`${u.eselon2} (AI)`] = getVal(u.nilai_lke_ai.pengungkit?.[key as keyof typeof u.nilai_lke_ai.pengungkit] as NilaiKomponen | undefined)
      }
    })
    return entry
  })

  // Auto insights
  const insights: string[] = []
  const unitsWithNilai = units.filter((u) => effectiveNilai(u)?.nilai_akhir != null)
  if (unitsWithNilai.length >= 2) {
    const vals = unitsWithNilai.map((u) => effectiveNilai(u)!.nilai_akhir!)
    const maxIdx = vals.indexOf(Math.max(...vals))
    const minIdx = vals.indexOf(Math.min(...vals))
    if (maxIdx !== minIdx) {
      insights.push(`${unitsWithNilai[maxIdx].eselon2} memiliki nilai tertinggi (${vals[maxIdx].toFixed(2)}).`)
      insights.push(`${unitsWithNilai[minIdx].eselon2} perlu peningkatan paling besar (${vals[minIdx].toFixed(2)}).`)
    }

    // Find biggest gap in komponen
    let maxGap = 0, maxGapKey = ''
    Object.keys(KOMPONEN_LABELS).forEach((key) => {
      const kompVals = unitsWithNilai.map((u) => {
        const eff = effectiveNilai(u)
        return getVal(eff?.pengungkit?.[key as keyof typeof eff.pengungkit] as NilaiKomponen | undefined)
      })
      const gap = Math.max(...kompVals) - Math.min(...kompVals)
      if (gap > maxGap) { maxGap = gap; maxGapKey = key }
    })
    if (maxGapKey) {
      insights.push(`Perbedaan terbesar di komponen ${KOMPONEN_LABELS[maxGapKey]?.replace('\n', ' ')} (selisih ${maxGap.toFixed(2)}).`)
    }
  }

  function cellCls(val: number | null, others: (number | null)[]) {
    if (val === null) return ''
    const nums = others.filter((v) => v !== null) as number[]
    if (nums.length < 2) return ''
    const max = Math.max(...nums)
    const min = Math.min(...nums)
    if (val === max && max !== min) return 'text-green-600 dark:text-green-400 font-semibold'
    if (val === min && max !== min) return 'text-red-500'
    return ''
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-5xl bg-background rounded-2xl shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default-200">
          <h2 className="font-bold text-lg">Perbandingan LKE ({units.length} unit)</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-default-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-default-400 text-sm animate-pulse">Memuat data…</div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Radar */}
            {units.some((u) => u.nilai_lke?.nilai_akhir != null || u.nilai_lke_ai?.nilai_akhir != null) && (
              <div>
                <p className="text-sm font-semibold mb-3">Radar Komponen Pengungkit</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
                      {units.map((u, i) => (
                        <Radar
                          key={u._id}
                          name={u.eselon2}
                          dataKey={u.eselon2}
                          stroke={COLORS[i]}
                          fill={COLORS[i]}
                          fillOpacity={0.15}
                        />
                      ))}
                      {units.filter(u => u.nilai_lke_ai?.nilai_akhir != null).map((u, i) => (
                        <Radar
                          key={`${u._id}-ai`}
                          name={`${u.eselon2} (AI)`}
                          dataKey={`${u.eselon2} (AI)`}
                          stroke={COLORS[i]}
                          fill="none"
                          strokeDasharray="4 2"
                          strokeOpacity={0.6}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Nilai Akhir row */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${units.length}, 1fr)` }}>
              {units.map((u, i) => {
                const threshold = TARGET_THRESHOLD[u.target]
                const eff = effectiveNilai(u)
                const val = eff?.nilai_akhir ?? null
                const achieved = val !== null && val >= threshold
                const isAiOnly = !u.nilai_lke && !!u.nilai_lke_ai
                return (
                  <div key={u._id} className="rounded-xl border border-default-200 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-xs font-medium truncate flex-1">{u.eselon2}</span>
                      <TargetBadge target={u.target} tercapai={achieved} showStatus />
                    </div>
                    <div className={`text-2xl font-bold tabular-nums ${val === null ? '' : achieved ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {val !== null ? val.toFixed(2) : '—'}
                      {isAiOnly && <span className="text-xs font-normal text-violet-500 ml-1">(AI)</span>}
                    </div>
                    {val !== null && (
                      <ZiProgressBar value={val} size="sm" label={`min ${threshold}`} />
                    )}
                    {u.nilai_lke_ai?.nilai_akhir != null && u.nilai_lke && (
                      <div className="flex items-center justify-between text-xs text-default-400 pt-1 border-t border-default-100">
                        <span>AI:</span>
                        <span className="font-mono font-medium text-violet-500">{u.nilai_lke_ai.nilai_akhir.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Komponen Table */}
            <div>
              <p className="text-sm font-semibold mb-3">Perbandingan per Komponen</p>
              <div className="overflow-x-auto rounded-xl border border-default-200">
                <table className="w-full text-xs">
                  <thead className="bg-default-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-default-500">Komponen</th>
                      {units.map((u, i) => (
                        <th key={u._id} className="text-right py-2 px-3 font-medium" style={{ color: COLORS[i] }}>
                          {u.eselon2}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default-100">
                    {Object.entries(KOMPONEN_LABELS).map(([key, label]) => {
                      const vals = units.map((u) => {
                        const eff = effectiveNilai(u)
                        return (eff?.pengungkit?.[key as keyof typeof eff.pengungkit] as NilaiKomponen | undefined)?.nilai ?? null
                      })
                      return (
                        <tr key={key} className="hover:bg-default-50">
                          <td className="py-2 px-3 text-default-600">{label.replace('\n', ' ')}</td>
                          {vals.map((v, i) => (
                            <td key={i} className={`py-2 px-3 text-right tabular-nums ${cellCls(v, vals)}`}>
                              {v !== null ? v.toFixed(2) : '—'}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                    {/* Total pengungkit */}
                    <tr className="bg-default-50 font-semibold">
                      <td className="py-2 px-3">Total Pengungkit</td>
                      {units.map((u) => {
                        const eff = effectiveNilai(u)
                        const v = eff?.pengungkit?.total?.nilai ?? null
                        return (
                          <td key={u._id} className="py-2 px-3 text-right tabular-nums">
                            {v !== null ? v.toFixed(2) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-default-600">Total Hasil</td>
                      {units.map((u) => {
                        const eff = effectiveNilai(u)
                        const v = eff?.hasil?.total?.nilai ?? null
                        return (
                          <td key={u._id} className="py-2 px-3 text-right tabular-nums">
                            {v !== null ? v.toFixed(2) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                    <tr className="bg-default-50 font-bold">
                      <td className="py-2 px-3">Nilai Akhir</td>
                      {units.map((u) => {
                        const v = effectiveNilai(u)?.nilai_akhir ?? null
                        const all = units.map((x) => effectiveNilai(x)?.nilai_akhir ?? null)
                        return (
                          <td key={u._id} className={`py-2 px-3 text-right tabular-nums ${cellCls(v, all)}`}>
                            {v !== null ? v.toFixed(2) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auto insights */}
            {insights.length > 0 && (
              <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-4 space-y-1.5">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Insight Otomatis</p>
                {insights.map((ins, i) => (
                  <p key={i} className="text-sm text-default-700 dark:text-default-300 flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span> {ins}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
