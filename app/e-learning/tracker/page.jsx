// src/app/tracking-peserta/page.jsx

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { pesertaBatchOneService } from "@/service/peserta.service";
import { ChevronLeft, ChevronRight, Loader2, Upload, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Button } from "@heroui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const ITEMS_PER_PAGE = 5;

// --- FUNGSI RINGKASAN DATA (tetap sama) ---
const summarizeData = (groupedData) => {
  let totalParticipants = 0;
  let totalUploaded = 0;
  const unitSummary = [];

  Object.entries(groupedData).forEach(([unitName, participants]) => {
    const uploadedCount = participants.filter(
      (p) => p.status === "uploaded"
    ).length;
    const totalCount = participants.length;
    const notUploadedCount = totalCount - uploadedCount;

    totalParticipants += totalCount;
    totalUploaded += uploadedCount;

    unitSummary.push({
      name: unitName,
      value: uploadedCount,
      total: totalCount,
      uploaded: uploadedCount,
      notUploaded: notUploadedCount,
      percentage: totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0,
    });
  });

  return {
    totalParticipants,
    totalUploaded,
    unitSummary,
    overallPercentage:
      totalParticipants > 0 ? (totalUploaded / totalParticipants) * 100 : 0,
  };
};

// --- KOMPONEN KARTU RINGKASAN GLOBAL (tetap sama) ---
const SummaryCard = ({ title, value, percentage, icon: Icon, color }) => (
  <div
    className={`p-5 rounded-xl shadow-lg border-${color}-500 bg-white backdrop-blur-md hover:scale-105 transition`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    {percentage !== undefined && (
      <p className={`mt-2 text-sm font-semibold text-${color}-600`}>
        {percentage.toFixed(1)}% Keseluruhan
      </p>
    )}
  </div>
);

// --- KOMPONEN BARU: KARTU RINGKASAN PER UNIT (Digunakan di luar loop tabel) ---
const UnitSummaryCard = ({
  name,
  uploaded,
  notUploaded,
  total,
  percentage,
}) => (
  <div className="p-4 rounded-xl shadow-md border border-gray-100 bg-white hover:shadow-lg transition hover:scale-105">
    <h3 className="text-lg font-bold text-gray-800 mb-2 border-b pb-1">
      {name}
    </h3>

    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-center p-2 rounded bg-blue-50">
        <p className="font-bold text-blue-800">{total}</p>
        <p className="text-xs text-blue-600">Total</p>
      </div>

      <div className="text-center p-2 rounded bg-green-50">
        <p className="font-bold text-green-800">{uploaded}</p>
        <p className="text-xs text-green-600">Upload</p>
      </div>

      <div className="text-center p-2 rounded bg-red-50">
        <p className="font-bold text-red-800">{notUploaded}</p>
        <p className="text-xs text-red-600">Belum</p>
      </div>
    </div>

    <p
      className={`mt-3 text-center text-sm font-semibold ${percentage > 50 ? "text-green-600" : "text-orange-600"}`}
    >
      {percentage.toFixed(1)}% Selesai
    </p>
  </div>
);
// ------------------------------------------------

const TrackingParticipantPage = () => {
  const [groupedData, setGroupedData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paginationState, setPaginationState] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const dataPeserta = await pesertaBatchOneService();

        const grouped = dataPeserta.reduce((acc, peserta) => {
          const unit = peserta.unit_eselon_i || "Lain-lain";
          if (!acc[unit]) {
            acc[unit] = [];
          }
          acc[unit].push({
            ...peserta,
            nip: peserta.nip || "N/A",
            status: peserta.status || "Belum Upload",
          });
          return acc;
        }, {});

        setGroupedData(grouped);

        const initialPagination = {};
        Object.keys(grouped).forEach((unitName) => {
          initialPagination[unitName] = 1;
        });
        setPaginationState(initialPagination);
      } catch (err) {
        console.error("Gagal dari service:", err);
        setError(err.message || "Gagal memuat data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const summary = useMemo(() => summarizeData(groupedData), [groupedData]);

  const handlePageChange = (unitName, newPage) => {
    setPaginationState((prev) => ({
      ...prev,
      [unitName]: newPage,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span className="text-xl">Memuat data peserta...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-12 text-center text-red-600">
        <h1 className="text-2xl font-bold">Terjadi Kesalahan</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-foreground">
        Tracking Peserta Sertifikasi
      </h1>

      {/* --- 1. RINGKASAN GLOBAL ATAS (CARD) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <SummaryCard
          title="Total Peserta"
          value={summary.totalParticipants}
          icon={Users}
          color="blue"
        />
        <SummaryCard
          title="Total Sudah Upload"
          value={summary.totalUploaded}
          percentage={summary.overallPercentage}
          icon={Upload}
          color="green"
        />
        <SummaryCard
          title="Total Belum Upload"
          value={summary.totalParticipants - summary.totalUploaded}
          icon={Users}
          color="red"
        />
      </div>

      <hr className="mb-8" />

      {/* --- 2. GRAFIK PERSENTASE PER UNIT --- */}
      <h2 className="text-2xl font-semibold mb-4">Monitoring Progress Unit</h2>

      {/* 3. CARD RINGKASAN PER UNIT (BARU DISINI) */}
      <div className="flex flex-wrap items-center justify-center gap-6 overflow-y-auto p-2">
        {summary.unitSummary.map((unit) => (
          <UnitSummaryCard
            key={unit.name}
            name={unit.name}
            uploaded={unit.uploaded}
            notUploaded={unit.notUploaded}
            total={unit.total}
            percentage={unit.percentage}
          />
        ))}
      </div>

      {/* --- 4. TABEL DETAIL PER UNIT (Hanya Rincian) --- */}
      <h2 className="text-2xl lg:text-4xl font-bold mb-6 text-foreground text-center mt-10">
        Rincian Peserta per Unit
      </h2>

      {Object.entries(groupedData).map(([unitName, participants]) => {
        // Logika Pagination
        const currentPage = paginationState[unitName] || 1;
        const totalPages = Math.ceil(participants.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedParticipants = participants.slice(startIndex, endIndex);

        const headingId = `heading-${unitName.replace(/\s+/g, "-").toLowerCase()}`;

        return (
          <section key={unitName} className="mb-10">
            {/* HANYA JUDUL DAN TOMBOL DETAIL */}
            <h3
              id={headingId}
              className="text-xl font-bold mb-4 border-b pb-2 text-foreground"
            >
              {unitName} ({participants.length} Peserta)
            </h3>

            <div className="overflow-x-auto rounded-lg shadow-md">
              <Table aria-labelledby={headingId}>
                <TableHeader>
                  <TableColumn>No.</TableColumn>
                  <TableColumn>Nama Peserta</TableColumn>
                  <TableColumn>NIP</TableColumn>
                  <TableColumn>Unit Eselon I</TableColumn>
                  <TableColumn>Status Sertifikat</TableColumn>
                </TableHeader>

                <TableBody>
                  {paginatedParticipants.map((peserta, index) => (
                    <TableRow key={peserta.id}>
                      <TableCell>{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {peserta.nama}
                      </TableCell>
                      <TableCell>{peserta.nip}</TableCell>
                      <TableCell>{peserta.unit_eselon_i}</TableCell>
                      <TableCell>
                        {peserta.status === "uploaded" ? (
                          <span className="text-green-600 font-medium">
                            ✅ Sudah Upload
                          </span>
                        ) : (
                          <span className="text-gray-500">❌ Belum Upload</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* --- KONTROL PAGINATION --- */}
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-foreground">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(unitName, currentPage - 1)}
                  disabled={currentPage === 1}
                  // Ikon di awal untuk tombol 'Sebelumnya'
                  startContent={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                {"|"}
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(unitName, currentPage + 1)}
                  disabled={currentPage === totalPages}
                  // Ikon di akhir untuk tombol 'Berikutnya'
                  endContent={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default TrackingParticipantPage;
