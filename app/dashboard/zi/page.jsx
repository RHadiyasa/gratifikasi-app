"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NextLink from "next/link";
import { useTheme } from "next-themes";
import {
  Award, CheckCircle2, Clock, AlertTriangle,
  Users, ArrowRight, RefreshCw, X, Shield,
  ChevronRight, Activity, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { useZiStore } from "@/store/ziStore";
import { TARGET_THRESHOLD } from "@/types/zi";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";

const KOMPONEN_KEYS = [
  { key: "manajemen_perubahan",     label: "Manajemen Perubahan" },
  { key: "penataan_tatalaksana",    label: "Tatalaksana" },
  { key: "penataan_sdm",            label: "SDM" },
  { key: "penguatan_akuntabilitas", label: "Akuntabilitas" },
  { key: "penguatan_pengawasan",    label: "Pengawasan" },
  { key: "peningkatan_pelayanan",   label: "Pelayanan" },
];

function nilaiColor(val, threshold) {
  if (val === null || val === undefined) return "#71717a";
  if (val >= threshold) return "#10b981";
  if (val >= threshold * 0.8) return "#f59e0b";
  return "#f43f5e";
}

function NilaiChip({ val, threshold }) {
  if (val === null || val === undefined)
    return <span className="text-default-400 font-mono">—</span>;
  const achieved = val >= threshold;
  return (
    <span className={cn(
      "font-bold font-mono tabular-nums text-sm",
      achieved
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-600 dark:text-rose-400",
    )}>
      {val.toFixed(2)}
    </span>
  );
}

function StatusPill({ status }) {
  const MAP = {
    "Belum Dicek":  { variant: "secondary", dot: "bg-default-400" },
    "Sedang Dicek": { variant: "warning",   dot: "bg-amber-500 animate-pulse" },
    "Selesai":      { variant: "success",   dot: "bg-emerald-500" },
    "Perlu Revisi": { variant: "destructive", dot: "bg-rose-500" },
  };
  const cfg = MAP[status] ?? { variant: "secondary", dot: "bg-default-400" };
  return (
    <Badge variant={cfg.variant} className="gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {status}
    </Badge>
  );
}

function TargetPill({ target, tercapai, showStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant={target === "WBK" ? "info" : "violet"}>
        {target}
      </Badge>
      {showStatus && tercapai !== undefined && (
        tercapai
          ? <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400" />
          : <X size={13} className="text-rose-500 dark:text-rose-400" />
      )}
    </span>
  );
}

function ZiProgress({ value, label, size = "md" }) {
  const h = size === "sm" ? "h-1.5" : "h-2";
  const color = value >= 75
    ? "bg-emerald-500"
    : value >= 60
      ? "bg-amber-500"
      : "bg-rose-500";
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full space-y-1">
      <div className={cn("w-full bg-default-200 rounded-full overflow-hidden", h)}>
        <div
          className={cn(h, color, "rounded-full transition-all duration-700")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && <p className="text-xs text-default-400 text-right">{label}</p>}
    </div>
  );
}

function SyncBtn({ id, syncing, onSync, size = "sm" }) {
  return (
    <button
      disabled={syncing}
      onClick={() => onSync(id)}
      aria-label="Sync LKE"
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-all",
        "border border-default-200 bg-default-100 hover:bg-default-200",
        "text-default-500 hover:text-foreground",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
      )}
    >
      <RefreshCw size={size === "sm" ? 12 : 15} className={syncing ? "animate-spin" : ""} />
    </button>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-default-200 bg-content1 px-3 py-2 text-xs shadow-xl">
      <p className="text-default-400 mb-1">{label}</p>
      <p className="font-bold text-foreground">{Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
}

