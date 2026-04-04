"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Progress } from "@heroui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Play,
  Download,
  Mail,
  SkipForward,
  ExternalLink,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  TableProperties,
  RotateCw,
  FolderSync,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useZiStore } from "@/store/ziStore";
import { ZiProgressBar } from "@/components/ZiProgressBar";

interface SheetInfo {
  total: number;
  checked: number;
  unchecked: number;
  noLink: number;
  nextIds: string[];
  tabName: string;
  dataStart: number;
  colStatus: {
    reviu: { status: string; col: number; letter: string; sample?: string | null };
    result: { status: string; col: number; letter: string; sample?: string | null };
  };
  suggested: {
    reviu: { col: number; letter: string };
    result: { col: number; letter: string };
  };
  needsColOverride: boolean;
}

interface LogEntry {
  level: "info" | "success" | "warn" | "error";
  message: string;
}
interface Summary {
  total: number;
  sesuai: number;
  sebagian: number;
  tidak: number;
}

const LOG_ICON: Record<string, JSX.Element> = {
  success: <CheckCircle2 size={11} className="text-green-500 shrink-0 mt-0.5" />,
  warn:    <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />,
  error:   <XCircle size={11} className="text-red-500 shrink-0 mt-0.5" />,
  info:    <Info size={11} className="text-default-400 shrink-0 mt-0.5" />,
};
const LOG_CLS: Record<string, string> = {
  success: "text-green-600 dark:text-green-400",
  warn:    "text-amber-600 dark:text-amber-400",
  error:   "text-red-500",
  info:    "text-default-500",
};

const COL_READ = [
  { col: "A", name: "ID (LKE)",   note: "Nomor urut" },
  { col: "M", name: "Bukti Data", note: "Nama file" },
  { col: "N", name: "Link Drive", note: "URL folder" },
];
const COL_WRITE = [
  { col: "E", name: "Result Visa",        note: "Hasil pemeriksaan Visa AI" },
  { col: "F", name: "Reviu Visa",         note: "Detail catatan dari Visa" },
  { col: "G", name: "Status Supervisi", note: "Otomatis: Sudah Dicek Visa — ubah ke Revisi untuk cek ulang" },
];

function ColStatusBadge({ status }: { status: string }) {
  const MAP: Record<string, JSX.Element> = {
    not_exist:     <span className="text-xs px-1.5 py-0.5 rounded bg-default-100 text-default-500">Belum ada</span>,
    empty:         <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">Kosong ✓</span>,
    has_ai_data:   <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">Ada data AI ✓</span>,
    has_other_data:<span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">Ada data lain ⚠️</span>,
    mixed:         <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">Campuran ⚠️</span>,
  };
  return MAP[status] ?? null;
}

