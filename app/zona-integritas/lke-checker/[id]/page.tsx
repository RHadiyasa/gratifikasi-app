"use client";

import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Progress } from "@heroui/progress";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Link2Off,
  Clock,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { TargetBadge } from "@/components/TargetBadge";
import { ZiProgressBar } from "@/components/ZiProgressBar";
import { NilaiLKETable } from "@/components/NilaiLKETable";
import type { LkeSubmission } from "@/types/zi";

type RowStatus = "checked" | "unchecked" | "no_link" | "revisi";
type VerdictColor = "HIJAU" | "KUNING" | "MERAH" | null;
type TabKey =
  | "semua"
  | "bermasalah"
  | "unchecked"
  | "no_link"
  | "revisi"
  | "checked";

interface DetailRow {
  id: string;
  bukti: string;
  link: string | null;
  status: RowStatus;
  verdict: string | null;
  verdictColor: VerdictColor;
  reviu: string | null;
  supervisi: string | null;
  tglCek: string | null;
}

interface DetailSummary {
  total: number;
  checked: number;
  unchecked: number;
  noLink: number;
  revisi: number;
}

const STATUS_CONFIG: Record<
  RowStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  checked: {
    label: "Sudah Dicek",
    color: "text-green-600 dark:text-green-400",
    icon: <CheckCircle2 size={12} />,
  },
  unchecked: {
    label: "Belum Dicek",
    color: "text-amber-500",
    icon: <Clock size={12} />,
  },
  no_link: {
    label: "Tanpa Link",
    color: "text-default-400",
    icon: <Link2Off size={12} />,
  },
  revisi: {
    label: "Revisi",
    color: "text-blue-500",
    icon: <RotateCw size={12} />,
  },
};

const VERDICT_STYLE: Record<string, string> = {
  HIJAU:
    "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800",
  KUNING:
    "bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-800",
  MERAH: "bg-red-500/10 text-red-500 border border-red-200 dark:border-red-800",
};