const STAT_CONFIG = [
  {
    key: "total",
    label: "Total Unit",
    icon: Users,
    numColor: "text-foreground",
    iconColor: "text-default-500",
    ring: "ring-default-300 dark:ring-default-600",
    bg: "bg-default-100",
  },
  {
    key: "selesai",
    label: "Selesai",
    icon: CheckCircle2,
    numColor: "text-emerald-600 dark:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-300 dark:ring-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
  },
  {
    key: "sedang",
    label: "Sedang Dicek",
    icon: Activity,
    numColor: "text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-300 dark:ring-amber-700",
    bg: "bg-amber-50 dark:bg-amber-900/30",
  },
  {
    key: "belum",
    label: "Belum Dicek",
    icon: Clock,
    numColor: "text-rose-600 dark:text-rose-400",
    iconColor: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-300 dark:ring-rose-700",
    bg: "bg-rose-50 dark:bg-rose-900/30",
  },
  {
    key: "wbk_tercapai",
    label: "WBK Tercapai",
    icon: Shield,
    numColor: "text-blue-600 dark:text-blue-400",
    iconColor: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-300 dark:ring-blue-700",
    bg: "bg-blue-50 dark:bg-blue-900/30",
  },
  {
    key: "wbbm_tercapai",
    label: "WBBM Tercapai",
    icon: Zap,
    numColor: "text-violet-600 dark:text-violet-400",
    iconColor: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-300 dark:ring-violet-700",
    bg: "bg-violet-50 dark:bg-violet-900/30",
  },
];

