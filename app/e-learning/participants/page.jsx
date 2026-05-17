"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import {
  Input,
  Select,
  SelectItem,
  Button,
  Chip,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {
  FileText,
  Download,
  ShieldCheck,
  ShieldX,
  RotateCcw,
  Search,
  Users,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  X,
  AlertTriangle,
  CalendarRange,
} from "lucide-react";
import { ParticipantsSkeleton } from "./_components/ParticipantsSkeleton";
import { getAllParticipants } from "@/service/peserta.service";
import axios from "axios";
import {
  getPresignedUrlFromBackend,
  getPresignedUrlFromBackendForDownload,
} from "@/service/aws/predesignUrl.service";
import { hasPermission } from "@/lib/permissions";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarColorFromName(name = "") {
  const colors = [
    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

const STATUS_META = {
  Belum: {
    label: "Belum",
    chipColor: "danger",
    icon: Clock,
  },
  Sudah: {
    label: "Sudah",
    chipColor: "success",
    icon: CheckCircle2,
  },
  Diverifikasi: {
    label: "Diverifikasi",
    chipColor: "secondary",
    icon: ShieldCheck,
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, label, value, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-2xl border border-default-200/60 bg-background px-4 py-3 flex-1 min-w-[140px]"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}18` }}
      >
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-default-400">
          {label}
        </p>
        <p className="text-lg font-black tabular-nums leading-tight">{value}</p>
      </div>
    </motion.div>
  );
}

function NamaCell({ nama, jabatan }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${avatarColorFromName(nama)}`}
      >
        {getInitials(nama) || "?"}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{nama}</p>
        {jabatan && (
          <p className="text-xs text-default-400 truncate">{jabatan}</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Belum;
  const Icon = meta.icon;
  return (
    <Chip
      size="sm"
      variant="flat"
      color={meta.chipColor}
      startContent={<Icon size={12} className="ml-1" />}
      classNames={{
        base: "h-6",
        content: "text-[11px] font-semibold px-1",
      }}
    >
      {meta.label}
    </Chip>
  );
}

function ActionIconButton({ tooltip, icon: Icon, color = "default", onPress, isDisabled, isLoading }) {
  return (
    <Tooltip content={tooltip} size="sm" placement="top">
      <Button
        isIconOnly
        size="sm"
        variant="flat"
        color={color}
        onPress={onPress}
        isDisabled={isDisabled}
        isLoading={isLoading}
        className="h-8 w-8 min-w-8"
      >
        {!isLoading && <Icon size={14} />}
      </Button>
    </Tooltip>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────

export default function ParticipantListPage() {
  return (
    <Suspense fallback={<ParticipantsSkeleton />}>
      <ParticipantList />
    </Suspense>
  );
}

function ParticipantList() {
  const searchParams = useSearchParams();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isPrivileged, setIsPrivileged] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnit, setFilterUnit] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Cohort filters (master scope)
  const [selectedTahun, setSelectedTahun] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [cohorts, setCohorts] = useState({ tahun: [], byTahun: {} });
  const [defaultCohort, setDefaultCohort] = useState({
    tahun: null,
    batch: null,
  });
  const [cohortInitialized, setCohortInitialized] = useState(false);

  // Reset confirmation modal
  const resetModal = useDisclosure();
  const [pendingReset, setPendingReset] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await axios.get("/api/auth/me");
        const role = response.data.role;
        setIsPrivileged(
          response.data.success && hasPermission(role, "elearning:participants")
        );
        setCanManage(
          response.data.success &&
            hasPermission(role, "elearning:participants:manage")
        );
      } catch {
        setIsPrivileged(false);
        setCanManage(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getAllParticipants();
        setParticipants(res || []);
      } catch (err) {
        console.error("Error memuat data:", err);
        setError("Gagal memuat data peserta");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch cohorts list + settings, set default cohort on first load.
  // URL params (?unit=, ?tahun=, ?batch=, ?status=) override defaults.
  useEffect(() => {
    (async () => {
      try {
        const [cohortRes, settingsRes] = await Promise.all([
          axios.get("/api/elearning/cohorts"),
          axios.get("/api/elearning/settings"),
        ]);
        const c = cohortRes.data?.data ?? { tahun: [], byTahun: {} };
        setCohorts(c);

        const settings = settingsRes.data?.data;
        const tAktif = settings?.tahunAktif ?? null;
        const bAktif = (settings?.batchAktif ?? "").toString().trim() || null;
        setDefaultCohort({ tahun: tAktif, batch: bAktif });

        // URL params take precedence over settings defaults
        const urlTahun = searchParams.get("tahun");
        const urlBatch = searchParams.get("batch");
        const urlUnit = searchParams.get("unit");
        const urlStatus = searchParams.get("status");

        if (urlTahun) {
          setSelectedTahun(urlTahun);
        } else if (tAktif) {
          setSelectedTahun(String(tAktif));
        }

        if (urlBatch) {
          setSelectedBatch(urlBatch);
        } else if (bAktif) {
          setSelectedBatch(bAktif);
        }

        if (urlUnit) setFilterUnit(urlUnit);
        if (urlStatus) setFilterStatus(urlStatus);

        setCohortInitialized(true);
      } catch (err) {
        console.error("Gagal memuat cohorts/settings:", err);
        setCohortInitialized(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterUnit,
    filterStatus,
    selectedTahun,
    selectedBatch,
    itemsPerPage,
  ]);

  // ── Step 1: Filter by cohort first (master scope) ────────────────────
  const cohortScoped = useMemo(() => {
    return participants.filter((p) => {
      if (selectedTahun !== "all") {
        const tahunNum = parseInt(selectedTahun, 10);
        if (!isNaN(tahunNum) && p.tahun !== tahunNum) return false;
      }
      if (selectedBatch !== "all") {
        if ((p.batch ?? "").toString() !== selectedBatch) return false;
      }
      return true;
    });
  }, [participants, selectedTahun, selectedBatch]);

  // ── Step 2: Apply other filters within cohort scope ──────────────────
  const filteredParticipants = useMemo(() => {
    return cohortScoped.filter((p) => {
      if (!isPrivileged && p.statusCourse === "Belum") return false;

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        p.nama?.toLowerCase().includes(searchLower) ||
        p.nip?.includes(searchLower);
      const matchesUnit =
        filterUnit === "All" || p.unit_eselon_i === filterUnit;
      const matchesStatus =
        filterStatus === "All" || p.statusCourse === filterStatus;

      return matchesSearch && matchesUnit && matchesStatus;
    });
  }, [cohortScoped, searchTerm, filterUnit, filterStatus, isPrivileged]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredParticipants.length / itemsPerPage)
  );
  const paginatedData = filteredParticipants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats reflect cohort scope (so admin sees stats for selected cohort)
  const stats = useMemo(() => {
    const total = cohortScoped.length;
    const sudah = cohortScoped.filter((p) => p.statusCourse === "Sudah").length;
    const diverifikasi = cohortScoped.filter(
      (p) => p.statusCourse === "Diverifikasi"
    ).length;
    const belum = total - sudah - diverifikasi;
    return { total, sudah, diverifikasi, belum };
  }, [cohortScoped]);

  // Unit options scoped to current cohort
  const uniqueUnits = useMemo(() => {
    return [
      "All",
      ...new Set(cohortScoped.map((p) => p.unit_eselon_i)),
    ].filter(Boolean);
  }, [cohortScoped]);

  const availableBatches =
    selectedTahun !== "all" && cohorts?.byTahun
      ? cohorts.byTahun[selectedTahun] || []
      : [];

  // ── Actions ────────────────────────────────────────────────────────────
  const handleViewPdf = async (s3_key) => {
    if (!s3_key) return;
    try {
      const url = await getPresignedUrlFromBackend(s3_key);
      if (url) window.open(url, "_blank");
    } catch (err) {
      alert(`Gagal membuka dokumen: ${err.message}`);
    }
  };

  const handleDownloadPdf = async (s3_key) => {
    if (!s3_key) return;
    try {
      const url = await getPresignedUrlFromBackendForDownload(s3_key);
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = s3_key.split("/").pop() || "dokumen.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert(`Gagal mengunduh dokumen: ${err.message}`);
    }
  };

  const handleToggleVerify = async (p) => {
    if (!p?._id) return;
    if (!p.s3_key && p.statusCourse !== "Diverifikasi") {
      alert("Peserta belum mengupload sertifikat.");
      return;
    }
    const isVerified = p.statusCourse === "Diverifikasi";
    const action = isVerified ? "membatalkan verifikasi" : "memverifikasi";
    if (!confirm(`Yakin ingin ${action} sertifikat ${p.nama}?`)) return;

    setVerifyingId(p._id);
    try {
      if (isVerified) {
        await axios.delete(`/api/elearning/participants/${p._id}/verify`);
      } else {
        await axios.post(`/api/elearning/participants/${p._id}/verify`, {});
      }
      setParticipants((list) =>
        list.map((row) =>
          row._id === p._id
            ? {
                ...row,
                statusCourse: isVerified ? "Sudah" : "Diverifikasi",
                verified_at: isVerified ? null : new Date().toISOString(),
              }
            : row
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Gagal memproses verifikasi.");
    } finally {
      setVerifyingId(null);
    }
  };

  const openResetModal = (p) => {
    if (!p?._id) return;
    if (!p.s3_key && p.statusCourse === "Belum") {
      alert("Peserta sudah dalam status 'Belum' — tidak ada yang perlu direset.");
      return;
    }
    setPendingReset(p);
    resetModal.onOpen();
  };

  const confirmReset = async () => {
    const p = pendingReset;
    if (!p) return;
    resetModal.onClose();
    setResettingId(p._id);
    try {
      const res = await axios.post(
        `/api/elearning/participants/${p._id}/reset`,
        { deleteFile: true }
      );
      const result = res.data?.data?.s3DeleteResult;
      setParticipants((list) =>
        list.map((row) =>
          row._id === p._id
            ? {
                ...row,
                statusCourse: "Belum",
                s3_key: undefined,
                uploaded_at: null,
                verified_at: null,
                verified_by: null,
              }
            : row
        )
      );
      if (result === "failed") {
        alert(
          "Status DB direset, tapi gagal hapus file di S3 (mungkin sudah tidak ada)."
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Gagal reset peserta.");
    } finally {
      setResettingId(null);
      setPendingReset(null);
    }
  };

  const handleExport = (scope = "all") => {
    const dataToExport =
      scope === "filtered" ? filteredParticipants : participants;
    if (dataToExport.length === 0) return alert("Tidak ada data untuk diekspor.");

    const worksheetData = dataToExport.map((p) => ({
      Nama: p.nama || "",
      NIP: p.nip || "",
      Jabatan: p.jabatan || "",
      "Unit Eselon I": p.unit_eselon_i || "",
      "Unit Eselon II": p.unit_eselon_ii || "",
      Batch: p.batch || "",
      Tahun: p.tahun || "",
      Status: p.statusCourse || "",
      "Tanggal Upload": p.uploaded_at || "",
      "Tanggal Dibuat (Data)": p.createdAt || "",
      "S3 Key": p.s3_key || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet["!cols"] = [
      { wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 35 }, { wch: 40 },
      { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 25 }, { wch: 60 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Peserta");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const prefix =
      scope === "filtered"
        ? "Peserta_Elearning_Filtered"
        : "Daftar_Lengkap_Peserta_Elearning";
    saveAs(blob, `${prefix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const defaultTahunStr = defaultCohort.tahun
    ? String(defaultCohort.tahun)
    : "all";
  const defaultBatchStr = defaultCohort.batch ?? "all";

  const cohortIsCustom =
    selectedTahun !== defaultTahunStr || selectedBatch !== defaultBatchStr;

  const hasActiveFilters =
    searchTerm.trim() ||
    filterUnit !== "All" ||
    filterStatus !== "All" ||
    cohortIsCustom;

  const clearFilters = () => {
    setSearchTerm("");
    setFilterUnit("All");
    setFilterStatus("All");
    setSelectedTahun(defaultTahunStr);
    setSelectedBatch(defaultBatchStr);
  };

  // Label deskriptif scope yang sedang aktif
  const cohortScopeLabel =
    selectedTahun === "all"
      ? "Semua Cohort"
      : `Batch ${selectedBatch === "all" ? "Semua" : selectedBatch} · ${selectedTahun}`;

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = useMemo(() => {
    const cols = [
      { key: "nama", label: "Peserta" },
      { key: "unit_eselon_i", label: "Unit Eselon I" },
      { key: "batch", label: "Batch" },
      { key: "statusCourse", label: "Status" },
    ];
    if (isPrivileged) {
      cols.splice(1, 0, { key: "nip", label: "NIP" });
      cols.push({ key: "aksi", label: "Aksi" });
    }
    return cols;
  }, [isPrivileged]);

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) return <ParticipantsSkeleton />;
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-red-500 text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-3"
      >
        <div>
          <p className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-1">
            E-Learning
          </p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {isPrivileged ? "Daftar Peserta" : "Peserta Sudah Upload"}
          </h1>
          <p className="text-sm text-default-500 mt-1">
            Cohort:{" "}
            <span className="font-semibold text-primary">
              {cohortScopeLabel}
            </span>
            <span className="text-default-300"> · </span>
            {isPrivileged
              ? `${cohortScoped.length} peserta`
              : `${filteredParticipants.length} dari ${cohortScoped.length} peserta`}
          </p>
        </div>

        {isPrivileged && (
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                color="primary"
                variant="shadow"
                startContent={<FileSpreadsheet size={16} />}
              >
                Export Excel
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Export options">
              <DropdownItem
                key="filtered"
                description="Hanya data sesuai filter aktif"
                onPress={() => handleExport("filtered")}
              >
                Export Hasil Filter
              </DropdownItem>
              <DropdownItem
                key="all"
                description="Seluruh data peserta"
                onPress={() => handleExport("all")}
              >
                Export Semua
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </motion.div>

      {/* ── Stat Pills (privileged) ───────────────────────────────── */}
      {isPrivileged && (
        <div className="flex flex-wrap gap-3">
          <StatPill
            icon={Users}
            label="Total"
            value={stats.total}
            accent="#3b82f6"
          />
          <StatPill
            icon={ShieldCheck}
            label="Diverifikasi"
            value={stats.diverifikasi}
            accent="#a855f7"
          />
          <StatPill
            icon={CheckCircle2}
            label="Sudah Upload"
            value={stats.sudah}
            accent="#22c55e"
          />
          <StatPill
            icon={Clock}
            label="Belum"
            value={stats.belum}
            accent="#f43f5e"
          />
        </div>
      )}

      {/* ── Cohort Master Filter ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.03 }}
        className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarRange size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5">
                Cohort Aktif
              </p>
              <p className="text-xs text-default-500 leading-relaxed">
                Pilih tahun & batch yang ingin ditampilkan. Filter lain
                (Status, Unit) bekerja dalam scope cohort ini.
              </p>
            </div>
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
              variant="bordered"
              className="min-w-[140px]"
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
              variant="bordered"
              className="min-w-[160px]"
            >
              <SelectItem key="all">Semua Batch</SelectItem>
              {availableBatches.map((b) => (
                <SelectItem key={b.batch}>{`Batch ${b.batch} (${b.count})`}</SelectItem>
              ))}
            </Select>
          </div>
        </div>
      </motion.div>

      {/* ── Filter & Search Card ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl border border-default-200/60 bg-background p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-default-400 uppercase tracking-widest flex items-center gap-1.5">
            <Filter size={11} />
            Filter & Pencarian
          </p>
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={clearFilters}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <X size={12} />
                Reset ke Default
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <Input
          placeholder="Cari berdasarkan nama atau NIP..."
          value={searchTerm}
          onValueChange={setSearchTerm}
          startContent={<Search size={14} className="text-default-400" />}
          isClearable
          onClear={() => setSearchTerm("")}
          variant="bordered"
          size="md"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <Select
            label="Unit Eselon I"
            size="sm"
            selectedKeys={[filterUnit]}
            onChange={(e) => setFilterUnit(e.target.value)}
            variant="bordered"
          >
            {uniqueUnits.map((unit) => (
              <SelectItem key={unit}>
                {unit === "All" ? "Semua Unit" : unit}
              </SelectItem>
            ))}
          </Select>

          {isPrivileged ? (
            <Select
              label="Status"
              size="sm"
              selectedKeys={[filterStatus]}
              onChange={(e) => setFilterStatus(e.target.value)}
              variant="bordered"
            >
              <SelectItem key="All">Semua Status</SelectItem>
              <SelectItem key="Diverifikasi">Diverifikasi</SelectItem>
              <SelectItem key="Sudah">Sudah Upload</SelectItem>
              <SelectItem key="Belum">Belum Upload</SelectItem>
            </Select>
          ) : (
            <div />
          )}

          <Select
            label="Tampilkan per halaman"
            size="sm"
            selectedKeys={[itemsPerPage.toString()]}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            variant="bordered"
          >
            <SelectItem key="10">10 baris</SelectItem>
            <SelectItem key="20">20 baris</SelectItem>
            <SelectItem key="50">50 baris</SelectItem>
            <SelectItem key="100">100 baris</SelectItem>
          </Select>
        </div>
      </motion.div>

      {/* ── Table Card ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl border border-default-200/60 bg-background overflow-hidden"
      >
        <Table
          aria-label="Daftar Peserta E-Learning"
          removeWrapper
          classNames={{
            th: "bg-default-50 dark:bg-default-100/5 text-default-500 text-[10px] font-bold uppercase tracking-widest",
            td: "py-3",
            tr: "border-b border-default-100 last:border-0 hover:bg-default-50/50 dark:hover:bg-default-100/5 transition-colors",
          }}
        >
          <TableHeader columns={columns}>
            {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
          </TableHeader>

          <TableBody
            emptyContent={
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-default-100 mx-auto mb-3 flex items-center justify-center">
                  <Search size={20} className="text-default-400" />
                </div>
                <p className="text-sm font-semibold text-default-500">
                  Tidak ada peserta yang cocok
                </p>
                <p className="text-xs text-default-400 mt-1">
                  Coba ubah filter atau kata kunci pencarian
                </p>
              </div>
            }
            items={paginatedData}
          >
            {(p) => (
              <TableRow key={p._id}>
                {(columnKey) => (
                  <TableCell>
                    {columnKey === "nama" && (
                      <NamaCell nama={p.nama} jabatan={isPrivileged ? p.jabatan : null} />
                    )}
                    {columnKey === "nip" && (
                      <span className="text-xs font-mono text-default-500">
                        {p.nip}
                      </span>
                    )}
                    {columnKey === "unit_eselon_i" && (
                      <Tooltip content={p.unit_eselon_i} placement="top">
                        <p className="text-xs text-default-700 line-clamp-1 max-w-[280px]">
                          {p.unit_eselon_i}
                        </p>
                      </Tooltip>
                    )}
                    {columnKey === "batch" && (
                      <span className="text-xs text-default-500 tabular-nums">
                        {p.batch || "—"}
                        {p.tahun ? ` · ${p.tahun}` : ""}
                      </span>
                    )}
                    {columnKey === "statusCourse" && (
                      <StatusBadge status={p.statusCourse} />
                    )}
                    {columnKey === "aksi" && (
                      <div className="flex items-center gap-1">
                        <ActionIconButton
                          tooltip="Lihat Sertifikat"
                          icon={FileText}
                          color="primary"
                          isDisabled={!p.s3_key}
                          onPress={() => handleViewPdf(p.s3_key)}
                        />
                        <ActionIconButton
                          tooltip="Unduh Sertifikat"
                          icon={Download}
                          color="secondary"
                          isDisabled={!p.s3_key}
                          onPress={() => handleDownloadPdf(p.s3_key)}
                        />
                        {canManage && p.s3_key && (
                          <ActionIconButton
                            tooltip={
                              p.statusCourse === "Diverifikasi"
                                ? "Batalkan Verifikasi"
                                : "Verifikasi"
                            }
                            icon={
                              p.statusCourse === "Diverifikasi"
                                ? ShieldX
                                : ShieldCheck
                            }
                            color={
                              p.statusCourse === "Diverifikasi"
                                ? "warning"
                                : "success"
                            }
                            isLoading={verifyingId === p._id}
                            onPress={() => handleToggleVerify(p)}
                          />
                        )}
                        {canManage && p.s3_key && (
                          <ActionIconButton
                            tooltip="Reset Upload"
                            icon={RotateCcw}
                            color="danger"
                            isLoading={resettingId === p._id}
                            onPress={() => openResetModal(p)}
                          />
                        )}
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredParticipants.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-default-100">
            <p className="text-xs text-default-500 tabular-nums">
              Menampilkan{" "}
              <span className="font-bold text-foreground">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>
              {" – "}
              <span className="font-bold text-foreground">
                {Math.min(currentPage * itemsPerPage, filteredParticipants.length)}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-foreground">
                {filteredParticipants.length}
              </span>{" "}
              peserta
            </p>
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                isDisabled={currentPage === 1}
                onPress={() => setCurrentPage((prev) => prev - 1)}
                className="h-8 w-8 min-w-8"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs font-semibold text-default-600 px-3 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                isDisabled={currentPage >= totalPages}
                onPress={() => setCurrentPage((prev) => prev + 1)}
                className="h-8 w-8 min-w-8"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Reset Confirmation Modal ─────────────────────────────── */}
      <Modal
        isOpen={resetModal.isOpen}
        onOpenChange={resetModal.onOpenChange}
        size="md"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="text-base font-bold">Reset Upload Sertifikat</p>
                  <p className="text-xs text-default-400 font-normal">
                    Tindakan ini tidak bisa di-undo
                  </p>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600 leading-relaxed">
                  Yakin ingin reset upload untuk{" "}
                  <strong>{pendingReset?.nama}</strong>?
                </p>
                <ul className="text-xs text-default-500 space-y-1.5 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-default-400 mt-1.5 shrink-0" />
                    Status diubah jadi <strong>"Belum"</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-default-400 mt-1.5 shrink-0" />
                    Data verifikasi dihapus
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-default-400 mt-1.5 shrink-0" />
                    File sertifikat di S3 ikut dihapus
                  </li>
                </ul>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Batal
                </Button>
                <Button
                  color="danger"
                  variant="shadow"
                  startContent={<RotateCcw size={14} />}
                  onPress={confirmReset}
                >
                  Ya, Reset Sekarang
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
