"use client";

import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Play,
  Info,
  StopCircle,
  DatabaseBackup,
  SheetIcon,
  Sheet,
  PencilLine,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NilaiLKETable } from "@/components/NilaiLKETable";
import type { LkeSubmission } from "@/types/zi";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";

// ── Types ────────────────────────────────────────────────────────────────────

type RowStatus = "checked" | "unchecked" | "no_link" | "revisi";
type VerdictColor = "HIJAU" | "KUNING" | "MERAH" | null;
type TabKey =
  | "semua"
  | "bermasalah"
  | "unchecked"
  | "no_link"
  | "revisi"
  | "checked";
type JobStatus = "running" | "done" | "error";

interface DetailRow {
  id: string;
  bukti: string;
  link: string | null;
  rawLink: string | null;
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

interface LogEntry {
  level: "info" | "success" | "warn" | "error";
  message: string;
}

interface RowJob {
  status: JobStatus;
  logs: LogEntry[];
}

function isDetailKriteria(kriteria: any) {
  return (
    kriteria?.answer_type === "jumlah" &&
    kriteria?.parent_question_id != null
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "bermasalah", label: "Perlu Tindak Lanjut" },
  { key: "unchecked", label: "Belum Dicek" },
  { key: "no_link", label: "Tanpa Link" },
  { key: "revisi", label: "Revisi" },
  { key: "checked", label: "Sesuai" },
];

const STATUS_CONFIG: Record<
  RowStatus,
  {
    label: string;
    badge: "secondary" | "warning" | "success" | "info" | "destructive";
  }
> = {
  checked: { label: "Sudah Dicek", badge: "success" },
  unchecked: { label: "Belum Dicek", badge: "warning" },
  no_link: { label: "Tanpa Link", badge: "secondary" },
  revisi: { label: "Revisi", badge: "info" },
};

const VERDICT_CLS: Record<string, string> = {
  HIJAU:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  KUNING:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  MERAH:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
};

const LOG_ICON: Record<string, React.ReactNode> = {
  success: (
    <CheckCircle2
      size={11}
      className="text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5"
    />
  ),
  warn: (
    <AlertTriangle
      size={11}
      className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5"
    />
  ),
  error: (
    <XCircle
      size={11}
      className="text-rose-500 dark:text-rose-400 shrink-0 mt-0.5"
    />
  ),
  info: <Info size={11} className="text-default-400 shrink-0 mt-0.5" />,
};

const LOG_CLS: Record<string, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-rose-600 dark:text-rose-400",
  info: "text-default-500 dark:text-default-400",
};

// ── Sub-components ───────────────────────────────────────────────────────────

function VerdictBadge({
  color,
  verdict,
}: {
  color: VerdictColor;
  verdict: string | null;
}) {
  if (!color || !verdict)
    return <span className="text-default-300 text-xs">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border",
        VERDICT_CLS[color],
      )}
    >
      {verdict}
    </span>
  );
}