const TABS: { key: TabKey; label: string; color?: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "bermasalah", label: "Perlu Tindak Lanjut", color: "text-red-500" },
  { key: "unchecked", label: "Belum Dicek", color: "text-amber-500" },
  { key: "no_link", label: "Tanpa Link", color: "text-default-400" },
  { key: "revisi", label: "Revisi", color: "text-blue-500" },
  { key: "checked", label: "Sesuai ✅", color: "text-green-600" },
];

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [unit, setUnit] = useState<LkeSubmission | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);

  const [rows, setRows] = useState<DetailRow[]>([]);
  const [summary, setSummary] = useState<DetailSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [nilaiOpen, setNilaiOpen] = useState(false);
  const [nilaiTab, setNilaiTab] = useState<"lke" | "ai">("lke");
  const [sheetName, setSheetName] = useState("Jawaban");
  const [activeTab, setActiveTab] = useState<TabKey>("semua");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Load submission ──
  useEffect(() => {
    fetch(`/api/zi/submissions/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setUnitError(d.error);
        else setUnit(d.submission);
      })
      .catch((e) => setUnitError(e.message));
  }, [id]);

  // ── Load detail ──
  const loadDetail = useCallback(
    async (sName?: string) => {
      if (!unit?.link) return;
      setLoading(true);
      setDetailError(null);
      try {
        const res = await fetch("/api/zi/detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheetUrl: unit.link,
            sheetName: sName ?? sheetName,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat detail");
        setRows(data.rows);
        setSummary(data.summary);
        setExpandedId(null);
      } catch (e: any) {
        setDetailError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [unit, sheetName],
  );

  useEffect(() => {
    if (unit) loadDetail();
  }, [unit]);

  // ── Export ──
  async function handleExport() {
    if (!unit?.link) return;
    setExporting(true);
    try {
      const res = await fetch("/api/zi/detail/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl: unit.link,
          sheetName,
          unitName: unit.eselon2,
          eselon1: unit.eselon1,
          target: unit.target,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan_zi_${unit.eselon2.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Gagal export: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  // ── Filter ──
  const filtered = rows.filter((r) => {
    let matchTab = true;
    if (activeTab === "bermasalah")
      matchTab =
        r.verdictColor === "KUNING" ||
        r.verdictColor === "MERAH" ||
        r.status === "revisi" ||
        r.status === "unchecked" ||
        r.status === "no_link";
    else if (activeTab === "checked") matchTab = r.verdictColor === "HIJAU";
    else if (activeTab !== "semua") matchTab = r.status === activeTab;
    const matchSearch =
      !search ||
      r.id.includes(search) ||
      r.bukti.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabCount = (key: TabKey) => {
    if (key === "semua") return rows.length;
    if (key === "bermasalah")
      return rows.filter(
        (r) =>
          r.verdictColor === "KUNING" ||
          r.verdictColor === "MERAH" ||
          r.status === "revisi" ||
          r.status === "unchecked" ||
          r.status === "no_link",
      ).length;
    if (key === "checked")
      return rows.filter((r) => r.verdictColor === "HIJAU").length;
    return rows.filter((r) => r.status === key).length;
  };

  const sesuai = rows.filter((r) => r.verdictColor === "HIJAU").length;
  const sebagian = rows.filter((r) => r.verdictColor === "KUNING").length;
  const tidak = rows.filter((r) => r.verdictColor === "MERAH").length;

  if (unitError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="light"
          startContent={<ArrowLeft size={15} />}
          onPress={() => router.back()}
          className="mb-4"
        >
          Kembali
        </Button>
        <div className="text-center py-16 text-red-500">{unitError}</div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-center py-32 text-default-400 gap-2">
        <Loader2 size={16} className="animate-spin" /> Memuat data unit...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button
          variant="light"
          isIconOnly
          size="sm"
          onPress={() => router.back()}
          className="mt-0.5 shrink-0"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold truncate">{unit.eselon2}</h1>
            <TargetBadge target={unit.target} showStatus={false} />
            <StatusBadge status={unit.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <p className="text-sm text-default-400">{unit.eselon1}</p>
            <a
              href={unit.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink size={11} /> Buka Sheet
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="flat"
            isIconOnly
            isLoading={loading}
            onPress={() => loadDetail()}
            title="Refresh data dari sheet"
          >
            {!loading && <RefreshCw size={13} />}
          </Button>
          <Button
            size="sm"
            color="success"
            variant="flat"
            startContent={!exporting && <Download size={13} />}
            isLoading={exporting}
            isDisabled={!summary || exporting}
            onPress={handleExport}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* ── Progress unit ── */}
      <div className="rounded-xl border border-default-200 px-4 py-3 space-y-2">
        <div className="flex justify-between text-xs text-default-500">
          <span>Progress Pengecekan</span>
          <span className="font-mono tabular-nums">
            {unit.checked_count} / {unit.total_data || "?"}
          </span>
        </div>
        <ZiProgressBar value={unit.progress_percent} size="sm" />
      </div>

      {/* ── Nilai LKE collapsible ── */}
      {(unit.nilai_lke?.nilai_akhir != null ||
        unit.nilai_lke_ai?.nilai_akhir != null) && (
        <div className="rounded-xl border border-default-200 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-default-50 transition-colors"
            onClick={() => setNilaiOpen(!nilaiOpen)}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Nilai LKE</span>
              <div className="flex items-center gap-2">
                {unit.nilai_lke?.nilai_akhir != null && (
                  <span
                    className={`text-sm font-bold tabular-nums ${unit.nilai_lke.nilai_akhir >= (unit.target === "WBBM" ? 75 : 60) ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
                  >
                    {unit.nilai_lke.nilai_akhir.toFixed(2)}
                  </span>
                )}
                {unit.nilai_lke_ai?.nilai_akhir != null && (
                  <span className="text-xs font-mono text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded">
                    AI: {unit.nilai_lke_ai.nilai_akhir.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            {nilaiOpen ? (
              <ChevronUp size={15} className="text-default-400" />
            ) : (
              <ChevronDown size={15} className="text-default-400" />
            )}
          </button>

          {nilaiOpen && (
            <div className="border-t border-default-200 p-4 space-y-3">
              {/* Tab switcher jika keduanya ada */}
              {unit.nilai_lke?.nilai_akhir != null &&
                unit.nilai_lke_ai?.nilai_akhir != null && (
                  <div className="flex gap-1">
                    {(["lke", "ai"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setNilaiTab(t)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${nilaiTab === t ? "bg-primary text-white" : "bg-default-100 text-default-600 hover:bg-default-200"}`}
                      >
                        {t === "lke"
                          ? "Nilai LKE (Sheet)"
                          : "Nilai AI (Checker)"}
                      </button>
                    ))}
                  </div>
                )}

              {nilaiTab === "lke" && unit.nilai_lke?.nilai_akhir != null && (
                <NilaiLKETable nilai={unit.nilai_lke} target={unit.target} />
              )}
              {(nilaiTab === "ai" || unit.nilai_lke?.nilai_akhir == null) &&
                unit.nilai_lke_ai?.nilai_akhir != null && (
                  <NilaiLKETable
                    nilai={unit.nilai_lke_ai}
                    target={unit.target}
                  />
                )}
            </div>
          )}
        </div>
      )}

      {/* ── Summary cards ── */}
      {summary && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {[
            { label: "Total", value: summary.total, cls: "" },
            {
              label: "✅ Sesuai",
              value: sesuai,
              cls: "text-green-600 dark:text-green-400",
            },
            { label: "⚠️ Sebagian", value: sebagian, cls: "text-amber-500" },
            { label: "❌ Tidak", value: tidak, cls: "text-red-500" },
            {
              label: "Belum Dicek",
              value: summary.unchecked,
              cls: "text-default-500",
            },
            {
              label: "Tanpa Link",
              value: summary.noLink,
              cls: "text-default-400",
            },
            { label: "Revisi", value: summary.revisi, cls: "text-blue-500" },
            {
              label: "Progress",
              value: `${summary.total > 0 ? Math.round((summary.checked / summary.total) * 100) : 0}%`,
              cls: "text-primary",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="text-center rounded-xl bg-default-50 dark:bg-default-100 p-2.5"
            >
              <p className={`text-lg font-bold tabular-nums ${s.cls}`}>
                {s.value}
              </p>
              <p className="text-[10px] text-default-500 mt-0.5 leading-tight">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {detailError && (
        <div className="flex items-center gap-2 text-sm text-red-500 rounded-xl border border-red-200 dark:border-red-800 bg-red-500/5 px-3 py-2.5">
          <XCircle size={14} className="shrink-0" /> {detailError}
        </div>
      )}

      {loading && !summary && (
        <div className="flex items-center justify-center py-20 text-default-400 gap-2 text-sm">
          <Loader2 size={16} className="animate-spin" /> Memuat data dari
          sheet...
        </div>
      )}

      {/* ── Sheet name override ── */}
      {summary && (
        <div className="flex items-center gap-2">
          <Input
            size="sm"
            label="Nama tab sheet"
            value={sheetName}
            onValueChange={setSheetName}
            className="max-w-[180px]"
          />
          <Button
            size="sm"
            variant="flat"
            isDisabled={loading}
            onPress={() => loadDetail(sheetName)}
          >
            Reload
          </Button>
        </div>
      )}

      {/* ── Tabs + Search + Table ── */}
      {summary && (
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map((t) => {
              const count = tabCount(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === t.key
                      ? "bg-primary text-white shadow-sm"
                      : "bg-default-100 text-default-600 hover:bg-default-200"
                  }`}
                >
                  <span className={activeTab !== t.key ? (t.color ?? "") : ""}>
                    {t.label}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === t.key ? "bg-white/20" : "bg-default-200"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <Input
            size="sm"
            placeholder="Cari ID atau nama data..."
            startContent={<Search size={13} className="text-default-400" />}
            value={search}
            onValueChange={setSearch}
            isClearable
            onClear={() => setSearch("")}
            className="max-w-sm"
          />

          {/* Table */}
          <div className="rounded-xl border border-default-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-default-50 border-b border-default-200">
                <tr>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 w-12">
                    ID
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500">
                    Nama Bukti Data
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 w-28">
                    Hasil AI
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 w-24">
                    Status
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-default-500 w-20">
                    Tgl Cek
                  </th>
                  <th className="text-center py-2.5 px-3 font-medium text-default-500 w-10">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-14 text-center text-default-400"
                    >
                      Tidak ada data untuk filter ini
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const statusCfg = STATUS_CONFIG[row.status];
                    const isExpanded = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr
                          className={`hover:bg-default-50 transition-colors ${row.reviu ? "cursor-pointer" : ""} ${isExpanded ? "bg-default-50" : ""}`}
                          onClick={() =>
                            row.reviu &&
                            setExpandedId(isExpanded ? null : row.id)
                          }
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-default-700">
                            {row.id}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="truncate max-w-[260px]"
                                title={row.bukti}
                              >
                                {row.bukti || (
                                  <span className="text-default-300 italic">
                                    —
                                  </span>
                                )}
                              </span>
                              {row.reviu &&
                                (isExpanded ? (
                                  <ChevronUp
                                    size={11}
                                    className="text-default-400 shrink-0"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={11}
                                    className="text-default-400 shrink-0"
                                  />
                                ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {row.verdictColor ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${VERDICT_STYLE[row.verdictColor]}`}
                              >
                                {row.verdict}
                              </span>
                            ) : (
                              <span className="text-default-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`flex items-center gap-1 ${statusCfg.color}`}
                            >
                              {statusCfg.icon} {statusCfg.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-default-400 text-[10px] tabular-nums">
                            {row.tglCek || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.link ? (
                              <a
                                href={row.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary-600 transition-colors inline-flex justify-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <Link2Off
                                size={12}
                                className="text-default-300 inline"
                              />
                            )}
                          </td>
                        </tr>
                        {isExpanded && row.reviu && (
                          <tr className="bg-default-50">
                            <td />
                            <td colSpan={5} className="px-3 pb-3 pt-1">
                              <div className="rounded-lg bg-default-100 dark:bg-default-50 px-3 py-2 text-xs text-default-600 leading-relaxed">
                                <p className="font-semibold text-default-500 mb-1 text-[10px] uppercase tracking-wide">
                                  Catatan Reviu
                                </p>
                                {row.reviu.split(" | ").map((line, i) => (
                                  <p key={i}>{line}</p>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-default-400 text-right">
            Menampilkan {filtered.length} dari {rows.length} data
          </p>
        </div>
      )}
    </div>
  );
}
