"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  Award,
  AlertTriangle,
  Settings,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  Upload,
  Eye,
} from "lucide-react";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/react";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

type CohortsData = {
  tahun: number[];
  byTahun: Record<string, Array<{ batch: string; count: number }>>;
};

type DashboardData = {
  cohort: { tahun: number | null; batch: string | null };
  totals: {
    total: number;
    sudah: number;
    diverifikasi: number;
    belum: number;
    completionRate: number;
  };
  deadline: string | null;
  daysRemaining: number | null;
  uploadEnabled: boolean;
  tahunAktif: number | null;
  batchAktif: string;
  unitSummary: Array<{
    unit: string;
    total: number;
    sudah: number;
    diverifikasi: number;
    pct: number;
  }>;
  topUnits: Array<{ unit: string; pct: number; total: number; sudah: number }>;
  bottomUnits: Array<{ unit: string; pct: number; total: number; sudah: number }>;
  uploadsTimeline: Array<{ date: string; count: number }>;
  recentUploads: Array<{
    _id: string;
    nama: string;
    unit_eselon_i: string;
    statusCourse: string;
    uploaded_at: string;
  }>;
};

const StatCard = ({
  icon: Icon,
  title,
  value,
  accent,
  hint,
}: {
  icon: any;
  title: string;
  value: string | number;
  accent: string;
  hint?: string;
}) => (
  <div className="rounded-2xl border border-default-200/60 bg-background p-5 flex flex-col gap-3 hover:border-default-300 transition-colors">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-default-400 uppercase tracking-widest">
        {title}
      </span>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}18` }}
      >
        <Icon size={16} style={{ color: accent }} />
      </div>
    </div>
    <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
    {hint && <p className="text-xs text-default-400">{hint}</p>}
  </div>
);

export default function DashboardElearning() {
  const { role } = useAuthStore();
  const canManageParticipants = hasPermission(
    role,
    "elearning:participants:manage"
  );
  const canManageSettings = hasPermission(role, "elearning:settings:manage");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cohorts, setCohorts] = useState<CohortsData | null>(null);
  const [selectedTahun, setSelectedTahun] = useState<string>("all");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [cohortInitialized, setCohortInitialized] = useState(false);

  // Load cohorts list once
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const res = await axios.get("/api/elearning/cohorts");
        const c: CohortsData = res.data?.data ?? { tahun: [], byTahun: {} };
        setCohorts(c);
      } catch (err) {
        console.error("Gagal memuat cohorts:", err);
        setCohorts({ tahun: [], byTahun: {} });
      }
    };
    fetchCohorts();
  }, []);

  // Load dashboard data (and initial cohort defaults from settings on first run)
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (selectedTahun !== "all") params.tahun = selectedTahun;
        if (selectedBatch !== "all") params.batch = selectedBatch;
        const res = await axios.get("/api/elearning/dashboard-stats", {
          params,
        });
        if (!mounted) return;
        const fetched: DashboardData = res.data?.data ?? null;
        setData(fetched);

        // Set default cohort from settings on first load only
        if (!cohortInitialized && fetched) {
          if (fetched.tahunAktif && selectedTahun === "all") {
            setSelectedTahun(String(fetched.tahunAktif));
          }
          if (fetched.batchAktif && selectedBatch === "all") {
            setSelectedBatch(fetched.batchAktif);
          }
          setCohortInitialized(true);
        }
      } catch (err: any) {
        if (mounted)
          setError(err.response?.data?.message || "Gagal memuat dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [selectedTahun, selectedBatch, cohortInitialized]);

  const availableBatches =
    selectedTahun !== "all" && cohorts
      ? (cohorts.byTahun[selectedTahun] ?? [])
      : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <Loader2 className="w-8 h-8 animate-spin text-default-400" />
        <p className="text-sm text-default-400 mt-3">Memuat dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6 text-center">
        <p className="text-red-500">{error || "Data tidak tersedia."}</p>
      </div>
    );
  }

  const { totals } = data;
  const lowUnits = data.unitSummary.filter((u) => u.pct < 30 && u.total > 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-1">
            Inspektorat V · Kementerian ESDM
          </p>
          <h1 className="text-2xl font-black text-foreground">
            Dashboard E-Learning
          </h1>
          {(data.tahunAktif || data.batchAktif) && (
            <p className="text-sm text-default-500 mt-1">
              Cohort aktif:{" "}
              <span className="font-semibold text-primary">
                Batch {data.batchAktif || "—"}
                {data.tahunAktif ? ` · ${data.tahunAktif}` : ""}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageParticipants && (
            <Button
              as={Link}
              href="/dashboard/elearning/participants/import"
              color="success"
              variant="flat"
              startContent={<FileSpreadsheet size={16} />}
            >
              Import Peserta
            </Button>
          )}
          {canManageSettings && (
            <Button
              as={Link}
              href="/dashboard/elearning/settings"
              variant="flat"
              startContent={<Settings size={16} />}
            >
              Pengaturan
            </Button>
          )}
          <Button
            as={Link}
            href="/e-learning/tracker"
            color="primary"
            variant="shadow"
            startContent={<ListChecks size={16} />}
          >
            Tracker Detail
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-default-200/60 bg-background p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-0.5">
              Filter Cohort
            </p>
            <p className="text-xs text-default-500">
              Pilih tahun & batch untuk filter data dashboard.
              {data.cohort.tahun === null && data.cohort.batch === null && (
                <span className="text-default-400">
                  {" "}
                  Saat ini menampilkan{" "}
                  <strong className="text-foreground">semua cohort</strong>.
                </span>
              )}
              {cohorts && cohorts.tahun.length === 0 && (
                <span className="text-amber-500">
                  {" "}
                  Belum ada cohort terdaftar. Import peserta dulu lewat tombol
                  Import Peserta.
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select
              label="Tahun"
              size="sm"
              selectedKeys={[selectedTahun]}
              onChange={(e) => {
                setSelectedTahun(e.target.value || "all");
                setSelectedBatch("all");
              }}
              className="min-w-[160px]"
            >
              <SelectItem key="all">Semua Tahun</SelectItem>
              {(cohorts?.tahun ?? []).map((t) => (
                <SelectItem key={String(t)}>{String(t)}</SelectItem>
              ))}
            </Select>
            <Select
              label="Batch"
              size="sm"
              selectedKeys={[selectedBatch]}
              onChange={(e) => setSelectedBatch(e.target.value || "all")}
              isDisabled={selectedTahun === "all"}
              className="min-w-[160px]"
            >
              <SelectItem key="all">Semua Batch</SelectItem>
              {availableBatches.map((b) => (
                <SelectItem key={b.batch}>
                  {`Batch ${b.batch} (${b.count})`}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {!data.uploadEnabled && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-500" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Upload sertifikat saat ini <strong>dinonaktifkan</strong>. Peserta
            tidak bisa mengupload sertifikat.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          title="Total Peserta"
          value={totals.total}
          accent="#3b82f6"
        />
        <StatCard
          icon={CheckCircle2}
          title="Sudah Upload"
          value={totals.sudah + totals.diverifikasi}
          accent="#22c55e"
          hint={`${totals.completionRate}% completion`}
        />
        <StatCard
          icon={ShieldCheck}
          title="Diverifikasi"
          value={totals.diverifikasi}
          accent="#a855f7"
        />
        <StatCard
          icon={Clock}
          title="Belum Upload"
          value={totals.belum}
          accent="#f43f5e"
          hint={
            data.daysRemaining !== null
              ? `${data.daysRemaining} hari menuju deadline`
              : "Tidak ada deadline"
          }
        />
      </div>

      {data.uploadsTimeline.length > 0 && (
        <div className="rounded-2xl border border-default-200/60 bg-background p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">
                Tren Upload Sertifikat
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                30 Hari Terakhir
              </p>
            </div>
            <TrendingUp size={16} className="text-default-300" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.uploadsTimeline}>
              <defs>
                <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--heroui-primary))"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--heroui-primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(128,128,128,0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
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
              <Tooltip
                cursor={{ fill: "rgba(128,128,128,0.05)" }}
                contentStyle={{
                  borderRadius: 12,
                  fontSize: 12,
                  border: "1px solid rgba(128,128,128,0.2)",
                  backgroundColor: "rgba(20,20,20,0.85)",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--heroui-primary))"
                strokeWidth={2}
                fill="url(#uploadGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-default-200/60 bg-background p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">
                Top 5 Unit
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                Completion Tertinggi
              </p>
            </div>
            <Award size={16} className="text-amber-500" />
          </div>
          <div className="space-y-3">
            {data.topUnits.length === 0 ? (
              <p className="text-sm text-default-400">Belum ada data.</p>
            ) : (
              data.topUnits.map((u) => (
                <UnitProgressRow key={u.unit} {...u} accent="#22c55e" />
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-default-200/60 bg-background p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">
                Perlu Perhatian
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                Unit dengan Completion Terendah
              </p>
            </div>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div className="space-y-3">
            {data.bottomUnits.length === 0 ? (
              <p className="text-sm text-default-400">Semua unit 100% ✨</p>
            ) : (
              data.bottomUnits.map((u) => (
                <UnitProgressRow key={u.unit} {...u} accent="#f43f5e" />
              ))
            )}
          </div>
        </div>
      </div>

      {lowUnits.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-red-600 dark:text-red-400">
                {lowUnits.length} unit completion masih di bawah 30%
              </p>
              <p className="text-xs text-default-500 mt-1">
                {lowUnits.map((u) => u.unit).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-default-200/60 bg-background p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">
              Progress per Unit Eselon I
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              Detail Lengkap
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(280, data.unitSummary.length * 36)}>
          <BarChart
            data={data.unitSummary}
            layout="vertical"
            margin={{ left: 20, right: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(128,128,128,0.1)"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "var(--heroui-default-400)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="unit"
              tick={{ fontSize: 11, fill: "var(--heroui-default-400)" }}
              axisLine={false}
              tickLine={false}
              width={200}
            />
            <Tooltip
              cursor={{ fill: "rgba(128,128,128,0.05)" }}
              contentStyle={{
                borderRadius: 12,
                fontSize: 12,
                border: "1px solid rgba(128,128,128,0.2)",
                backgroundColor: "rgba(20,20,20,0.85)",
              }}
            />
            <Bar
              dataKey="pct"
              fill="hsl(var(--heroui-primary))"
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-default-200/60 bg-background overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div>
            <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">
              Upload Terbaru
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              Aktivitas 8 Sertifikat Terakhir
            </p>
          </div>
          <Link
            href="/e-learning/participants"
            className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
          >
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-default-100">
          {data.recentUploads.length === 0 ? (
            <p className="text-sm text-default-400 text-center py-10">
              Belum ada upload sertifikat.
            </p>
          ) : (
            data.recentUploads.map((r) => (
              <div
                key={r._id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-default-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-default-100 flex items-center justify-center shrink-0 text-xs font-bold text-default-500">
                    {(r.nama || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {r.nama}
                    </p>
                    <p className="text-xs text-default-400 truncate">
                      {r.unit_eselon_i}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <StatusChip status={r.statusCourse} />
                  <span className="text-xs text-default-400 tabular-nums">
                    {new Date(r.uploaded_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function UnitProgressRow({
  unit,
  pct,
  total,
  sudah,
  accent,
}: {
  unit: string;
  pct: number;
  total: number;
  sudah: number;
  accent: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-foreground font-medium truncate pr-2">{unit}</span>
        <span className="tabular-nums text-default-500 shrink-0">
          {sudah}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-default-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    Belum: { color: "#f43f5e", bg: "#f43f5e20", label: "Belum" },
    Sudah: { color: "#22c55e", bg: "#22c55e20", label: "Sudah" },
    Diverifikasi: { color: "#a855f7", bg: "#a855f720", label: "Diverifikasi" },
  };
  const cfg = config[status] || config.Belum;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}
