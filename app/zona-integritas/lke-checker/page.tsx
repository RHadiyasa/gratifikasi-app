"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tabs, Tab } from "@heroui/tabs";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Tooltip } from "@heroui/tooltip";
import {
  FilePlus2,
  List,
  RefreshCw,
  Trash2,
  GitCompare,
  X,
  CheckCircle2,
  Search,
  Bot,
  BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useZiStore } from "@/store/ziStore";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";
import { ESELON1_LIST, TARGET_THRESHOLD } from "@/types/zi";
import type { LkeSubmission } from "@/types/zi";
import { StatusBadge } from "@/components/StatusBadge";
import { TargetBadge } from "@/components/TargetBadge";
import { ZiProgressBar } from "@/components/ZiProgressBar";
import { SyncButton } from "@/components/SyncButton";
import { NilaiLKETable } from "@/components/NilaiLKETable";
import CompareView from "./_components/CompareView";
import AddSubmissionForm from "./_components/AddSubmissionForm";
import UnitDrawer from "./_components/UnitDrawer";
import AiCheckerTab from "./_components/AiCheckerTab";

export default function LkeCheckerPage() {
  const {
    submissions,
    summary,
    isLoading,
    syncingIds,
    selectedUnit,
    compareIds,
    filters,
    fetchSubmissions,
    deleteSubmission,
    syncSubmission,
    setSelectedUnit,
    toggleCompare,
    clearCompare,
    setFilters,
  } = useZiStore();
  const role = useAuthStore((s) => s.role);
  const canManageZi = hasPermission(role, "zi:manage");
  const canDeleteZi = hasPermission(role, "zi:delete");
  const canSyncZi = hasPermission(role, "zi:sync");
  const canRunAi = hasPermission(role, "zi:ai-checker");

  const router = useRouter();
  const [tab, setTab] = useState("daftar");
  const [showCompare, setShowCompare] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // debounce search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters({ search: searchInput });
    }, 400);
  }, [searchInput]);

  // Sort: units with nilai descending, units without nilai at the bottom
  const filtered = [...submissions].sort((a, b) => {
    const aVal = a.nilai_lke_ai?.nilai_akhir ?? null;
    const bVal = b.nilai_lke_ai?.nilai_akhir ?? null;
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    return bVal - aVal;
  });

  function handleDelete(id: string) {
    if (!confirm("Hapus unit ini? Data LKE akan dihapus permanen.")) return;
    deleteSubmission(id);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LKE Checker</h1>
          <p className="text-sm text-default-500 mt-0.5">
            Kelola dan pantau evaluasi LKE unit kerja
          </p>
        </div>
        {summary && (
          <div className="hidden md:flex items-center gap-4 text-sm text-default-500">
            <span>
              <strong className="text-foreground">{summary.total}</strong> unit
            </span>
            <span className="text-green-600 dark:text-green-400">
              <strong>{summary.selesai}</strong> selesai
            </span>
            <span className="text-amber-500">
              <strong>{summary.sedang}</strong> sedang dicek
            </span>
          </div>
        )}
      </div>

      <Tabs
        selectedKey={tab}
        onSelectionChange={(k) => setTab(String(k))}
        variant="underlined"
        color="primary"
      >
        {/* ── TAB: DAFTAR ── */}
        <Tab
          key="daftar"
          title={
            <span className="flex items-center gap-1.5">
              <List size={15} /> Daftar LKE
            </span>
          }
        >
          <div className="pt-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-xs"
                size="sm"
                placeholder="Cari unit / eselon…"
                startContent={<Search size={14} className="text-default-400" />}
                value={searchInput}
                onValueChange={setSearchInput}
                isClearable
                onClear={() => setSearchInput("")}
              />
              <Select
                className="w-44"
                size="sm"
                placeholder="Eselon I"
                selectedKeys={filters.eselon1 ? [filters.eselon1] : []}
                onSelectionChange={(k) =>
                  setFilters({ eselon1: ([...k][0] as string) ?? "" })
                }
              >
                {["", ...ESELON1_LIST].map((e) => (
                  <SelectItem key={e}>{e || "Semua Eselon I"}</SelectItem>
                ))}
              </Select>
              <Select
                className="w-36"
                size="sm"
                placeholder="Status"
                selectedKeys={filters.status ? [filters.status] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string | undefined;
                  setFilters({ status: value ?? "" });
                }}
              >
                {[
                  "",
                  "Belum Dicek",
                  "Sedang Dicek",
                  "Selesai",
                  "Perlu Revisi",
                ].map((s) => (
                  <SelectItem key={s}>{s || "Semua Status"}</SelectItem>
                ))}
              </Select>
              <Select
                className="w-32"
                size="sm"
                placeholder="Target"
                selectedKeys={filters.target ? [filters.target] : []}
                onSelectionChange={(k) =>
                  setFilters({ target: ([...k][0] as string) ?? "" })
                }
              >
                {["", "WBK", "WBBM"].map((t) => (
                  <SelectItem key={t}>{t || "Semua Target"}</SelectItem>
                ))}
              </Select>
              <Button
                size="sm"
                variant="flat"
                onPress={fetchSubmissions}
                isIconOnly
                aria-label="Refresh"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                />
              </Button>
            </div>

            {/* Compare hint */}
            {compareIds.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-default-500">
                <GitCompare size={13} />
                <span>{compareIds.length} unit dipilih untuk dibandingkan</span>
                <button
                  className="text-primary underline"
                  onClick={() => setShowCompare(true)}
                >
                  Buka Perbandingan
                </button>
                <button className="text-danger" onClick={clearCompare}>
                  Batal
                </button>
              </div>
            )}

            {/* Table */}
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-default-100 animate-pulse"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-default-400 text-sm">
                Belum ada data. Tambahkan LKE melalui tab Input.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-default-200">
                <table className="w-full text-sm">
                  <thead className="bg-default-50">
                    <tr>
                      <th className="text-left py-2.5 pl-4 pr-3 font-medium text-default-500 text-xs w-8"></th>
                      <th className="text-center py-2.5 px-2 font-medium text-default-500 text-xs w-10">
                        #
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs">
                        Unit Kerja
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-28">
                        Target
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-32">
                        Status
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-36">
                        Progress
                      </th>
                      <th className="text-right py-2.5 px-3 font-medium text-default-500 text-xs w-20">
                        Nilai
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-default-500 text-xs w-32">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default-100">
                    {filtered.map((sub) => {
                      const inCompare = compareIds.includes(sub._id);
                      const isSyncing = syncingIds.includes(sub._id);
                      const threshold = TARGET_THRESHOLD[sub.target];
                      const val = sub.nilai_lke_ai?.nilai_akhir ?? null;
                      const achieved = val !== null ? val >= threshold : undefined;

                      return (
                        <tr
                          key={sub._id}
                          className={`hover:bg-default-50 transition-colors cursor-pointer ${inCompare ? "bg-primary-50/40" : ""}`}
                          onClick={() => setSelectedUnit(sub)}
                        >
                          <td
                            className="py-2.5 pl-4 pr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip
                              content={
                                inCompare
                                  ? "Hapus dari perbandingan"
                                  : "Tambah ke perbandingan"
                              }
                            >
                              <button
                                className={`w-5 h-5 rounded border transition-colors ${inCompare ? "bg-primary border-primary text-white" : "border-default-300 hover:border-primary"}`}
                                onClick={() => toggleCompare(sub._id)}
                              >
                                {inCompare && (
                                  <CheckCircle2 size={11} className="m-auto" />
                                )}
                              </button>
                            </Tooltip>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {(filtered.indexOf(sub) + 1 <= filtered.length &&
                              sub.nilai_lke_ai?.nilai_akhir != null) ? (
                              <span className="text-xs font-bold text-default-400">
                                {filtered.indexOf(sub) + 1}
                              </span>
                            ) : (
                              <span className="text-default-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium truncate max-w-full">
                              {sub.eselon2}
                            </div>
                            <div className="text-xs text-default-400 truncate max-w-full">
                              {sub.eselon1}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <TargetBadge
                              target={sub.target}
                              tercapai={achieved}
                              showStatus={val !== null}
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={sub.status} />
                          </td>
                          <td className="py-2.5 px-3">
                            <ZiProgressBar
                              value={sub.progress_percent}
                              label={`${sub.checked_count}/${sub.total_data}`}
                              size="sm"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {val !== null ? (
                              <span
                                className={`font-bold ${val >= threshold ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
                              >
                                {val.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-default-300">—</span>
                            )}
                          </td>
                          <td
                            className="py-2.5 px-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <Tooltip content="Lihat detail progress">
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="primary"
                                  isIconOnly
                                  onPress={() => router.push(`/zona-integritas/lke-checker/${sub._id}`)}
                                >
                                  <BarChart2 size={13} />
                                </Button>
                              </Tooltip>
                              {canSyncZi && (
                                <SyncButton
                                  id={sub._id}
                                  syncing={isSyncing}
                                  onSync={syncSubmission}
                                />
                              )}
                              {canDeleteZi && (
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="danger"
                                  isIconOnly
                                  onPress={() => handleDelete(sub._id)}
                                >
                                  <Trash2 size={13} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Tab>

        {/* ── TAB: INPUT ── */}
        {canManageZi && (
          <Tab
            key="input"
            title={
              <span className="flex items-center gap-1.5">
                <FilePlus2 size={15} /> Input LKE
              </span>
            }
          >
            <div className="pt-4 max-w-2xl">
              <AddSubmissionForm onSuccess={() => setTab("daftar")} />
            </div>
          </Tab>
        )}

        {/* ── TAB: AI CHECKER ── */}
        {canRunAi && (
          <Tab
            key="ai-checker"
            title={
              <span className="flex items-center gap-1.5">
                <Bot size={15} /> AI Checker
              </span>
            }
          >
            <div className="pt-4">
              <AiCheckerTab />
            </div>
          </Tab>
        )}
      </Tabs>

      {/* Unit Drawer */}
      <UnitDrawer
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
        onSync={syncSubmission}
        syncingIds={syncingIds}
      />


      {/* Compare Modal */}
      <AnimatePresence>
        {showCompare && compareIds.length >= 2 && (
          <CompareView ids={compareIds} onClose={() => setShowCompare(false)} />
        )}
      </AnimatePresence>

      {/* Floating Compare Bar */}
      <AnimatePresence>
        {compareIds.length >= 2 && !showCompare && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-default-900 dark:bg-default-100 shadow-xl text-default-100 dark:text-default-900 text-sm">
              <GitCompare size={16} />
              <span>{compareIds.length} unit dipilih</span>
              <Button
                size="sm"
                color="primary"
                onPress={() => setShowCompare(true)}
              >
                Bandingkan
              </Button>
              <button
                onClick={clearCompare}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