function RowLogPanel({
  logs,
  status,
}: {
  logs: LogEntry[];
  status: JobStatus;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: "smooth",
    });
  }, [logs.length]);

  return (
    <div
      ref={ref}
      className="h-44 overflow-y-auto rounded-lg bg-default-100 dark:bg-zinc-900 border border-default-200 dark:border-zinc-800 p-3 space-y-0.5 font-mono text-xs"
    >
      {logs.length === 0 && status === "running" && (
        <div className="text-default-400">Memulai...</div>
      )}
      {logs.map((l, i) => (
        <div
          key={i}
          className={cn("flex items-start gap-1.5", LOG_CLS[l.level])}
        >
          {LOG_ICON[l.level]}
          <span className="break-all leading-relaxed">{l.message}</span>
        </div>
      ))}
      {status === "running" && (
        <div className="flex items-center gap-1.5 text-default-400 pt-0.5">
          <Loader2 size={10} className="animate-spin shrink-0" />
          <span>memproses…</span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canSync = hasPermission(role, "zi:sync");

  const [unit, setUnit] = useState<LkeSubmission | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [summary, setSummary] = useState<DetailSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [bulkResolving, setBulkResolving] = useState(false);

  const [nilaiOpen, setNilaiOpen] = useState(false);
  const [sheetName, setSheetName] = useState("Jawaban");
  const [activeTab, setActiveTab] = useState<TabKey>("semua");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  // Per-row expand: "reviu" or "log"
  const [expandedReviu, setExpandedReviu] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);

  // Per-row check jobs
  const [rowJobs, setRowJobs] = useState<Record<string, RowJob>>({});
  const abortRefs      = useRef<Record<string, AbortController>>({});
  const checkQueueRef  = useRef<string[]>([]);
  const activeChecksRef = useRef(0);
  const MAX_CONCURRENT = 3;

  const runningCount = Object.values(rowJobs).filter(
    (j) => j.status === "running",
  ).length;

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
      if (!unit) return;
      setLoading(true);
      setDetailError(null);
      try {
        // ── App mode: baca dari MongoDB ──
        if (unit.source === 'app') {
          const res = await fetch(`/api/zi/submissions/${id}/jawaban`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal memuat jawaban");

          const allEntries: any[] = Object.values(data.grouped ?? {}).flat();
          const mainEntries = allEntries.filter(
            (entry: any) => !isDetailKriteria(entry.kriteria),
          );
          const detailRows: DetailRow[] = mainEntries.sort((a: any, b: any) =>
            a.kriteria.question_id - b.kriteria.question_id
          ).map((entry: any) => {
            const ai = entry.jawaban?.ai_result ?? {};
            const link = entry.jawaban?.link_drive || null;
            const hasLink = !!link?.includes('drive.google');
            const isChecked = !!ai.color;
            const isRevisi = ai.supervisi === 'Revisi';

            let status: RowStatus;
            if (!hasLink)       status = 'no_link';
            else if (isRevisi)  status = 'revisi';
            else if (isChecked) status = 'checked';
            else                status = 'unchecked';

            return {
              id:           String(entry.kriteria.question_id),
              bukti:        entry.jawaban?.narasi || entry.jawaban?.bukti || entry.kriteria?.pertanyaan || '',
              link:         hasLink ? link : null,
              rawLink:      link,
              status,
              verdict:      isChecked ? (ai.status || ai.verdict || ai.color) : null,
              verdictColor: isChecked ? (ai.color as VerdictColor) : null,
              reviu:        ai.reviu || null,
              supervisi:    ai.supervisi || null,
              tglCek:       ai.checked_at ? new Date(ai.checked_at).toLocaleString('id-ID') : null,
            };
          });

          const checked   = detailRows.filter((r) => r.status === 'checked').length;
          const unchecked = detailRows.filter((r) => r.status === 'unchecked').length;
          const noLink    = detailRows.filter((r) => r.status === 'no_link').length;
          const revisi    = detailRows.filter((r) => r.status === 'revisi').length;

          setRows(detailRows);
          setSummary({ total: detailRows.length, checked, unchecked, noLink, revisi });
          setExpandedReviu(null);
          setExpandedLog(null);

          if (
            detailRows.length > 0 &&
            (detailRows.length !== unit.total_data || checked !== unit.checked_count)
          ) {
            fetch(`/api/zi/submissions/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                total_data: detailRows.length,
                checked_count: checked,
                unchecked_count: Math.max(0, detailRows.length - checked),
              }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (d.submission) setUnit(d.submission);
              })
              .catch(() => {});
          }
          return;
        }

        // ── Sheet mode: baca dari Google Sheets ──
        if (!unit.link) return;
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
        setExpandedReviu(null);
        setExpandedLog(null);

        // Patch total_data ke MongoDB jika berbeda dari yang tersimpan
        if (data.summary.total > 0 && data.summary.total !== unit?.total_data) {
          fetch(`/api/zi/submissions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ total_data: data.summary.total }),
          })
            .then((r) => r.json())
            .then((d) => { if (d.submission) setUnit(d.submission); })
            .catch(() => {});
        }
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

  // ── Refresh ringan: reload unit dari MongoDB + rows dari sheet (2 reads) ──
  async function handleRefresh() {
    try {
      const r = await fetch(`/api/zi/submissions/${id}`);
      const d = await r.json();
      if (d.submission) setUnit(d.submission);
    } catch { /* lanjut meski gagal */ }
    await loadDetail();
  }

  // ── Sync penuh: baca Google Sheets → update MongoDB → reload rows ──
  async function handleSync() {
    if (!unit?.link) return;
    setSyncing(true);
    setDetailError(null);
    try {
      const syncRes = await fetch(`/api/zi/submissions/${id}/sync`, { method: "POST" });
      const syncData = await syncRes.json();
      if (syncData.submission) setUnit(syncData.submission);
      await loadDetail();
    } catch (e: any) {
      setDetailError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  // ── Resolve short URL ──
  async function resolveUrl(rowId: string, shortUrl: string) {
    if (!unit?.link) return;
    setResolvingIds((prev) => new Set(prev).add(rowId));
    try {
      const res = await fetch("/api/zi/resolve-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortUrl,
          sheetUrl: unit.link,
          sheetName,
          rowId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal resolve URL");
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, link: data.resolvedUrl, rawLink: data.resolvedUrl, status: "unchecked" as RowStatus }
            : r,
        ),
      );
    } catch (e: any) {
      alert(`Gagal resolve URL: ${e.message}`);
    } finally {
      setResolvingIds((prev) => { const s = new Set(prev); s.delete(rowId); return s; });
    }
  }

  // ── Bulk Resolve URL ──
  async function handleBulkResolve() {
    const targets = rows.filter((r) => r.rawLink && !r.link);
    if (targets.length <= 10) return;
    setBulkResolving(true);
    for (const row of targets) {
      await resolveUrl(row.id, row.rawLink!);
    }
    setBulkResolving(false);
  }

  // ── Export ──
  async function handleExport() {
    if (!unit) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/zi/submissions/${unit._id}/export-lke`);
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

  // ── Per-row Visa check ──
  async function startRowCheck(rowId: string) {
    if (unit?.source !== 'app' && !unit?.link) return;

    // Batasi maksimal MAX_CONCURRENT parallel check untuk jaga quota Google Sheets API
    if (activeChecksRef.current >= MAX_CONCURRENT) {
      if (!checkQueueRef.current.includes(rowId)) {
        checkQueueRef.current.push(rowId);
      }
      return;
    }
    activeChecksRef.current++;

    // Abort previous job for this row if any
    abortRefs.current[rowId]?.abort();
    const ctrl = new AbortController();
    abortRefs.current[rowId] = ctrl;

    setRowJobs((prev) => ({
      ...prev,
      [rowId]: { status: "running", logs: [] },
    }));
    setExpandedLog(rowId);
    setExpandedReviu(null);

    try {
      const res = await fetch("/api/zi/check-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: id,
          rowId,
          ...(unit?.source !== 'app' && { sheetUrl: unit?.link, sheetName }),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error("Gagal memulai pemeriksaan");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "log") {
              setRowJobs((prev) => ({
                ...prev,
                [rowId]: {
                  ...prev[rowId],
                  logs: [
                    ...prev[rowId].logs,
                    { level: ev.level, message: ev.message },
                  ],
                },
              }));
            } else if (ev.type === "done") {
              setRowJobs((prev) => ({
                ...prev,
                [rowId]: { ...prev[rowId], status: "done" },
              }));
              // Update baris di table secara langsung
              if (ev.result) {
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === rowId
                      ? {
                          ...r,
                          verdict: ev.result.verdict,
                          verdictColor: ev.result.verdictColor,
                          reviu: ev.result.reviu,
                          status: "checked" as RowStatus,
                          tglCek: ev.result.tglCek,
                        }
                      : r,
                  ),
                );
              }
            } else if (ev.type === "error") {
              setRowJobs((prev) => ({
                ...prev,
                [rowId]: {
                  ...prev[rowId],
                  status: "error",
                  logs: [
                    ...prev[rowId].logs,
                    { level: "error", message: ev.message },
                  ],
                },
              }));
            }
          } catch {
            /* skip malformed line */
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setRowJobs((prev) => ({
          ...prev,
          [rowId]: {
            ...prev[rowId],
            status: "error",
            logs: [
              ...prev[rowId].logs,
              { level: "error", message: err.message },
            ],
          },
        }));
      }
    } finally {
      // Bebaskan slot dan proses antrian berikutnya
      activeChecksRef.current = Math.max(0, activeChecksRef.current - 1);
      const nextId = checkQueueRef.current.shift();
      if (nextId) startRowCheck(nextId);
    }
  }

  function stopRowCheck(rowId: string) {
    abortRefs.current[rowId]?.abort();
    setRowJobs((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], status: "error" },
    }));
    // Bebaskan slot saat check di-stop manual
    activeChecksRef.current = Math.max(0, activeChecksRef.current - 1);
    const nextId = checkQueueRef.current.shift();
    if (nextId) startRowCheck(nextId);
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
  const displayChecked = summary?.checked ?? unit?.checked_count ?? 0;
  const displayTotal = summary?.total ?? unit?.total_data ?? 0;

  // ── Error / Loading states ──
  if (unitError)
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={15} /> Kembali
        </Button>
        <Card className="border-rose-200 dark:border-rose-500/20">
          <CardContent className="p-6 text-center text-rose-500">
            {unitError}
          </CardContent>
        </Card>
      </div>
    );

  if (!unit)
    return (
      <div className="flex items-center justify-center py-32 text-default-400 gap-2 text-sm">
        <Loader2 size={16} className="animate-spin" /> Memuat data unit...
      </div>
    );

  const threshold = unit.target === "WBBM" ? 75 : 60;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.back()}
          className="mt-0.5 shrink-0"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground truncate">
              {unit.eselon2}
            </h1>
            <Badge variant={unit.target === "WBBM" ? "violet" : "info"}>
              {unit.target}
            </Badge>
            <Badge
              variant={
                unit.status === "Selesai"
                  ? "success"
                  : unit.status === "Sedang Dicek"
                    ? "warning"
                    : unit.status === "Perlu Revisi"
                      ? "destructive"
                      : "secondary"
              }
            >
              {unit.status}
            </Badge>
            {runningCount > 0 && (
              <Badge variant="warning" className="gap-1.5">
                <Loader2 size={10} className="animate-spin" />
                {runningCount} aktif
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-default-400">{unit.eselon1}</p>
            {unit.link && (
              <a
                href={unit.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <ExternalLink size={11} /> Buka Sheet
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/zona-integritas/lke-checker/${unit._id}/input`)}
          >
            <PencilLine size={13} />
            Input Jawaban
          </Button>
          {canSync && unit.source !== 'app' && (
            <Button
              variant="outline"
              size="sm"
              isLoading={loading}
              onClick={handleRefresh}
              title="Refresh dari sheet"
            >
              {!loading && <Sheet size={13} />}
              Sync ke Google Sheet
            </Button>
          )}
          {canSync && unit.source !== 'app' && (
            <Button
              variant="outline"
              size="sm"
              isLoading={syncing}
              disabled={syncing || loading}
              onClick={handleSync}
              title="Sinkron nilai & progress ke database"
            >
              {!syncing && <DatabaseBackup size={13} />}
              Sync ke Database
            </Button>
          )}
          <Button
            variant="success"
            size="sm"
            isLoading={exporting}
            disabled={exporting}
            onClick={handleExport}
          >
            {!exporting && <Download size={13} />}
            Export Excel
          </Button>
        </div>
      </div>

      {/* ── Progress card ── */}
      <Card className="border-default-200">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-xs text-default-500">
            <span>Progress Pengecekan</span>
            <span className="font-mono tabular-nums font-medium">
              {displayChecked} / {displayTotal || "?"}
            </span>
          </div>
          {(() => {
            const total = displayTotal;
            const pct   = total > 0 ? Math.round((displayChecked / total) * 100) : unit.progress_percent;
            return (
              <Progress
                value={pct}
                indicatorClassName={
                  pct >= 100
                    ? "bg-emerald-500"
                    : pct >= 60
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                }
              />
            );
          })()}
        </CardContent>
      </Card>

      {/* ── Nilai LKE collapsible ── */}
      {unit.nilai_lke_ai?.nilai_akhir != null && (
        <Card className="border-default-200 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-default-50 transition-colors"
            onClick={() => setNilaiOpen(!nilaiOpen)}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                Nilai LKE
              </span>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  unit.nilai_lke_ai.nilai_akhir >= threshold
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-500",
                )}
              >
                {unit.nilai_lke_ai.nilai_akhir.toFixed(2)}
              </span>
              <span className="text-xs text-default-400">
                / 100 (threshold {threshold})
              </span>
            </div>
            {nilaiOpen ? (
              <ChevronUp size={14} className="text-default-400" />
            ) : (
              <ChevronDown size={14} className="text-default-400" />
            )}
          </button>
          <AnimatePresence>
            {nilaiOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-default-200 p-5">
                  <NilaiLKETable
                    nilai={unit.nilai_lke_ai}
                    target={unit.target}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* ── Summary stats ── */}
      {summary && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {(
            [
              { label: "Total", value: summary.total, cls: "text-foreground" },
              {
                label: "✅ Sesuai",
                value: sesuai,
                cls: "text-emerald-600 dark:text-emerald-400",
              },
              {
                label: "⚠️ Sebagian",
                value: sebagian,
                cls: "text-amber-600 dark:text-amber-400",
              },
              { label: "❌ Tidak", value: tidak, cls: "text-rose-500" },
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
              {
                label: "Revisi",
                value: summary.revisi,
                cls: "text-blue-600 dark:text-blue-400",
              },
              {
                label: "Progress",
                value: `${summary.total > 0 ? Math.round((summary.checked / summary.total) * 100) : 0}%`,
                cls: "text-indigo-600 dark:text-indigo-400",
              },
            ] as const
          ).map((s) => (
            <Card key={s.label} className="border-default-200">
              <CardContent className="p-2.5 text-center">
                <p className={cn("text-lg font-bold tabular-nums", s.cls)}>
                  {s.value}
                </p>
                <p className="text-[10px] text-default-400 mt-0.5 leading-tight">
                  {s.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Error / initial loading ── */}
      {detailError && (
        <Card className="border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
            <XCircle size={14} className="shrink-0" /> {detailError}
          </CardContent>
        </Card>
      )}

      {loading && !summary && (
        <div className="flex items-center justify-center py-20 text-default-400 gap-2 text-sm">
          <Loader2 size={16} className="animate-spin" /> Memuat data dari
          sheet...
        </div>
      )}

      {/* ── Main table section ── */}
      {summary && (
        <Card className="border-default-200">
          <CardHeader className="pb-3">
            <div className="space-y-3">
              {/* Tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {TABS.map((t) => {
                  const count = tabCount(t.key);
                  const isActive = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-default-100 text-default-600 hover:bg-default-200",
                      )}
                    >
                      {t.label}
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                          isActive ? "bg-white/20" : "bg-default-200",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search + sheet name */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-default-400"
                  />
                  <input
                    type="text"
                    placeholder="Cari ID atau narasi..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(
                      "w-full h-8 pl-8 pr-3 text-xs rounded-lg transition-colors",
                      "border border-default-200 bg-default-50 hover:bg-background",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-foreground placeholder:text-default-400",
                    )}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Nama tab sheet"
                    className={cn(
                      "h-8 px-3 text-xs rounded-lg w-32 transition-colors",
                      "border border-default-200 bg-default-50 hover:bg-background",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-foreground placeholder:text-default-400",
                    )}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => loadDetail(sheetName)}
                  >
                    Reload
                  </Button>
                  <Button
                    variant="warning"
                    size="sm"
                    isLoading={bulkResolving}
                    disabled={bulkResolving || rows.filter((r) => r.rawLink && !r.link).length <= 10}
                    onClick={handleBulkResolve}
                    title={
                      rows.filter((r) => r.rawLink && !r.link).length <= 10
                        ? "Bulk resolve hanya tersedia jika short URL > 10 item"
                        : `Resolve ${rows.filter((r) => r.rawLink && !r.link).length} short URL`
                    }
                  >
                    {!bulkResolving && "Resolve URL"}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Narasi Unit</TableHead>
                  <TableHead className="w-32">Hasil AI</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24">Tgl Cek</TableHead>
                  <TableHead className="w-10 text-center">Link</TableHead>
                  <TableHead className="w-28 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-14 text-center text-default-400 text-sm"
                    >
                      Tidak ada data untuk filter ini
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, idx) => {
                    const statusCfg = STATUS_CONFIG[row.status];
                    const job = rowJobs[row.id];
                    const isLogOpen = expandedLog === row.id;
                    const isRevOpen = expandedReviu === row.id;
                    const canCheck = row.status !== "no_link";

                    return (
                      <Fragment key={`${row.id}-${idx}`}>
                        {/* ── Main row ── */}
                        <TableRow
                          className={cn(
                            isLogOpen || isRevOpen
                              ? "bg-default-50 dark:bg-default-50/5"
                              : "",
                            job?.status === "running"
                              ? "bg-indigo-50/50 dark:bg-indigo-950/20"
                              : job?.status === "done"
                                ? "bg-emerald-50/30 dark:bg-emerald-950/10"
                                : job?.status === "error"
                                  ? "bg-rose-50/30 dark:bg-rose-950/10"
                                  : "",
                          )}
                        >
                          {/* ID */}
                          <TableCell className="font-mono font-bold text-default-600 text-xs">
                            {row.id}
                          </TableCell>

                          {/* Narasi Unit */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <button
                                className={cn(
                                  "text-left text-xs text-foreground truncate max-w-[250px]",
                                  row.reviu && !job
                                    ? "cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                                    : "",
                                )}
                                title={row.bukti}
                                onClick={() => {
                                  if (!row.reviu || job) return;
                                  setExpandedReviu(isRevOpen ? null : row.id);
                                  setExpandedLog(null);
                                }}
                              >
                                {row.bukti || (
                                  <span className="text-default-300 italic">
                                    —
                                  </span>
                                )}
                              </button>
                              {row.reviu &&
                                !job &&
                                (isRevOpen ? (
                                  <ChevronUp
                                    size={10}
                                    className="text-default-400 shrink-0"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={10}
                                    className="text-default-400 shrink-0"
                                  />
                                ))}
                              {job && (
                                <button
                                  onClick={() =>
                                    setExpandedLog(isLogOpen ? null : row.id)
                                  }
                                  className="shrink-0"
                                >
                                  {isLogOpen ? (
                                    <ChevronUp
                                      size={10}
                                      className="text-indigo-400"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={10}
                                      className="text-indigo-400"
                                    />
                                  )}
                                </button>
                              )}
                            </div>
                          </TableCell>

                          {/* Hasil AI */}
                          <TableCell>
                            {job?.status === "running" ? (
                              <span className="flex items-center gap-1 text-[10px] text-indigo-500">
                                <Loader2 size={10} className="animate-spin" />{" "}
                                Mengecek...
                              </span>
                            ) : (
                              <VerdictBadge
                                color={row.verdictColor}
                                verdict={row.verdict}
                              />
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge
                              variant={statusCfg.badge}
                              className="gap-1 text-[10px]"
                            >
                              {row.status === "checked" && (
                                <CheckCircle2 size={9} />
                              )}
                              {row.status === "unchecked" && <Clock size={9} />}
                              {row.status === "no_link" && (
                                <Link2Off size={9} />
                              )}
                              {row.status === "revisi" && <RotateCw size={9} />}
                              {statusCfg.label}
                            </Badge>
                          </TableCell>

                          {/* Tgl Cek */}
                          <TableCell className="text-default-400 text-[10px] tabular-nums">
                            {row.tglCek || "—"}
                          </TableCell>

                          {/* Link */}
                          <TableCell className="text-center">
                            {row.link ? (
                              <a
                                href={row.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-500 hover:text-indigo-400 inline-flex justify-center"
                              >
                                <ExternalLink size={12} />
                              </a>
                            ) : row.rawLink ? (
                              <Button
                                size="sm"
                                variant="warning"
                                isLoading={resolvingIds.has(row.id)}
                                onClick={() => resolveUrl(row.id, row.rawLink!)}
                                className="h-5 min-w-0 px-2 text-[10px]"
                              >
                                {!resolvingIds.has(row.id) && "Resolve"}
                              </Button>
                            ) : (
                              <Link2Off
                                size={12}
                                className="text-default-300 inline"
                              />
                            )}
                          </TableCell>

                          {/* Aksi */}
                          <TableCell className="text-center">
                            {!canCheck ? (
                              <span className="text-[10px] text-default-300">
                                Tanpa link
                              </span>
                            ) : job?.status === "running" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-rose-500 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                onClick={() => stopRowCheck(row.id)}
                              >
                                <StopCircle size={10} /> Stop
                              </Button>
                            ) : (
                              <Button
                                variant={
                                  job?.status === "done"
                                    ? "outline"
                                    : "secondary"
                                }
                                size="sm"
                                className={cn(
                                  "h-6 px-2 text-[10px]",
                                  job?.status === "error" &&
                                    "border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400",
                                )}
                                onClick={() => startRowCheck(row.id)}
                              >
                                <Play size={9} />
                                {job?.status === "done"
                                  ? "Cek Ulang"
                                  : job?.status === "error"
                                    ? "Coba Lagi"
                                    : "Cek Visa"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* ── Log panel ── */}
                        {job && isLogOpen && (
                          <TableRow className="bg-default-50/80 dark:bg-default-100/5 hover:bg-default-50/80 dark:hover:bg-default-100/5">
                            <TableCell />
                            <TableCell colSpan={6} className="px-3 pb-3 pt-1">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p
                                    className={cn(
                                      "text-[10px] font-semibold uppercase tracking-wide",
                                      job.status === "running"
                                        ? "text-indigo-500"
                                        : job.status === "done"
                                          ? "text-emerald-500"
                                          : "text-rose-500",
                                    )}
                                  >
                                    {job.status === "running"
                                      ? "Sedang berjalan..."
                                      : job.status === "done"
                                        ? "Selesai ✓"
                                        : "Terhenti"}
                                  </p>
                                  <span className="text-[10px] text-default-400">
                                    {job.logs.length} log
                                  </span>
                                </div>
                                <RowLogPanel
                                  logs={job.logs}
                                  status={job.status}
                                />

                                {/* Reviu AI langsung di bawah log */}
                                {job.status === "done" && row.reviu && (
                                  <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-950/20 p-3">
                                    {/* Header */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/40">
                                        <Info
                                          size={12}
                                          className="text-indigo-500 dark:text-indigo-400"
                                        />
                                      </div>
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500/80 dark:text-indigo-400/80">
                                        Catatan Reviu AI
                                      </p>
                                    </div>

                                    {/* Content */}
                                    <ul className="space-y-1.5">
                                      {row.reviu.split("\n").map((line, i) => (
                                        <li
                                          key={i}
                                          className="text-[12px] text-default-600 dark:text-default-300 leading-snug flex gap-2"
                                        >
                                          <span className="mt-[5px] h-1 w-1 rounded-full bg-indigo-400/70 shrink-0" />
                                          <span>{line}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        {/* ── Reviu catatan ── */}
                        {!job && isRevOpen && row.reviu && (
                          <TableRow className="bg-transparent">
                            <TableCell />
                            <TableCell colSpan={6} className="px-4 pb-4 pt-0">
                              <div className="rounded-xl border border-default-200/60 dark:border-default-700/40 bg-white/70 dark:bg-default-900/30 backdrop-blur-sm p-4 space-y-3">
                                {/* Summary Highlight */}
                                {(() => {
                                  const parts = row.reviu.split("\n");
                                  const found = parts.find((p) =>
                                    p.toLowerCase().includes("file ditemukan"),
                                  );

                                  return (
                                    found && (
                                      <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 border border-emerald-200/60 dark:border-emerald-500/20">
                                        <span className="text-[12px] text-emerald-600 dark:text-emerald-400">
                                          {found.replace(/^\d+/, "").trim()}
                                        </span>
                                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-300">
                                          {found.match(/\d+/)?.[0]}
                                        </span>
                                      </div>
                                    )
                                  );
                                })()}

                                {/* Content */}
                                <ul className="space-y-2">
                                  {row.reviu.split("\n").map((line, i) => {
                                    const isWarning =
                                      line.toLowerCase().includes("kurang") ||
                                      line.toLowerCase().includes("tidak") ||
                                      line.toLowerCase().includes("belum");

                                    return (
                                      <li
                                        key={i}
                                        className={`flex gap-3 text-[13px] leading-snug ${
                                          isWarning
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-default-600 dark:text-default-300"
                                        }`}
                                      >
                                        <span
                                          className={`mt-[6px] h-1.5 w-1.5 rounded-full shrink-0 ${
                                            isWarning
                                              ? "bg-amber-500"
                                              : "bg-default-400/70"
                                          }`}
                                        />
                                        <span
                                          className={
                                            isWarning ? "font-medium" : ""
                                          }
                                        >
                                          {line}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <div className="px-4 py-2.5 border-t border-default-100 flex items-center justify-between">
              <span className="text-[10px] text-default-400">
                Menampilkan {filtered.length} dari {rows.length} data
              </span>
              {runningCount > 0 && (
                <span className="text-[10px] text-indigo-500 flex items-center gap-1">
                  <Loader2 size={9} className="animate-spin" />
                  {runningCount}/{MAX_CONCURRENT} berjalan
                  {checkQueueRef.current.length > 0 && (
                    <span className="text-default-400">
                      · {checkQueueRef.current.length} menunggu
                    </span>
                  )}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
