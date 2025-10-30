"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Input, Select, SelectItem, Button } from "@heroui/react";
import { FileText, Download } from "lucide-react";
import { getAllParticipants } from "@/service/peserta.service";
import axios from "axios";
import { getPresignedUrlFromBackend, getPresignedUrlFromBackendForDownload } from "@/service/aws/predesignUrl.service";

export default function ParticipantList() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [loggedin, setLoggedIn] = useState(false);

  // 🔍 State untuk filter dan pencarian
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnit, setFilterUnit] = useState("All");
  const [filterBatch, setFilterBatch] = useState("All");
  // Menggunakan default filterStatus 'Sudah' jika belum login
  const [filterStatus, setFilterStatus] = useState("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // --- 1. Cek Status Login ---
  useEffect(() => {
    const checkCookies = async () => {
      try {
        const response = await axios.get("/api/auth/me");
        setLoggedIn(response.data.success || false);
      } catch (e) {
        setLoggedIn(false);
      }
    };
    checkCookies();
  }, []);

  // --- 2. Ambil Data dari API ---
  useEffect(() => {
    const fetchParticipants = async () => {
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
    };
    fetchParticipants();
  }, []);

  // --- 3. Filter + Search Logika (Perubahan di sini) ---
  const filteredParticipants = useMemo(() => {
    // Reset halaman ke-1 saat filter/search berubah
    setCurrentPage(1);

    return participants.filter((p) => {
      // **Tambahan Logika: Sembunyikan 'Belum' jika belum login**
      if (!loggedin && p.statusCourse === "Belum") {
        return false;
      }

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        p.nama.toLowerCase().includes(searchLower) ||
        p.nip.includes(searchLower);

      const matchesUnit =
        filterUnit === "All" || p.unit_eselon_i === filterUnit;
      const matchesBatch = filterBatch === "All" || p.batch === filterBatch;

      // Jika belum login, filterStatus 'Belum' akan diabaikan karena sudah difilter di atas.
      const matchesStatus =
        filterStatus === "All" || p.statusCourse === filterStatus;

      return matchesSearch && matchesUnit && matchesBatch && matchesStatus;
    });
  }, [
    participants,
    searchTerm,
    filterUnit,
    filterBatch,
    filterStatus,
    loggedin,
  ]); // Tambahkan loggedin sebagai dependency

  // --- 4. Pagination Logika ---
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedData = filteredParticipants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- 5. Definisi Kolom ---
  const columns = useMemo(() => {
    let cols = [
      { key: "nama", label: "Nama" },
      { key: "unit_eselon_i", label: "Unit Eselon I" },
      { key: "batch", label: "Batch" },
      { key: "statusCourse", label: "Status" },
    ];

    if (loggedin) {
      // Kolom tambahan hanya untuk user terautentikasi
      cols.splice(1, 0, { key: "nip", label: "NIP" });
      cols.splice(2, 0, { key: "jabatan", label: "Jabatan" });
      cols.push({ key: "aksi", label: "Aksi" });
    }
    return cols;
  }, [loggedin]);

  // --- 6. Dropdown options ---
  const uniqueUnits = useMemo(() => {
    return ["All", ...new Set(participants.map((p) => p.unit_eselon_i))].filter(
      Boolean
    );
  }, [participants]);

  const uniqueBatches = useMemo(() => {
    return ["All", ...new Set(participants.map((p) => p.batch))].filter(
      Boolean
    );
  }, [participants]);

  // --- 7. Fungsi Tombol ---
  const handleViewPdf = async (s3_key) => {
    if (!s3_key) return alert("Dokumen belum diunggah.");

    try {
      // 1. Dapatkan Presigned URL dari backend
      const presignedUrl = await getPresignedUrlFromBackend(s3_key);

      // 2. Buka URL yang sudah ditandatangani di tab baru
      if (presignedUrl) {
        window.open(presignedUrl, "_blank");
      } else {
        alert("Gagal mendapatkan URL dokumen.");
      }
    } catch (error) {
      console.error("Kesalahan saat melihat PDF:", error);
      alert(`Gagal membuka dokumen: ${error.message}`);
    }
  };

  const handleDownloadPdf = async (s3_key) => {
    if (!s3_key) return alert("Dokumen belum diunggah.");

    try {
      // 1. Dapatkan Presigned URL dari backend
      const presignedUrl = await getPresignedUrlFromBackendForDownload(s3_key);

      if (presignedUrl) {
        // 2. Buat elemen <a>
        const link = document.createElement("a");

        // 3. Set href ke Presigned URL yang VALID
        link.href = presignedUrl;

        // 4. Set nama file yang diunduh (opsional, Presigned URL biasanya
        //    sudah menangani Content-Disposition)
        // Mengambil nama file dari s3_key asli
        link.download = s3_key.split("/").pop() || "dokumen.pdf";

        // 5. Simulasikan klik
        document.body.appendChild(link); // Penting untuk beberapa browser
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Gagal mendapatkan URL dokumen.");
      }
    } catch (error) {
      console.error("Kesalahan saat mengunduh PDF:", error);
      alert(`Gagal mengunduh dokumen: ${error.message}`);
    }
  };

  if (loading) return <p>Memuat data peserta...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-6 space-y-4">
      {loggedin ? (
        <h2 className="text-xl md:text-2xl font-semibold py-6">
          Daftar Peserta E-learning ({participants.length} Peserta)
        </h2>
      ) : (
        <h2 className="text-xl md:text-2xl font-semibold py-6">
          Sudah Upload Sertifikat ({filteredParticipants.length} dari{" "}
          {participants.length} total)
        </h2>
      )}

      {/* 🔎 Kontrol Filter dan Search */}
      <Input
        placeholder="Cari nama atau NIP..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="flex gap-3">
        {/* Filter Unit Eselon I */}
        <Select
          label="Filter Unit Eselon I"
          selectedKeys={[filterUnit]}
          onChange={(e) => setFilterUnit(e.target.value)}
        >
          {uniqueUnits.map((unit) => (
            <SelectItem key={unit} value={unit}>
              {unit === "All" ? "Semua Unit" : unit}
            </SelectItem>
          ))}
        </Select>

        {/* Filter Batch */}
        <Select
          label="Filter Batch"
          selectedKeys={[filterBatch]}
          onChange={(e) => setFilterBatch(e.target.value)}
        >
          {uniqueBatches.map((batch) => (
            <SelectItem key={batch} value={batch}>
              {batch === "All" ? "Semua Batch" : batch}
            </SelectItem>
          ))}
        </Select>

        {/* Status Course */}
        {loggedin && (
          // Hanya tampilkan opsi filter Status Course jika user sudah login
          <Select
            label="Status Course"
            selectedKeys={[filterStatus]}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <SelectItem key="All">Semua</SelectItem>
            <SelectItem key="Sudah">Sudah</SelectItem>
            <SelectItem key="Belum">Belum</SelectItem>
          </Select>
        )}

        {/* Tampilkan data per halaman */}
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

      {/* 🧾 Table */}
      <Table aria-label="Daftar Peserta Elearning">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          )}
        </TableHeader>

        <TableBody
          emptyContent={"Tidak ada data yang cocok"}
          items={paginatedData}
        >
          {(p) => (
            <TableRow key={p._id} >
              {(columnKey) => (
                <TableCell className="text-xs">
                  {/* Logika render sel berdasarkan key kolom */}
                  {columnKey === "nama" && p.nama}
                  {columnKey === "nip" && p.nip}
                  {columnKey === "jabatan" && p.jabatan}
                  {columnKey === "unit_eselon_i" && p.unit_eselon_i}
                  {columnKey === "batch" && p.batch}
                  {columnKey === "statusCourse" && (
                    <span
                      className={`px-2 py-1 rounded text-white text-xs font-medium ${
                        p.statusCourse === "Sudah"
                          ? "bg-green-600"
                          : "bg-red-500"
                      }`}
                    >
                      {p.statusCourse}
                    </span>
                  )}
                  {columnKey === "aksi" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        // Jika belum login, tombol Lihat dan Unduh di-disable
                        isDisabled={!p.s3_key || !loggedin}
                        onPress={() => handleViewPdf(p.s3_key)}
                      >
                        <FileText className="w-4 h-4" /> Lihat
                      </Button>
                      <Button
                        size="sm"
                        color="secondary"
                        variant="flat"
                        // Jika belum login, tombol Lihat dan Unduh di-disable
                        isDisabled={!p.s3_key || !loggedin}
                        onPress={() => handleDownloadPdf(p.s3_key)}
                      >
                        <Download className="w-4 h-4" /> Unduh
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* 📑 Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-gray-700">
          Menampilkan {paginatedData.length} data. Halaman {currentPage} dari{" "}
          {totalPages}
        </p>
        <div className="space-x-2">
          <Button
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            size="sm"
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
