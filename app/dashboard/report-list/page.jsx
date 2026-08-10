"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import {
  Button,
  Input,
  Pagination,
  Select,
  SelectItem,
  Tooltip,
} from "@heroui/react";
import { Download, Eye, FileText, Search, X } from "lucide-react";

import useReportData from "@/hooks/useReportData";
import DashboardBreadcrumb from "../_components/DashboardBreadcumb";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  Chip,
  StatusChip,
  STATUS_OPTIONS,
} from "@/components/dashboard/StatusChip";
import { EmptyState, ErrorState } from "@/components/dashboard/States";
import { TableSkeleton, StatCardsSkeleton } from "@/components/dashboard/Skeletons";

const columns = [
  { key: "nama", label: "Pelapor" },
  { key: "reportType", label: "Jenis", hideMobile: true },
  { key: "status", label: "Status" },
  { key: "secretReport", label: "Kerahasiaan", hideMobile: true },
  { key: "tanggalLapor", label: "Tanggal Lapor", hideMobile: true },
  { key: "perkiraanNilai", label: "Nominal" },
  { key: "aksi", label: "" },
];

const rupiah = (nilai) =>
  Number.isFinite(Number(nilai))
    ? `Rp ${Number(nilai).toLocaleString("id-ID")}`
    : "—";