export default function AiCheckerTab() {
  const { submissions, fetchSubmissions, updateSubmission } = useZiStore();

  const [selectedId, setSelectedId] = useState("");
  const [sheetName, setSheetName]   = useState("Jawaban");
  const [checking, setChecking]     = useState(false);
  const [info, setInfo]             = useState<SheetInfo | null>(null);
  const [infoError, setInfoError]   = useState<string | null>(null);

  // Target edit state
  const [editingTarget, setEditingTarget] = useState(false);
  const [savingTarget, setSavingTarget]   = useState(false);
  const [targetError, setTargetError]     = useState<string | null>(null);

  // Step 2
  const [limit, setLimit]                       = useState("");
  const [startFromId, setStartFromId]           = useState("");
  const [email, setEmail]                       = useState("");
  const [checkContentChange, setCheckContentChange] = useState(false);
  const [colInfoOpen, setColInfoOpen]           = useState(false);

  // Run
  const [running, setRunning]   = useState(false);
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, revisiCount: 0 });
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const [done, setDone]         = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const logRef   = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (submissions.length === 0) fetchSubmissions();
  }, []);

  const selectedUnit = submissions.find((s) => s._id === selectedId) ?? null;
  const sheetUrl     = selectedUnit?.link ?? "";

  // Reset when unit changes
  useEffect(() => {
    setInfo(null);
    setInfoError(null);
    setEditingTarget(false);
    setTargetError(null);
  }, [selectedId]);

  async function handleCheckSheet() {
    if (!sheetUrl) return;
    setChecking(true);
    setInfoError(null);
    setInfo(null);
    try {
      const res  = await fetch("/api/zi/info", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sheetUrl, sheetName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membaca sheet");
      setInfo(data);
      setStartFromId(data.nextIds?.[0] ?? "");
    } catch (err: any) {
      setInfoError(err.message);
    } finally {
      setChecking(false);
    }
  }

  async function handleSaveTarget(newTarget: "WBK" | "WBBM") {
    if (!selectedId) return;
    setSavingTarget(true);
    setTargetError(null);
    try {
      await updateSubmission(selectedId, { target: newTarget });
      setEditingTarget(false);
    } catch (err: any) {
      setTargetError(err.message ?? "Gagal menyimpan");
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    setLogs([]);
    setSummary(null);
    setReportId(null);
    setDone(false);
    setRunError(null);
    setProgress({ current: 0, total: 0, revisiCount: 0 });

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/zi/check", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          submissionId: selectedId,
          sheetUrl,
          sheetName,
          limit,
          startFromId,
          email,
          checkContentChange,
        }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error("Gagal memulai proses");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "log") {
              setLogs((p) => [...p, { level: ev.level, message: ev.message }]);
              setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }), 50);
            } else if (ev.type === "progress") {
              setProgress((p) => ({ ...p, current: ev.current, total: ev.total }));
            } else if (ev.type === "total") {
              setProgress((p) => ({ ...p, total: ev.total, revisiCount: ev.revisiCount ?? 0 }));
            } else if (ev.type === "done") {
              setSummary(ev.summary);
              setReportId(ev.reportId);
              setDone(true);
              fetchSubmissions();
            } else if (ev.type === "error") {
              setRunError(ev.message);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") setRunError(err.message);
    } finally {
      setRunning(false);
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    setInfo(null);
    setLogs([]);
    setSummary(null);
    setDone(false);
    setRunError(null);
    setProgress({ current: 0, total: 0, revisiCount: 0 });
    setStartFromId("");
    setCheckContentChange(false);
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Struktur kolom ── */}
      <div className="rounded-xl border border-default-200 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-default-50 transition-colors"
          onClick={() => setColInfoOpen(!colInfoOpen)}
        >
          <span className="flex items-center gap-2 text-default-600">
            <TableProperties size={14} className="text-default-400" />
            Struktur Kolom LKE
          </span>
          <span className="flex items-center gap-2">
            {!colInfoOpen && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-default-400 font-normal">
                <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 font-mono">A M N</span>
                <span className="text-default-300">→</span>
                <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 font-mono">Visa Review</span>
              </span>
            )}
            {colInfoOpen ? <ChevronUp size={14} className="text-default-400" /> : <ChevronDown size={14} className="text-default-400" />}
          </span>
        </button>
        <AnimatePresence>
          {colInfoOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="border-t border-default-200">

                {/* Grid dua kolom */}
                <div className="grid grid-cols-2 divide-x divide-default-200">

                  {/* Kiri: Dibaca dari LKE */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                        Dibaca — Sheet LKE
                      </p>
                    </div>
                    <div className="space-y-2">
                      {COL_READ.map((c) => (
                        <div key={c.col} className="flex items-start gap-2.5">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 font-bold text-xs shrink-0 mt-0.5">
                            {c.col}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-default-700 leading-tight">{c.name}</p>
                            <p className="text-[11px] text-default-400 mt-0.5">{c.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kanan: Ditulis ke Visa Review */}
                  <div className="p-4 space-y-3 bg-violet-500/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                        Ditulis — Sheet Visa Review
                      </p>
                    </div>
                    <div className="space-y-2">
                      {COL_WRITE.map((c) => (
                        <div key={c.col} className="flex items-start gap-2.5">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-400 font-bold text-xs shrink-0 mt-0.5">
                            {c.col}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-default-700 leading-tight">{c.name}</p>
                            <p className="text-[11px] text-default-400 mt-0.5">{c.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-default-100 bg-default-50 flex items-center gap-2 text-[11px] text-default-500">
                  <Info size={11} className="shrink-0 text-default-400" />
                  <span>Sheet LKE <strong className="text-default-600">tidak diubah</strong>. Sheet <strong className="text-violet-600">Visa Review</strong> dibuat otomatis jika belum ada.</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── STEP 1: Pilih Unit ── */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-default-500">
          Langkah 1 — Pilih Unit
        </p>

        <Select
          size="sm"
          placeholder="Pilih unit kerja…"
          selectedKeys={selectedId ? [selectedId] : []}
          onSelectionChange={(k) => setSelectedId(([...k][0] as string) ?? "")}
          isDisabled={running}
        >
          {submissions.map((s) => (
            <SelectItem key={s._id} textValue={s.eselon2}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm truncate">{s.eselon2}</p>
                  <p className="text-xs text-default-400 truncate">{s.eselon1}</p>
                </div>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${s.target === 'WBBM' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                  {s.target}
                </span>
              </div>
            </SelectItem>
          ))}
        </Select>

        {/* Unit info card */}
        <AnimatePresence>
          {selectedUnit && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border border-default-200 overflow-hidden"
            >
              {/* Unit header */}
              <div className="px-4 py-3 bg-default-50 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{selectedUnit.eselon2}</p>
                  <p className="text-xs text-default-400 mt-0.5 truncate">{selectedUnit.eselon1}</p>
                </div>
                <a
                  href={selectedUnit.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                >
                  <ExternalLink size={11} />
                  Sheet
                </a>
              </div>

              {/* Stats row */}
              <div className="px-4 py-3 space-y-3 divide-y divide-default-100">
                {/* Target + edit */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-default-500">Target Predikat</span>
                  <div className="flex items-center gap-2">
                    {editingTarget ? (
                      <div className="flex items-center gap-1.5">
                        {(["WBK", "WBBM"] as const).map((t) => (
                          <button
                            key={t}
                            disabled={savingTarget}
                            onClick={() => handleSaveTarget(t)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                              selectedUnit.target === t
                                ? t === "WBBM"
                                  ? "bg-amber-500 text-white border-amber-500"
                                  : "bg-blue-500 text-white border-blue-500"
                                : "border-default-300 hover:border-primary hover:text-primary"
                            }`}
                          >
                            {savingTarget && selectedUnit.target !== t ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : t}
                          </button>
                        ))}
                        <button
                          onClick={() => { setEditingTarget(false); setTargetError(null); }}
                          className="p-1 rounded hover:bg-default-100 text-default-400"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                          selectedUnit.target === "WBBM"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}>
                          {selectedUnit.target}
                        </span>
                        <button
                          onClick={() => setEditingTarget(true)}
                          className="p-1 rounded hover:bg-default-100 text-default-400 hover:text-default-600 transition-colors"
                          title="Ubah target"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {targetError && (
                  <p className="text-[10px] text-red-500 pt-1">{targetError}</p>
                )}

                {/* Progress */}
                <div className="pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-default-500">
                    <span>Progress AI Checker</span>
                    <span className="tabular-nums font-mono">{selectedUnit.checked_count} / {selectedUnit.total_data || "?"}</span>
                  </div>
                  <ZiProgressBar value={selectedUnit.progress_percent} size="sm" />
                </div>

                {/* Sheet tab + Cek button */}
                <div className="pt-3 flex gap-2 items-end">
                  <Input
                    size="sm"
                    label="Nama tab sheet"
                    placeholder="Jawaban"
                    value={sheetName}
                    onValueChange={setSheetName}
                    isDisabled={running}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={handleCheckSheet}
                    isDisabled={checking || running}
                    isLoading={checking}
                    startContent={!checking && <Search size={13} />}
                  >
                    {checking ? "Mengecek…" : "Cek Sheet"}
                  </Button>
                </div>

                {infoError && (
                  <p className="text-xs text-red-500 flex items-center gap-1.5 pt-1">
                    <XCircle size={12} /> {infoError}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No unit selected hint */}
        {!selectedUnit && (
          <p className="text-xs text-default-400 text-center py-4">
            Pilih unit kerja di atas untuk untuk diperiksa oleh Visa - AI
          </p>
        )}

        {/* Sheet Info */}
        <AnimatePresence>
          {info && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-default-200 p-4 space-y-3"
            >
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold tabular-nums">{info.total}</p>
                  <p className="text-xs text-default-500">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">{info.checked}</p>
                  <p className="text-xs text-default-500">Dicek</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-amber-500">{info.unchecked}</p>
                  <p className="text-xs text-default-500">Belum</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-default-400">{info.noLink ?? 0}</p>
                  <p className="text-xs text-default-500">Tanpa Link</p>
                </div>
              </div>

              {info.total > 0 && (
                <div className="space-y-1">
                  <Progress
                    value={(info.checked / info.total) * 100}
                    color={info.checked === info.total ? "success" : "primary"}
                    size="sm"
                  />
                  <p className="text-xs text-default-400 text-right">
                    {Math.round((info.checked / info.total) * 100)}% selesai
                  </p>
                </div>
              )}

              {info.nextIds.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-default-500">ID berikutnya:</span>
                  {info.nextIds.map((id) => (
                    <span key={id} className="text-xs font-mono bg-default-100 px-1.5 py-0.5 rounded">{id}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs bg-violet-500/5 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2">
                <CheckCircle2 size={12} className="text-violet-500 shrink-0" />
                <span className="text-violet-600 dark:text-violet-400">
                  Output AI ditulis ke sheet <strong>Visa review</strong> — kolom LKE tidak diubah
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── STEP 2: Konfigurasi & Run ── */}
      <AnimatePresence>
        {info && !done && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-default-500">
              Langkah 2 — Konfigurasi & Jalankan
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Input
                size="sm"
                label="Jumlah data (kosong = semua)"
                placeholder="mis. 50"
                value={limit}
                onValueChange={setLimit}
                startContent={<FileSpreadsheet size={12} className="text-default-400" />}
              />
              <Input
                size="sm"
                label="Mulai dari ID"
                placeholder="mis. 1"
                value={startFromId}
                onValueChange={setStartFromId}
                startContent={<SkipForward size={12} className="text-default-400" />}
                description={
                  info.nextIds?.[0]
                    ? "Auto-filled: ID pertama belum dicek"
                    : info.checked >= info.total
                      ? "Semua sudah dicek"
                      : undefined
                }
              />
            </div>

            <Input
              size="sm"
              label="Email laporan (opsional)"
              placeholder="email@esdm.go.id"
              value={email}
              onValueChange={setEmail}
              startContent={<Mail size={12} className="text-default-400" />}
            />

            <label aria-label="Deteksi perubahan konten folder" className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-default-200 px-3 py-2.5 hover:bg-default-50 transition-colors" htmlFor="check-content-change">
              <input
                id="check-content-change"
                type="checkbox"
                className="w-4 h-4 accent-violet-500"
                checked={checkContentChange}
                onChange={(e) => setCheckContentChange(e.target.checked)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <FolderSync size={12} className="text-violet-500 shrink-0" />
                  Deteksi perubahan konten folder
                </p>
                <p className="text-xs text-default-400 mt-0.5">
                  Cek ulang baris yang linknya sama tapi isi foldernya berubah. Membutuhkan waktu lebih lama.
                </p>
              </div>
            </label>

            <div className="flex items-start gap-2 text-xs text-violet-600 dark:text-violet-400 bg-violet-500/5 border border-violet-200 dark:border-violet-800 rounded-lg p-3">
              <Info size={12} className="shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p>Hasil AI ditulis ke sheet <strong>Visa review</strong> di spreadsheet yang sama — kolom LKE asli tidak diubah.</p>
                <p className="flex items-center gap-1">
                  <RotateCw size={10} className="shrink-0" />
                  Ubah kolom <strong>G (Status Supervisi)</strong> ke <strong>Revisi</strong> untuk meminta AI mengecek ulang baris tersebut.
                </p>
              </div>
            </div>

            <Button
              fullWidth
              color="primary"
              isDisabled={running}
              isLoading={running}
              startContent={!running && <Play size={14} />}
              onPress={handleRun}
            >
              {running ? "Sedang Berjalan…" : "Mulai Pemeriksaan AI"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Progress & Log ── */}
      <AnimatePresence>
        {(running || logs.length > 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {progress.total > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-default-500">
                  <span className="flex items-center gap-2">
                    Progress
                    {progress.revisiCount > 0 && (
                      <span className="text-amber-500 font-medium">· {progress.revisiCount} cek ulang revisi</span>
                    )}
                  </span>
                  <span className="tabular-nums">{progress.current} / {progress.total}</span>
                </div>
                <Progress value={pct} color={done ? "success" : "primary"} size="sm" />
              </div>
            )}
            <div
              ref={logRef}
              className="h-52 overflow-y-auto rounded-xl bg-default-950 dark:bg-black p-3 space-y-1 font-mono text-xs border border-default-800"
            >
              {logs.map((l, i) => (
                <div key={i} className={`flex items-start gap-1.5 ${LOG_CLS[l.level]}`}>
                  {LOG_ICON[l.level]}
                  <span className="break-all">{l.message}</span>
                </div>
              ))}
              {running && (
                <div className="flex items-center gap-1.5 text-default-500">
                  <Loader2 size={11} className="animate-spin shrink-0" />
                  <span>memproses…</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Summary ── */}
      <AnimatePresence>
        {done && summary && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" /> Pemeriksaan Selesai
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total",       value: summary.total,    cls: "" },
                { label: "✅ Sesuai",   value: summary.sesuai,   cls: "text-green-600 dark:text-green-400" },
                { label: "⚠️ Sebagian", value: summary.sebagian, cls: "text-amber-500" },
                { label: "❌ Tidak",    value: summary.tidak,    cls: "text-red-500" },
              ].map((s) => (
                <div key={s.label} className="text-center rounded-xl bg-default-50 dark:bg-default-100 p-3">
                  <p className={`text-2xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                  <p className="text-xs text-default-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {reportId && (
                <Button
                  as="a"
                  href={`/api/zi/download?reportId=${reportId}`}
                  target="_blank"
                  size="sm"
                  variant="flat"
                  color="success"
                  startContent={<Download size={13} />}
                >
                  Unduh Laporan Excel
                </Button>
              )}
              <Button size="sm" variant="flat" startContent={<RotateCcw size={13} />} onPress={handleReset}>
                Cek Lagi
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {runError && (
        <div className="text-sm text-red-500 flex items-center gap-2">
          <XCircle size={14} /> {runError}
        </div>
      )}
    </div>
  );
}
