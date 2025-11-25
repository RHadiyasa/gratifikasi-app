"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Input, Select, SelectItem, Button } from "@heroui/react";
import { Eye } from "lucide-react";
import useReportData from "@/hooks/useReportData";
import DashboardBreadcrumb from "../_components/DashboardBreadcumb";

const ReportListPage = () => {
  const { data = [], loading, error } = useReportData();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterSecret, setFilterSecret] = useState("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Kolom tabel
  const columns = [
    { key: "nama", label: "Nama Pelapor" },
    { key: "reportType", label: "Jenis", hideMobile: true },
    { key: "status", label: "Status" },
    { key: "secretReport", label: "Kerahasiaan", hideMobile: true },
    { key: "tanggalLapor", label: "Tanggal Lapor", hideMobile: true },
    { key: "perkiraanNilai", label: "Nominal" },
    { key: "aksi", label: "Aksi" },
  ];

  const filteredReports = useMemo(() => {
    setCurrentPage(1);

    return data.filter((r) => {
      const searchMatch =
        r.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.nip?.includes(searchTerm);

      const statusMatch = filterStatus === "All" || r.status === filterStatus;
      const typeMatch = filterType === "All" || r.reportType === filterType;

      const secretMatch =
        filterSecret === "All" ||
        (filterSecret === "Yes" && r.secretReport === true) ||
        (filterSecret === "No" && r.secretReport === false);

      return searchMatch && statusMatch && typeMatch && secretMatch;
    });
  }, [data, searchTerm, filterStatus, filterType, filterSecret]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedData = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return <p className="p-6">Memuat data laporan...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6 space-y-4">
      <DashboardBreadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Report List", href: "/dashboard/report-list" },
        ]}
      />
      <h2 className="text-xl md:text-2xl font-semibold py-4">
        Daftar Laporan Gratifikasi ({data.length} laporan)
      </h2>

      {/* SEARCH */}
      <Input
        placeholder="Cari nama pelapor atau NIP..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* FILTER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select
          label="Status Laporan"
          selectedKeys={[filterStatus]}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <SelectItem key="All">Semua</SelectItem>
          <SelectItem key="Diajukan">Diajukan</SelectItem>
          <SelectItem key="Diverifikasi">Diverifikasi</SelectItem>
          <SelectItem key="Diteruskan ke KPK">Diteruskan ke KPK</SelectItem>
          <SelectItem key="Selesai">Selesai</SelectItem>
        </Select>

        <Select
          label="Jenis Laporan"
          selectedKeys={[filterType]}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <SelectItem key="All">Semua</SelectItem>
          <SelectItem key="Laporan Penerimaan">Penerimaan</SelectItem>
          <SelectItem key="Laporan Pemberian">Pemberian</SelectItem>
        </Select>

        <Select
          label="Kerahasiaan"
          selectedKeys={[filterSecret]}
          onChange={(e) => setFilterSecret(e.target.value)}
        >
          <SelectItem key="All">Semua</SelectItem>
          <SelectItem key="Yes">Rahasia</SelectItem>
          <SelectItem key="No">Tidak Rahasia</SelectItem>
        </Select>

        <Select
          label="Tampilkan"
          selectedKeys={[itemsPerPage.toString()]}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
        >
          <SelectItem key="10">10</SelectItem>
          <SelectItem key="20">20</SelectItem>
          <SelectItem key="50">50</SelectItem>
        </Select>
      </div>

      {/* TABEL */}
      <Table aria-label="Daftar Laporan Gratifikasi">
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

        <TableBody items={paginatedData} emptyContent={"Tidak ada laporan"}>
          {(r) => (
            <TableRow key={r._id}>
              {(key) => (
                <TableCell
                  className={`text-xs ${
                    columns.find((c) => c.key === key)?.hideMobile
                      ? "hidden lg:table-cell"
                      : ""
                  }`}
                >
                  {key === "nama" && r.nama}

                  {key === "reportType" && (
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-600 text-xs">
                      {r.reportType}
                    </span>
                  )}

                  {key === "status" && (
                    <span
                      className={`px-2 py-1 rounded text-white text-xs ${
                        r.status === "Diajukan"
                          ? "bg-yellow-500"
                          : r.status === "Diverifikasi"
                            ? "bg-blue-500"
                            : r.status === "Selesai"
                              ? "bg-green-600"
                              : "bg-red-500"
                      }`}
                    >
                      {r.status}
                    </span>
                  )}

                  {key === "secretReport" &&
                    (r.secretReport ? "Rahasia" : "Tidak")}

                  {key === "tanggalLapor" &&
                    new Date(r.tanggalLapor).toLocaleDateString("id-ID")}

                  {key === "perkiraanNilai" &&
                    `Rp ${Number(r.perkiraanNilai).toLocaleString("id-ID")}`}

                  {key === "aksi" && (
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      onPress={() =>
                        window.location.assign(
                          `/dashboard/report-list/${r._id}`
                        )
                      }
                    >
                      <Eye className="w-4 h-4" /> Detail
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* PAGINATION */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm">
          Menampilkan {paginatedData.length} data • Halaman {currentPage} dari{" "}
          {totalPages}
        </p>

        <div className="space-x-2">
          <Button
            size="sm"
            disabled={currentPage === 1}
            onPress={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </Button>

          <Button
            size="sm"
            disabled={currentPage >= totalPages}
            onPress={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportListPage;