export default function DashboardZI() {
  const {
    submissions, summary, isLoading, syncingIds,
    fetchSubmissions, syncSubmission,
  } = useZiStore();

  const [drawerUnit, setDrawerUnit] = useState(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor  = isDark ? "#3f3f46" : "#e4e4e7";
  const axisColor  = isDark ? "#71717a" : "#a1a1aa";

  useEffect(() => { fetchSubmissions(); }, []);

  const barData = submissions
    .filter((s) => s.nilai_lke_ai?.nilai_akhir != null)
    .sort((a, b) => b.nilai_lke_ai.nilai_akhir - a.nilai_lke_ai.nilai_akhir)
    .slice(0, 12)
    .map((s) => ({
      name:  s.eselon2.length > 20 ? s.eselon2.slice(0, 19) + "…" : s.eselon2,
      nilai: s.nilai_lke_ai.nilai_akhir,
      color: nilaiColor(s.nilai_lke_ai.nilai_akhir, TARGET_THRESHOLD[s.target]),
    }));

  const anomali = submissions.filter((s) =>
    s.status === "Selesai" &&
    s.nilai_lke_ai?.nilai_akhir != null &&
    s.nilai_lke_ai.nilai_akhir < TARGET_THRESHOLD[s.target],
  );

  const radarData = KOMPONEN_KEYS.map(({ key, label }) => {
    const vals = submissions
      .map((s) => s.nilai_lke_ai?.pengungkit?.[key]?.nilai)
      .filter((v) => v != null);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { subject: label, nilai: parseFloat(avg.toFixed(2)) };
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-default-400 uppercase tracking-widest">
              Inspektorat Jenderal · Kementerian ESDM
            </p>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              Dashboard Zona Integritas
            </h1>
            <p className="text-sm text-default-500">
              Ringkasan eksekutif evaluasi Lembar Kerja Evaluasi (LKE)
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={fetchSubmissions}
              disabled={isLoading}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                "border border-default-200 bg-default-100 hover:bg-default-200 text-default-600",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
            <NextLink
              href="/zona-integritas/lke-checker"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              LKE Checker
              <ArrowRight size={14} />
            </NextLink>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAT_CONFIG.map(({ key, label, icon: Icon, numColor, iconColor, ring, bg }) => (
              <Card key={key} className={cn("border-default-200 overflow-hidden", bg)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-medium text-default-500">{label}</p>
                    <div className={cn("p-1.5 rounded-lg ring-1", ring, bg)}>
                      <Icon size={13} className={iconColor} />
                    </div>
                  </div>
                  <p className={cn("text-3xl font-black tabular-nums", numColor)}>
                    {summary[key] ?? 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Rata-rata Nilai Akhir ── */}
        {summary?.rata_nilai_akhir != null && (
          <Card className="border-default-200 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/30">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-default-500 uppercase tracking-wider font-medium mb-1">
                  Rata-rata Nilai Akhir LKE
                </p>
                <p className="text-5xl font-black tabular-nums text-indigo-600 dark:text-indigo-300">
                  {summary.rata_nilai_akhir.toFixed(2)}
                </p>
                <p className="text-xs text-default-400 mt-1">dari skala 100</p>
              </div>
              <div className="text-right space-y-2">
                <div className="flex items-center gap-2 text-xs text-default-500">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  WBK ≥ 60
                </div>
                <div className="flex items-center gap-2 text-xs text-default-500">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  WBBM ≥ 75
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Charts ── */}
        {(barData.length > 0 || radarData.some((d) => d.nilai > 0)) && (
          <div className="grid lg:grid-cols-5 gap-5">

            {/* Bar Chart */}
            {barData.length > 0 && (
              <Card className="lg:col-span-3 border-default-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Ranking Nilai Akhir</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">
                      Top {barData.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div style={{ height: Math.max(220, barData.length * 30) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        layout="vertical"
                        margin={{ left: 0, right: 24, top: 4, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          stroke={gridColor}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: axisColor }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 10, fill: axisColor }}
                          width={130}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={<ChartTooltip />}
                          cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}
                        />
                        <Bar dataKey="nilai" radius={[0, 4, 4, 0]} maxBarSize={18}>
                          {barData.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Radar Chart */}
            {radarData.some((d) => d.nilai > 0) && (
              <Card className="lg:col-span-2 border-default-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Rata-rata Komponen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={radarData}
                        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      >
                        <PolarGrid stroke={gridColor} />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fontSize: 9, fill: axisColor }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 10]}
                          tick={{ fontSize: 8, fill: axisColor }}
                          axisLine={false}
                        />
                        <Radar
                          name="Rata-rata"
                          dataKey="nilai"
                          stroke="#818cf8"
                          fill="#818cf8"
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                        <Tooltip content={<ChartTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Anomali Panel ── */}
        {anomali.length > 0 && (
          <Card className="border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-950/20">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/20">
                  <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {anomali.length} unit belum mencapai threshold
                </p>
                <Badge variant="destructive" className="ml-auto">{anomali.length}</Badge>
              </div>
              <Separator className="bg-rose-200 dark:bg-rose-500/20" />
              <div className="space-y-1.5">
                {anomali.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => setDrawerUnit(s)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                      "bg-white/60 dark:bg-white/3 hover:bg-white dark:hover:bg-white/8",
                      "border border-rose-100 dark:border-white/5 hover:border-rose-300 dark:hover:border-rose-500/30",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.eselon2}</p>
                      <p className="text-xs text-default-400 truncate">{s.eselon1}</p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <TargetPill target={s.target} tercapai={false} showStatus />
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {s.nilai_lke_ai.nilai_akhir.toFixed(2)}
                      </span>
                      <ChevronRight size={14} className="text-default-300" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── All Units Table ── */}
        {submissions.length > 0 && (
          <Card className="border-default-200">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Semua Unit Kerja</CardTitle>
                <span className="text-xs text-default-400">{submissions.length} unit</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Unit Kerja</TableHead>
                    <TableHead className="w-28">Target</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-40">Progress</TableHead>
                    <TableHead className="w-20 text-right">Nilai</TableHead>
                    <TableHead className="w-14 text-center">Sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => {
                    const threshold = TARGET_THRESHOLD[sub.target];
                    const val = sub.nilai_lke_ai?.nilai_akhir ?? null;
                    const achieved = val !== null && val >= threshold;
                    return (
                      <TableRow
                        key={sub._id}
                        className="cursor-pointer"
                        onClick={() => setDrawerUnit(sub)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground truncate max-w-[180px]">
                              {sub.eselon2}
                            </p>
                            <p className="text-xs text-default-400 truncate max-w-[180px]">
                              {sub.eselon1}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TargetPill
                            target={sub.target}
                            tercapai={achieved}
                            showStatus={val !== null}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusPill status={sub.status} />
                        </TableCell>
                        <TableCell>
                          <ZiProgress
                            value={sub.progress_percent}
                            label={`${sub.checked_count}/${sub.total_data}`}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <NilaiChip val={val} threshold={threshold} />
                        </TableCell>
                        <TableCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SyncBtn
                            id={sub._id}
                            syncing={syncingIds.includes(sub._id)}
                            onSync={syncSubmission}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Empty State ── */}
        {!isLoading && submissions.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-default-100 flex items-center justify-center">
              <Award size={28} className="text-default-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Belum ada data LKE</p>
              <p className="text-xs text-default-400">Mulai tambah data LKE unit kerja</p>
            </div>
            <NextLink
              href="/zona-integritas/lke-checker"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Tambah LKE
              <ArrowRight size={14} />
            </NextLink>
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      <AnimatePresence>
        {drawerUnit && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setDrawerUnit(null)}
            />
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-content1 border-l border-default-200 shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="sticky top-0 z-10 bg-content1/95 backdrop-blur border-b border-default-200 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-foreground truncate">{drawerUnit.eselon2}</h2>
                    <p className="text-xs text-default-400 truncate">{drawerUnit.eselon1}</p>
                  </div>
                  <button
                    onClick={() => setDrawerUnit(null)}
                    className="p-2 rounded-lg hover:bg-default-100 text-default-500 hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="p-5 space-y-5">

                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <TargetPill
                    target={drawerUnit.target}
                    tercapai={
                      drawerUnit.nilai_lke_ai?.nilai_akhir != null &&
                      drawerUnit.nilai_lke_ai.nilai_akhir >= TARGET_THRESHOLD[drawerUnit.target]
                    }
                    showStatus={!!drawerUnit.nilai_lke_ai}
                  />
                  <StatusPill status={drawerUnit.status} />
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-default-500">
                    <span>Progress Pemeriksaan</span>
                    <span>{drawerUnit.progress_percent?.toFixed(0) ?? 0}%</span>
                  </div>
                  <ZiProgress
                    value={drawerUnit.progress_percent}
                    label={`${drawerUnit.checked_count}/${drawerUnit.total_data} data diperiksa`}
                  />
                </div>

                <Separator />

                {/* Nilai */}
                {drawerUnit.nilai_lke_ai?.nilai_akhir != null ? (
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-default-400 uppercase tracking-wider mb-1">
                          Nilai Akhir
                        </p>
                        <p className={cn(
                          "text-5xl font-black font-mono tabular-nums",
                          drawerUnit.nilai_lke_ai.nilai_akhir >= TARGET_THRESHOLD[drawerUnit.target]
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400",
                        )}>
                          {drawerUnit.nilai_lke_ai.nilai_akhir.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-default-400">
                          Threshold {drawerUnit.target}
                        </p>
                        <p className="text-2xl font-bold text-default-500">
                          {TARGET_THRESHOLD[drawerUnit.target]}
                        </p>
                      </div>
                    </div>

                    {/* Threshold bar */}
                    <div className="relative">
                      <div className="h-2 w-full bg-default-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            drawerUnit.nilai_lke_ai.nilai_akhir >= TARGET_THRESHOLD[drawerUnit.target]
                              ? "bg-emerald-500"
                              : "bg-rose-500",
                          )}
                          style={{
                            width: `${Math.min(100, drawerUnit.nilai_lke_ai.nilai_akhir)}%`,
                          }}
                        />
                      </div>
                      <div
                        className="absolute top-0 h-2 w-0.5 bg-default-400"
                        style={{ left: `${TARGET_THRESHOLD[drawerUnit.target]}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <Card className="border-default-100 bg-default-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-default-400">
                        Belum ada nilai. Sync untuk memuat.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Komponen breakdown */}
                {drawerUnit.nilai_lke_ai?.pengungkit && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs text-default-400 uppercase tracking-wider font-medium">
                        Komponen Pengungkit
                      </p>
                      {KOMPONEN_KEYS.map(({ key, label }) => {
                        const kompVal = drawerUnit.nilai_lke_ai.pengungkit[key]?.nilai;
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-xs text-default-500 w-28 shrink-0">
                              {label}
                            </span>
                            <div className="flex-1">
                              <div className="h-1.5 w-full bg-default-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                                  style={{
                                    width: kompVal != null ? `${(kompVal / 10) * 100}%` : "0%",
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-xs font-mono text-default-600 w-8 text-right">
                              {kompVal != null ? kompVal.toFixed(1) : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <Separator />

                {/* Sync button */}
                <button
                  disabled={syncingIds.includes(drawerUnit._id)}
                  onClick={() => syncSubmission(drawerUnit._id)}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                    "border border-default-200 bg-default-100 hover:bg-default-200 text-foreground",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                >
                  <RefreshCw
                    size={14}
                    className={syncingIds.includes(drawerUnit._id) ? "animate-spin" : ""}
                  />
                  {syncingIds.includes(drawerUnit._id) ? "Menyinkronkan…" : "Sync Data LKE"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
