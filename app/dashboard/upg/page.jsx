"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Users, ClipboardList, Coins, ShieldCheck,
  ArrowRight, TrendingUp, Circle,
} from "lucide-react";
import Link from "next/link";

// ── Stat Card ─────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, title, value, accent }) => (
  <div className="rounded-2xl border border-default-200/60 bg-background p-5 flex flex-col gap-4 hover:border-default-300 transition-colors">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-default-400 uppercase tracking-widest">
        {title}
      </span>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}18` }}
      >
        <Icon size={15} style={{ color: accent }} />
      </div>
    </div>
    <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
  </div>
);

// ── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-default-200 bg-background/90 backdrop-blur px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-primary font-bold">{payload[0].value} laporan</p>
    </div>
  );
};

// ── Status badge map ───────────────────────────────────────────────────────
const statusConfig = {
  Diajukan:           { color: "#3b82f6", bg: "#3b82f620" },
  Diverifikasi:       { color: "#f59e0b", bg: "#f59e0b20" },
  "Diteruskan ke KPK":{ color: "#a855f7", bg: "#a855f720" },
  Selesai:            { color: "#22c55e", bg: "#22c55e20" },
};

// ── Page ───────────────────────────────────────────────────────────────────
export default function DashboardUPG() {
  const [stats, setStats] = useState({
    totalPelapor: 0,
    totalNilai: 0,
    perStatus: {},
    totalUPG: 0,
    perJenis: {},
    trend: [],
    recentReports: [],
  });

  useEffect(() => {
    axios.get("/api/dashboard")
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Error fetching dashboard data:", err));
  }, []);

  const statCards = [
    { icon: Users,         title: "Total Pelapor",    value: stats.totalPelapor,   accent: "#3b82f6" },
    { icon: Coins,         title: "Nilai Gratifikasi", value: `Rp ${stats.totalNilai.toLocaleString("id-ID")}`, accent: "#22c55e" },
    { icon: ClipboardList, title: "Tim UPG",           value: stats.totalUPG,       accent: "#a855f7" },
    { icon: ShieldCheck,   title: "Laporan Selesai",   value: stats.perStatus?.Selesai || 0, accent: "#f59e0b" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-1">
          Inspektorat V · Kementerian ESDM
        </p>
        <h1 className="text-2xl font-black text-foreground">Dashboard UPG</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      {/* Chart + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-default-200/60 bg-background p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">Tren Laporan</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">Per Bulan</p>
            </div>
            <TrendingUp size={16} className="text-default-300" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.trend} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
              <XAxis
                dataKey="bulan"
                tick={{ fontSize: 11, fill: "var(--heroui-default-400)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--heroui-default-400)" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(128,128,128,0.05)" }} />
              <Bar dataKey="jumlah" fill="hsl(var(--heroui-primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown */}
        <div className="rounded-2xl border border-default-200/60 bg-background p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">Status</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">Laporan</p>
            </div>
            <Link
              href="/dashboard/report-list"
              className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.perStatus || {}).map(([status, jumlah]) => {
              const cfg = statusConfig[status] || { color: "#6b7280", bg: "#6b728020" };
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle size={7} style={{ color: cfg.color, fill: cfg.color }} />
                    <span className="text-sm text-default-600">{status}</span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: cfg.color, background: cfg.bg }}
                  >
                    {jumlah}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="rounded-2xl border border-default-200/60 bg-background overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div>
            <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">Terbaru</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">Laporan Masuk</p>
          </div>
          <Link
            href="/dashboard/report-list"
            className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
          >
            Semua laporan <ArrowRight size={12} />
          </Link>
        </div>

        <div className="divide-y divide-default-100">
          {stats.recentReports.length === 0 && (
            <p className="text-sm text-default-400 text-center py-10">Belum ada laporan.</p>
          )}
          {stats.recentReports.map((r) => {
            const cfg = statusConfig[r.status] || { color: "#6b7280", bg: "#6b728020" };
            return (
              <div
                key={r.uniqueId}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-default-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-default-100 flex items-center justify-center shrink-0 text-xs font-bold text-default-500">
                    {(r.nama || "A")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.nama || "Anonim"}</p>
                    <p className="text-xs text-default-400 truncate">{r.reportType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:block"
                    style={{ color: cfg.color, background: cfg.bg }}
                  >
                    {r.status}
                  </span>
                  <span className="text-xs text-default-400 tabular-nums">
                    {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
