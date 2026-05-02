"use client";

import { useState, useCallback } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useEffect } from "react";
import { Chip } from "@heroui/chip";
import {
  RefreshCw,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Link2Off,
  Clock,
  RotateCw,
} from "lucide-react";
import type { LkeSubmission } from "@/types/zi";

type RowStatus = "checked" | "unchecked" | "no_link" | "revisi";
type VerdictColor = "HIJAU" | "KUNING" | "MERAH" | null;

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

const VERDICT_CONFIG: Record<string, { cls: string }> = {
  HIJAU: { cls: "bg-green-500/10 text-green-600 dark:text-green-400" },
  KUNING: { cls: "bg-amber-500/10 text-amber-600" },
  MERAH: { cls: "bg-red-500/10 text-red-500" },
};

type TabKey = "semua" | RowStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "unchecked", label: "Belum Dicek" },
  { key: "no_link", label: "Tanpa Link" },
  { key: "checked", label: "Sudah Dicek" },
  { key: "revisi", label: "Revisi" },
];

interface Props {
  unit: LkeSubmission | null;
  sheetName?: string;
  onClose: () => void;
}

export default function UnitDetailModal({
  unit,
  sheetName = "Jawaban",
  onClose,
}: Props) {
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [summary, setSummary] = useState<DetailSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("semua");
  const [search, setSearch] = useState("");

  const loadDetail = useCallback(async () => {
    if (!unit?.link) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/zi/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: unit.link, sheetName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat detail");
      setRows(data.rows);
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [unit, sheetName]);

  // Load saat modal dibuka
  const handleOpen = useCallback(() => {
    setRows([]);
    setSummary(null);
    setError(null);
    setActiveTab("semua");
    setSearch("");
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (unit) {
      handleOpen();
    }
  }, [unit, handleOpen]);

  const filtered = rows.filter((r) => {
    const matchTab = activeTab === "semua" || r.status === activeTab;
    const matchSearch =
      !search ||
      r.id.includes(search) ||
      r.bukti.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabCount = (key: TabKey) =>
    key === "semua" ? rows.length : rows.filter((r) => r.status === key).length;

  return (
    <Modal
      isOpen={!!unit}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">
              {unit?.eselon2}
            </p>
            <p className="text-xs font-normal text-default-400 mt-0.5 truncate">
              {unit?.eselon1}
            </p>
          </div>
          <Button
            size="sm"
            variant="flat"
            isIconOnly
            isLoading={loading}
            onPress={loadDetail}
            title="Refresh data"
          >
            {!loading && <RefreshCw size={13} />}
          </Button>
        </ModalHeader>

        <ModalBody className="pb-6 space-y-4">
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "Total", value: summary.total, cls: "" },
                {
                  label: "Sudah Dicek",
                  value: summary.checked,
                  cls: "text-green-600 dark:text-green-400",
                },
                {
                  label: "Belum Dicek",
                  value: summary.unchecked,
                  cls: "text-amber-500",
                },
                {
                  label: "Tanpa Link",
                  value: summary.noLink,
                  cls: "text-default-400",
                },
                {
                  label: "Revisi",
                  value: summary.revisi,
                  cls: "text-blue-500",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="text-center rounded-xl bg-default-50 dark:bg-default-100 p-2.5"
                >
                  <p className={`text-xl font-bold tabular-nums ${s.cls}`}>
                    {s.value}
                  </p>
                  <p className="text-[10px] text-default-500 mt-0.5">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 rounded-xl border border-red-200 dark:border-red-800 bg-red-500/5 px-3 py-2.5">
              <XCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {loading && !summary && (
            <div className="flex items-center justify-center py-16 text-default-400 text-sm gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Memuat data dari sheet...
            </div>
          )}

          {summary && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 flex-wrap">
                {TABS.map((t) => {
                  const count = tabCount(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeTab === t.key
                          ? "bg-primary text-white"
                          : "bg-default-100 text-default-600 hover:bg-default-200"
                      }`}
                    >
                      {t.label}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                          activeTab === t.key ? "bg-white/20" : "bg-default-200"
                        }`}
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
                placeholder="Cari ID atau narasi..."
                startContent={<Search size={13} className="text-default-400" />}
                value={search}
                onValueChange={setSearch}
                isClearable
                onClear={() => setSearch("")}
              />

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-default-200">
                <table className="w-full text-xs">
                  <thead className="bg-default-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-default-500 w-12">
                        ID
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-default-500">
                        Narasi Unit
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-default-500 w-24">
                        Status
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-default-500 w-28">
                        Hasil AI
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-default-500 w-24">
                        Tgl Cek
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-default-500 w-10">
                        Link
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-default-400"
                        >
                          Tidak ada data
                        </td>
                      </tr>
                    ) : (
                      filtered.map((row) => {
                        const statusCfg = STATUS_CONFIG[row.status];
                        const verdictCfg = row.verdictColor
                          ? VERDICT_CONFIG[row.verdictColor]
                          : null;
                        return (
                          <tr
                            key={row.id}
                            className="hover:bg-default-50 transition-colors"
                          >
                            <td className="py-2 px-3 font-mono font-bold text-default-700">
                              {row.id}
                            </td>
                            <td className="py-2 px-3">
                              <p
                                className="truncate max-w-[280px] text-default-700"
                                title={row.bukti}
                              >
                                {row.bukti || (
                                  <span className="text-default-300 italic">
                                    —
                                  </span>
                                )}
                              </p>
                              {row.reviu && (
                                <p
                                  className="text-[10px] text-default-400 truncate max-w-[280px] mt-0.5"
                                  title={row.reviu}
                                >
                                  {row.reviu}
                                </p>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`flex items-center gap-1 ${statusCfg.color}`}
                              >
                                {statusCfg.icon}
                                {statusCfg.label}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {verdictCfg ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${verdictCfg.cls}`}
                                >
                                  {row.verdict}
                                </span>
                              ) : (
                                <span className="text-default-300">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-default-400 tabular-nums text-[10px]">
                              {row.tglCek || "—"}
                            </td>
                            <td className="py-2 px-3">
                              {row.link ? (
                                <a
                                  href={row.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary-600 transition-colors"
                                  title="Buka folder Drive"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                <Link2Off
                                  size={12}
                                  className="text-default-300"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-default-400 text-right">
                Menampilkan {filtered.length} dari {rows.length} data
              </p>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
