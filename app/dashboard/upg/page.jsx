"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Users,
  ClipboardList,
  Coins,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import Link from "next/link";

import { PageHeader, Panel, PanelHeader } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { EmptyState, ErrorState } from "@/components/dashboard/States";
import {
  ChartSkeleton,
  ListSkeleton,
  StatCardsSkeleton,
} from "@/components/dashboard/Skeletons";

const KEADAAN_AWAL = {
  totalPelapor: 0,
  totalNilai: 0,
  perStatus: {},
  totalUPG: 0,
  perJenis: {},
  trend: [],
  recentReports: [],
};

const StatCard = ({ icon: Icon, title, value, accent }) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-default-200/60 bg-background p-5 transition-colors hover:border-default-300">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-default-400">
        {title}
      </span>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${accent}18` }}
      >
        <Icon size={15} style={{ color: accent }} />
      </div>
    </div>
    <p className="truncate text-2xl font-bold tracking-tight tabular-nums text-foreground">
      {value}
    </p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-default-200 bg-background/90 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="font-bold text-primary">{payload[0].value} laporan</p>
    </div>
  );
};

export default function DashboardUPG() {
  const [stats, setStats] = useState(KEADAAN_AWAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const ambilData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get("/api/dashboard");

      // Gabungkan dengan keadaan awal supaya field yang tidak dikirim API
      // tidak membuat render gagal (dulu `stats.totalNilai` bisa undefined).
      setStats({ ...KEADAAN_AWAL, ...(res.data ?? {}) });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Tidak dapat mengambil data dashboard. Periksa koneksi Anda."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ambilData();
  }, [ambilData]);

  const statCards = [
    {
      icon: Users,
      title: "Total Pelapor",
      value: stats.totalPelapor ?? 0,
      accent: "#3b82f6",
    },
    {
      icon: Coins,
      title: "Nilai Gratifikasi",
      value: `Rp ${Number(stats.totalNilai ?? 0).toLocaleString("id-ID")}`,
      accent: "#22c55e",
    },
    {
      icon: ClipboardList,
      title: "Tim UPG",
      value: stats.totalUPG ?? 0,
      accent: "#a855f7",
    },
    {
      icon: ShieldCheck,
      title: "Laporan Selesai",
      value: stats.perStatus?.Selesai ?? 0,
      accent: "#f59e0b",
    },
  ];

  const lihatSemua = (
    <Link
      className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      href="/dashboard/report-list"
    >
      Lihat semua <ArrowRight size={12} />
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        description={
          loading ? "Memuat ringkasan…" : "Ringkasan pelaporan gratifikasi"
        }
        eyebrow="Inspektorat V · Kementerian ESDM"
        title="Dashboard UPG"
      />

      {error ? (
        <Panel>
          <ErrorState message={error} onRetry={ambilData} />
        </Panel>
      ) : loading ? (
        <>
          <StatCardsSkeleton />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel className="p-5 lg:col-span-2">
              <div className="mb-6 h-9" />
              <ChartSkeleton />
            </Panel>
            <Panel className="p-5">
              <div className="mb-6 h-9" />
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-3 w-24 animate-pulse rounded bg-default-200" />
                    <div className="h-5 w-8 animate-pulse rounded-full bg-default-200" />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Terbaru" title="Laporan Masuk" />
            <ListSkeleton />
          </Panel>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((c) => (
              <StatCard key={c.title} {...c} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel className="p-5 lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-default-400">
                    Tren Laporan
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    Per Bulan
                  </p>
                </div>
                <TrendingUp className="text-default-300" size={16} />
              </div>

              {stats.trend?.length ? (
                <ResponsiveContainer height={220} width="100%">
                  <BarChart barSize={24} data={stats.trend}>
                    <CartesianGrid
                      stroke="rgba(128,128,128,0.1)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      axisLine={false}
                      dataKey="bulan"
                      tick={{ fontSize: 11, fill: "var(--heroui-default-400)" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--heroui-default-400)" }}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "rgba(128,128,128,0.05)" }}
                    />
                    <Bar
                      dataKey="jumlah"
                      fill="hsl(var(--heroui-primary))"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  description="Grafik akan muncul setelah ada laporan yang tercatat."
                  icon={<TrendingUp size={20} />}
                  title="Belum ada data tren"
                />
              )}
            </Panel>

            <Panel className="p-5">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-default-400">
                    Status
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    Laporan
                  </p>
                </div>
                {lihatSemua}
              </div>

              {Object.keys(stats.perStatus ?? {}).length ? (
                <div className="space-y-3">
                  {Object.entries(stats.perStatus).map(([status, jumlah]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between gap-2"
                    >
                      <StatusChip status={status} />
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {jumlah}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-default-400">
                  Belum ada laporan.
                </p>
              )}
            </Panel>
          </div>

          <Panel className="overflow-hidden">
            <PanelHeader
              action={lihatSemua}
              eyebrow="Terbaru"
              title="Laporan Masuk"
            />

            {stats.recentReports?.length ? (
              <div className="divide-y divide-default-100">
                {stats.recentReports.map((r) => (
                  <Link
                    key={r.uniqueId}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-default-50"
                    href="/dashboard/report-list"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-default-100 text-xs font-bold text-default-500">
                        {(r.nama || "A")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {r.nama || "Anonim"}
                        </p>
                        <p className="truncate text-xs text-default-400">
                          {r.reportType}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden sm:block">
                        <StatusChip status={r.status} />
                      </span>
                      <span className="text-xs tabular-nums text-default-400">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Laporan yang masuk lewat formulir akan tampil di sini."
                icon={<FileText size={20} />}
                title="Belum ada laporan"
              />
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