const tanggal = (nilai) => {
  if (!nilai) return "—";
  const d = new Date(nilai);

  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const ReportListPage = () => {
  const router = useRouter();
  const { data = [], loading, error, refresh } = useReportData();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterSecret, setFilterSecret] = useState("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const adaFilter =
    searchTerm !== "" ||
    filterStatus !== "All" ||
    filterType !== "All" ||
    filterSecret !== "All";

  const resetFilter = () => {
    setSearchTerm("");
    setFilterStatus("All");
    setFilterType("All");
    setFilterSecret("All");
    setCurrentPage(1);
  };

  // Setiap perubahan filter mengembalikan ke halaman 1. Dulu ini dilakukan
  // dengan setState di dalam useMemo (mengubah state saat render) — sekarang
  // cukup dibungkus di handler filternya.
  const ubahFilter = (setter) => (nilai) => {
    setter(nilai);
    setCurrentPage(1);
  };

  const filteredReports = useMemo(() => {
    const kunci = searchTerm.trim().toLowerCase();

    return data.filter((r) => {
      const cocokCari =
        !kunci ||
        r.nama?.toLowerCase().includes(kunci) ||
        r.nip?.includes(kunci) ||
        r.uniqueId?.toLowerCase().includes(kunci);

      const cocokStatus = filterStatus === "All" || r.status === filterStatus;
      const cocokJenis = filterType === "All" || r.reportType === filterType;
      const cocokRahasia =
        filterSecret === "All" ||
        (filterSecret === "Yes" && r.secretReport === true) ||
        (filterSecret === "No" && r.secretReport !== true);

      return cocokCari && cocokStatus && cocokJenis && cocokRahasia;
    });
  }, [data, searchTerm, filterStatus, filterType, filterSecret]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const halamanAman = Math.min(currentPage, totalPages);
  const paginatedData = filteredReports.slice(
    (halamanAman - 1) * itemsPerPage,
    halamanAman * itemsPerPage
  );

  const ringkasan = useMemo(() => {
    const hitung = (status) =>
      data.filter((r) => r.status === status).length;

    return [
      { label: "Total Laporan", value: data.length, tone: "default" },
      { label: "Diajukan", value: hitung("Diajukan"), tone: "blue" },
      { label: "Diverifikasi", value: hitung("Diverifikasi"), tone: "amber" },
      { label: "Selesai", value: hitung("Selesai"), tone: "green" },
    ];
  }, [data]);

  const breadcrumb = (
    <DashboardBreadcrumb
      items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Daftar Laporan" },
      ]}
    />
  );

  // ── Loading: rangka yang bentuknya sama dengan halaman aslinya ───────────
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
        {breadcrumb}
        <PageHeader
          description="Memuat data laporan…"
          eyebrow="Gratifikasi"
          title="Daftar Laporan"
        />
        <StatCardsSkeleton />
        <TableSkeleton cols={6} rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
        {breadcrumb}
        <PageHeader eyebrow="Gratifikasi" title="Daftar Laporan" />
        <div className="rounded-2xl border border-default-200/60 bg-background">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
      {breadcrumb}

      <PageHeader
        description={`${data.length} laporan tercatat dalam sistem`}
        eyebrow="Gratifikasi"
        title="Daftar Laporan"
      />

      {/* Ringkasan cepat */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ringkasan.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-default-200/60 bg-background p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-default-400">
              {s.label}
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pencarian & filter */}
      <div className="rounded-2xl border border-default-200/60 bg-background p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            className="lg:max-w-xs"
            placeholder="Cari nama, NIP, atau nomor laporan…"
            size="sm"
            startContent={<Search className="text-default-400" size={16} />}
            value={searchTerm}
            variant="bordered"
            onValueChange={ubahFilter(setSearchTerm)}
            isClearable
            onClear={() => ubahFilter(setSearchTerm)("")}
          />

          <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
            <Select
              aria-label="Filter status"
              selectedKeys={[filterStatus]}
              size="sm"
              variant="bordered"
              onChange={(e) => ubahFilter(setFilterStatus)(e.target.value)}
            >
              <SelectItem key="All">Semua Status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s}>{s}</SelectItem>
              ))}
            </Select>

            <Select
              aria-label="Filter jenis laporan"
              selectedKeys={[filterType]}
              size="sm"
              variant="bordered"
              onChange={(e) => ubahFilter(setFilterType)(e.target.value)}
            >
              <SelectItem key="All">Semua Jenis</SelectItem>
              <SelectItem key="Laporan Penerimaan">Penerimaan</SelectItem>
              <SelectItem key="Laporan Penolakan">Penolakan</SelectItem>
            </Select>

            <Select
              aria-label="Filter kerahasiaan"
              selectedKeys={[filterSecret]}
              size="sm"
              variant="bordered"
              onChange={(e) => ubahFilter(setFilterSecret)(e.target.value)}
            >
              <SelectItem key="All">Semua Sifat</SelectItem>
              <SelectItem key="Yes">Rahasia</SelectItem>
              <SelectItem key="No">Tidak Rahasia</SelectItem>
            </Select>

            <Select
              aria-label="Jumlah baris per halaman"
              selectedKeys={[String(itemsPerPage)]}
              size="sm"
              variant="bordered"
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <SelectItem key="10">10 / halaman</SelectItem>
              <SelectItem key="20">20 / halaman</SelectItem>
              <SelectItem key="50">50 / halaman</SelectItem>
            </Select>
          </div>

          {adaFilter && (
            <Button
              className="shrink-0"
              size="sm"
              startContent={<X size={14} />}
              variant="light"
              onPress={resetFilter}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Tabel */}
      <Table
        aria-label="Daftar laporan gratifikasi"
        classNames={{
          wrapper:
            "rounded-2xl border border-default-200/60 bg-background shadow-none p-0",
          th: "bg-default-50/60 text-default-500 text-xs font-semibold uppercase tracking-wider",
          td: "py-3.5",
        }}
      >
        <TableHeader columns={columns}>
          {(col) => (
            <TableColumn
              key={col.key}
              className={col.hideMobile ? "hidden lg:table-cell" : ""}
            >
              {col.label}
            </TableColumn>
          )}
        </TableHeader>

        <TableBody
          emptyContent={
            <EmptyState
              action={
                adaFilter ? (
                  <Button size="sm" variant="flat" onPress={resetFilter}>
                    Hapus filter
                  </Button>
                ) : null
              }
              description={
                adaFilter
                  ? "Tidak ada laporan yang cocok dengan filter yang dipilih."
                  : "Laporan yang dikirim lewat formulir akan muncul di sini."
              }
              icon={<FileText size={20} />}
              title={adaFilter ? "Tidak ada hasil" : "Belum ada laporan"}
            />
          }
          items={paginatedData}
        >
          {(r) => (
            <TableRow
              key={r._id}
              className="cursor-pointer transition-colors hover:bg-default-50"
            >
              {(key) => (
                <TableCell
                  className={
                    columns.find((c) => c.key === key)?.hideMobile
                      ? "hidden lg:table-cell"
                      : ""
                  }
                >
                  {key === "nama" && (
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-default-100 text-xs font-bold text-default-500">
                        {(r.nama || "A")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {r.nama || "Anonim"}
                        </p>
                        <p className="truncate font-mono text-xs text-default-400">
                          {r.uniqueId}
                        </p>
                      </div>
                    </div>
                  )}

                  {key === "reportType" && (
                    <Chip
                      tone={
                        r.reportType === "Laporan Penerimaan" ? "blue" : "slate"
                      }
                    >
                      {r.reportType?.replace("Laporan ", "") || "—"}
                    </Chip>
                  )}

                  {key === "status" && <StatusChip status={r.status} />}

                  {key === "secretReport" &&
                    (r.secretReport ? (
                      <Chip tone="rose">Rahasia</Chip>
                    ) : (
                      <span className="text-sm text-default-400">Tidak</span>
                    ))}

                  {key === "tanggalLapor" && (
                    <span className="text-sm tabular-nums text-default-500">
                      {tanggal(r.tanggalLapor)}
                    </span>
                  )}

                  {key === "perkiraanNilai" && (
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {rupiah(r.perkiraanNilai)}
                    </span>
                  )}

                  {key === "aksi" && (
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip content="Lihat detail" size="sm">
                        <Button
                          isIconOnly
                          aria-label={`Lihat detail laporan ${r.uniqueId}`}
                          size="sm"
                          variant="light"
                          onPress={() =>
                            router.push(`/dashboard/report-list/${r._id}`)
                          }
                        >
                          <Eye size={16} />
                        </Button>
                      </Tooltip>

                      <Tooltip content="Unduh PDF" size="sm">
                        <Button
                          isIconOnly
                          as="a"
                          aria-label={`Unduh PDF laporan ${r.uniqueId}`}
                          download
                          href={`/api/generate-pdf/${r._id}`}
                          size="sm"
                          variant="light"
                        >
                          <Download size={16} />
                        </Button>
                      </Tooltip>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Paginasi */}
      {filteredReports.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-default-400">
            Menampilkan{" "}
            <span className="font-medium text-default-600">
              {(halamanAman - 1) * itemsPerPage + 1}–
              {Math.min(halamanAman * itemsPerPage, filteredReports.length)}
            </span>{" "}
            dari{" "}
            <span className="font-medium text-default-600">
              {filteredReports.length}
            </span>{" "}
            laporan
          </p>

          {totalPages > 1 && (
            <Pagination
              showControls
              color="primary"
              page={halamanAman}
              size="sm"
              total={totalPages}
              variant="light"
              onChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ReportListPage;
