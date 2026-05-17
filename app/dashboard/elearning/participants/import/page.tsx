"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Lock,
  ArrowLeft,
  FileWarning,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";

type ImportResultRow = {
  row: number;
  status: "inserted" | "updated" | "skipped" | "error";
  nip?: string;
  message?: string;
};

type ImportSummary = {
  totalRows: number;
  inserted?: number;
  updated?: number;
  willInsertOrUpdate?: number;
  errors: number;
  duplicates: number;
};

type ImportResponse = {
  success: boolean;
  dryRun: boolean;
  summary?: ImportSummary;
  results?: ImportResultRow[];
  message?: string;
};

const STATUS_CHIP: Record<
  ImportResultRow["status"],
  { color: "success" | "primary" | "warning" | "danger"; label: string }
> = {
  inserted: { color: "success", label: "Baru" },
  updated: { color: "primary", label: "Diupdate" },
  skipped: { color: "warning", label: "Duplikat" },
  error: { color: "danger", label: "Error" },
};

export default function ImportParticipantsPage() {
  const router = useRouter();
  const { role, isLoggedIn } = useAuthStore();
  const canManage = hasPermission(role, "elearning:participants:manage");

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoggedIn) router.push("/login");
  }, [isLoggedIn, router]);

  const handleDownloadTemplate = () => {
    window.open("/api/elearning/participants/template", "_blank");
  };

  const handleFileSelect = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const submit = async (dryRun: boolean) => {
    if (!file) {
      setError("Pilih file Excel terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("dryRun", dryRun ? "true" : "false");
      const res = await axios.post<ImportResponse>(
        "/api/elearning/participants/import",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (dryRun) {
        setPreview(res.data);
      } else {
        setResult(res.data);
        setPreview(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Terjadi kesalahan saat memproses file. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 px-6">
        <div className="max-w-md w-full rounded-3xl border border-red-500/30 bg-red-500/5 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 mx-auto mb-5 flex items-center justify-center">
            <Lock size={24} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-default-500 text-sm">
            Halaman ini hanya bisa diakses oleh Admin E-Learning atau yang lebih
            tinggi.
          </p>
        </div>
      </div>
    );
  }

  const displayed = result ?? preview;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-1">
            E-Learning · Peserta
          </p>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <FileSpreadsheet size={22} className="text-primary" />
            Import Peserta dari Excel
          </h1>
          <p className="text-sm text-default-500 mt-2">
            Tambah/update peserta e-learning secara batch via file Excel.
          </p>
        </div>
        <Button
          as={Link}
          href="/e-learning/tracker"
          variant="flat"
          startContent={<ArrowLeft size={16} />}
        >
          Kembali
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h2 className="text-base font-semibold">Langkah 1 — Download Template</h2>
          <p className="text-xs text-default-500">
            Pakai template ini supaya kolom & format sesuai. NIP harus 18 digit
            angka.
          </p>
        </CardHeader>
        <CardBody>
          <Button
            color="primary"
            variant="flat"
            startContent={<Download size={16} />}
            onPress={handleDownloadTemplate}
          >
            Download Template Excel
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h2 className="text-base font-semibold">Langkah 2 — Pilih File</h2>
          <p className="text-xs text-default-500">
            File harus .xlsx. Sheet pertama akan dibaca. Baris ke-1 = header.
          </p>
        </CardHeader>
        <CardBody>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelect(f);
            }}
            className={`flex flex-col items-center justify-center gap-2 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-default-200 hover:border-default-300"
            }`}
          >
            <Upload size={32} className="text-default-400" />
            {file ? (
              <>
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-default-400">
                  {(file.size / 1024).toFixed(1)} KB · Klik untuk ganti
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">
                  Klik atau drag-drop file Excel di sini
                </p>
                <p className="text-xs text-default-400">
                  Hanya format .xlsx
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h2 className="text-base font-semibold">Langkah 3 — Preview & Import</h2>
          <p className="text-xs text-default-500">
            Klik <strong>Preview</strong> dulu untuk cek validasi tanpa simpan.
            Setelah yakin, klik <strong>Import</strong>.
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button
              color="default"
              variant="flat"
              isDisabled={!file || loading}
              onPress={() => submit(true)}
              startContent={
                loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileWarning size={16} />
                )
              }
            >
              Preview (Dry Run)
            </Button>
            <Button
              color="primary"
              variant="shadow"
              isDisabled={!file || loading}
              onPress={() => submit(false)}
              startContent={
                loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )
              }
            >
              {loading ? "Memproses..." : "Import ke Database"}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-500/10 text-red-600 border border-red-500/20">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-green-500/10 text-green-600 border border-green-500/20">
              <CheckCircle size={16} />
              <span>
                Import berhasil. {result.summary?.inserted ?? 0} peserta baru,{" "}
                {result.summary?.updated ?? 0} peserta diupdate.
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      {displayed?.summary && (
        <Card>
          <CardHeader className="flex flex-col items-start gap-1">
            <h2 className="text-base font-semibold">
              {result ? "Hasil Import" : "Hasil Preview"}
            </h2>
            <p className="text-xs text-default-500">
              {result
                ? "Data sudah tersimpan ke database."
                : "Belum tersimpan. Ini hanya simulasi validasi."}
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryStat
                label="Total Baris"
                value={displayed.summary.totalRows}
              />
              <SummaryStat
                label={result ? "Baru" : "Akan Diproses"}
                value={
                  result
                    ? (displayed.summary.inserted ?? 0)
                    : (displayed.summary.willInsertOrUpdate ?? 0)
                }
                color="text-green-600"
              />
              {result && (
                <SummaryStat
                  label="Diupdate"
                  value={displayed.summary.updated ?? 0}
                  color="text-blue-600"
                />
              )}
              <SummaryStat
                label="Duplikat"
                value={displayed.summary.duplicates}
                color="text-amber-600"
              />
              <SummaryStat
                label="Error"
                value={displayed.summary.errors}
                color="text-red-600"
              />
            </div>

            {displayed.results && displayed.results.length > 0 && (
              <div className="overflow-x-auto">
                <Table aria-label="Detail hasil import">
                  <TableHeader>
                    <TableColumn>Baris</TableColumn>
                    <TableColumn>NIP</TableColumn>
                    <TableColumn>Status</TableColumn>
                    <TableColumn>Keterangan</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {displayed.results.map((r, i) => {
                      const cfg = STATUS_CHIP[r.status];
                      return (
                        <TableRow key={`${r.row}-${i}`}>
                          <TableCell>{r.row}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.nip || "—"}
                          </TableCell>
                          <TableCell>
                            <Chip color={cfg.color} size="sm" variant="flat">
                              {cfg.label}
                            </Chip>
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.message || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-default-200 bg-background p-4">
      <p className="text-xs text-default-400 uppercase tracking-widest font-semibold">
        {label}
      </p>
      <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
    </div>
  );
}
