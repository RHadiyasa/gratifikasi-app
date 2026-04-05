"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import NextLink from "next/link";
import { Button } from "@heroui/button";
import {
  Award, CheckCircle2, Clock, AlertCircle,
  TrendingUp, Users, BarChart3, ArrowRight,
  RefreshCw, GitCompare,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { useZiStore } from "@/store/ziStore";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { TargetBadge } from "@/components/TargetBadge";
import { ZiProgressBar } from "@/components/ZiProgressBar";
import { SyncButton } from "@/components/SyncButton";
import { TARGET_THRESHOLD } from "@/types/zi";

const KOMPONEN_KEYS = [
  { key: "manajemen_perubahan",     label: "Manajemen Perubahan" },
  { key: "penataan_tatalaksana",    label: "Tatalaksana" },
  { key: "penataan_sdm",            label: "SDM" },
  { key: "penguatan_akuntabilitas", label: "Akuntabilitas" },
  { key: "penguatan_pengawasan",    label: "Pengawasan" },
  { key: "peningkatan_pelayanan",   label: "Pelayanan" },
];

function nilaiColor(val, threshold) {
  if (val === null || val === undefined) return "#94a3b8";
  if (val >= threshold) return "#22c55e";
  if (val >= threshold * 0.8) return "#f59e0b";
  return "#f43f5e";
}

export default function DashboardZI() {
  const {
    submissions, summary, isLoading, syncingIds,
    fetchSubmissions, syncSubmission,
  } = useZiStore();

  const [drawerUnit, setDrawerUnit] = useState(null);

  useEffect(() => { fetchSubmissions(); }, []);

  // Bar chart data: nilai akhir per unit
  const barData = submissions
    .filter((s) => s.nilai_lke?.nilai_akhir != null)
    .sort((a, b) => (b.nilai_lke.nilai_akhir - a.nilai_lke.nilai_akhir))
    .slice(0, 15)
    .map((s) => ({
      name:     s.eselon2.length > 18 ? s.eselon2.slice(0, 17) + "…" : s.eselon2,
      nilai:    s.nilai_lke.nilai_akhir,
      target:   s.target,
      color:    nilaiColor(s.nilai_lke.nilai_akhir, TARGET_THRESHOLD[s.target]),
    }));

  // Anomali: units below threshold with status Selesai
  const anomali = submissions.filter((s) =>
    s.status === "Selesai" &&
    s.nilai_lke?.nilai_akhir != null &&
    s.nilai_lke.nilai_akhir < TARGET_THRESHOLD[s.target]
  );

  // Rata komponen (radar)
  const radarData = KOMPONEN_KEYS.map(({ key, label }) => {
    const vals = submissions
      .map((s) => s.nilai_lke?.pengungkit?.[key]?.nilai)
      .filter((v) => v != null);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { subject: label, nilai: parseFloat(avg.toFixed(2)) };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-1">
            Kementerian ESDM
          </p>
          <h1 className="text-2xl font-black text-foreground">Dashboard Zona Integritas</h1>
          <p className="text-sm text-default-500 mt-1">Ringkasan eksekutif perkembangan evaluasi LKE</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm" variant="flat"
            startContent={<RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />}
            onPress={fetchSubmissions}
            isDisabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            as={NextLink} href="/zona-integritas/lke-checker"
            size="sm" color="primary"
            endContent={<ArrowRight size={13} />}
          >
            LKE Checker
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Unit"    value={summary.total}          icon={<Users size={16} />}        color="default" />
          <StatCard label="Selesai"       value={summary.selesai}        icon={<CheckCircle2 size={16} />} color="green" />
          <StatCard label="Sedang Dicek"  value={summary.sedang}         icon={<Clock size={16} />}        color="amber" />
          <StatCard label="Belum Dicek"   value={summary.belum}          icon={<AlertCircle size={16} />}  color="red" />
          <StatCard label="WBK Tercapai"  value={summary.wbk_tercapai}   icon={<Award size={16} />}        color="blue" />
          <StatCard label="WBBM Tercapai" value={summary.wbbm_tercapai}  icon={<Award size={16} />}        color="violet" />
        </div>
      )}

      {summary?.rata_nilai_akhir != null && (
        <div className="rounded-xl border border-default-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default-500">Rata-rata Nilai Akhir LKE</p>
            <p className="text-3xl font-bold tabular-nums">{summary.rata_nilai_akhir.toFixed(2)}</p>
          </div>
          <BarChart3 size={28} className="text-default-300" />
        </div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Ranking Bar */}
        {barData.length > 0 && (
          <div className="rounded-xl border border-default-200 p-5 space-y-3">
            <p className="text-sm font-semibold">Ranking Nilai Akhir</p>
            <div style={{ height: Math.max(200, barData.length * 28) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={(v) => [v.toFixed(2), "Nilai"]} />
                  <Bar dataKey="nilai" radius={[0, 4, 4, 0]}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Radar Rata Komponen */}
        {radarData.some((d) => d.nilai > 0) && (
          <div className="rounded-xl border border-default-200 p-5 space-y-3">
            <p className="text-sm font-semibold">Rata-rata Komponen Pengungkit</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9 }} />
                  <Radar name="Rata-rata" dataKey="nilai" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Anomali Panel */}
      {anomali.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {anomali.length} unit belum mencapai threshold meski sudah selesai diperiksa
            </p>
          </div>
          <div className="space-y-2">
            {anomali.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between gap-3 bg-background rounded-lg px-3 py-2.5 cursor-pointer hover:bg-default-50 transition-colors"
                onClick={() => setDrawerUnit(s)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.eselon2}</p>
                  <p className="text-xs text-default-400 truncate">{s.eselon1}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TargetBadge target={s.target} tercapai={false} showStatus />
                  <span className="text-sm font-bold text-red-500 tabular-nums">
                    {s.nilai_lke.nilai_akhir.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All units table */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Semua Unit</p>
          <div className="overflow-x-auto rounded-xl border border-default-200">
            <table className="w-full text-sm">
              <thead className="bg-default-50">
                <tr>
                  <th className="text-left py-2.5 px-4 font-medium text-default-500 text-xs">Unit Kerja</th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-28">Target</th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-32">Status</th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-36">Progress</th>
                  <th className="text-right py-2.5 px-3 font-medium text-default-500 text-xs w-20">Nilai</th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {submissions.map((sub) => {
                  const threshold = TARGET_THRESHOLD[sub.target];
                  const val = sub.nilai_lke_ai?.nilai_akhir ?? null;
                  const achieved = val !== null && val >= threshold;
                  return (
                    <tr
                      key={sub._id}
                      className="hover:bg-default-50 transition-colors cursor-pointer"
                      onClick={() => setDrawerUnit(sub)}
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-medium truncate max-w-[160px]">{sub.eselon2}</div>
                        <div className="text-xs text-default-400 truncate max-w-[160px]">{sub.eselon1}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <TargetBadge target={sub.target} tercapai={achieved} showStatus={val !== null} />
                      </td>
                      <td className="py-2.5 px-3"><StatusBadge status={sub.status} /></td>
                      <td className="py-2.5 px-3">
                        <ZiProgressBar value={sub.progress_percent} label={`${sub.checked_count}/${sub.total_data}`} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {val !== null ? (
                          <span className={`font-bold ${achieved ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                            {val.toFixed(2)} 
                          </span>
                        ) : <span className="text-default-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <SyncButton
                          id={sub._id}
                          syncing={syncingIds.includes(sub._id)}
                          onSync={syncSubmission}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && submissions.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <Award size={32} className="mx-auto text-default-300" />
          <p className="text-default-400 text-sm">Belum ada data LKE.</p>
          <Button as={NextLink} href="/zona-integritas/lke-checker" color="primary" size="sm">
            Tambah LKE
          </Button>
        </div>
      )}

      {/* Drawer */}
      {drawerUnit && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDrawerUnit(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-background shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-default-200 px-5 py-4 flex items-start justify-between">
              <div>
                <h2 className="font-bold">{drawerUnit.eselon2}</h2>
                <p className="text-xs text-default-500">{drawerUnit.eselon1}</p>
              </div>
              <button onClick={() => setDrawerUnit(null)} className="p-1.5 rounded-lg hover:bg-default-100">
                <span className="text-default-500 text-lg leading-none">×</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <TargetBadge
                  target={drawerUnit.target}
                  tercapai={drawerUnit.nilai_lke?.nilai_akhir != null && drawerUnit.nilai_lke.nilai_akhir >= TARGET_THRESHOLD[drawerUnit.target]}
                  showStatus={!!drawerUnit.nilai_lke}
                />
                <StatusBadge status={drawerUnit.status} />
              </div>
              <ZiProgressBar value={drawerUnit.progress_percent} label={`${drawerUnit.checked_count}/${drawerUnit.total_data} data diperiksa`} />
              {drawerUnit.nilai_lke ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-default-500">Nilai Akhir</p>
                  <p className={`text-3xl font-bold tabular-nums ${
                    drawerUnit.nilai_lke_ai.nilai_akhir >= TARGET_THRESHOLD[drawerUnit.target]
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-500"
                  }`}>
                    {drawerUnit.nilai_lke_ai.nilai_akhir?.toFixed(2) ?? "—"}
                  </p>
                  <p className="text-xs text-default-400">Threshold {drawerUnit.target}: {TARGET_THRESHOLD[drawerUnit.target]}</p>
                </div>
              ) : (
                <p className="text-sm text-default-400">Belum ada nilai. Sync untuk memuat.</p>
              )}
              <SyncButton
                id={drawerUnit._id}
                syncing={syncingIds.includes(drawerUnit._id)}
                onSync={syncSubmission}
                size="md"
              />
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
