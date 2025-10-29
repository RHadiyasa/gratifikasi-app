// src/components/TrackingPeserta/UnitParticipantTable.jsx

import React, { useState } from "react";
// Tambahkan Loader2 untuk indikator loading
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Button } from "@heroui/button";

const ITEMS_PER_PAGE = 5;

// --- Menggunakan URL yang Benar dan Error Handling Kuat ---
const getPresignedUrlFromBackend = async (s3Key) => {
  // KOREKSI UTAMA: Ubah path menjadi /api/s3
  const response = await fetch(`/api/s3?key=${s3Key}`);

  if (!response.ok) {
    try {
      // Coba parse respons sebagai JSON untuk pesan error API
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Server merespons dengan status ${response.status}.`
      );
    } catch (e) {
      // Jika respons bukan JSON (yaitu HTML 404/500), tangani di sini
      const errorText = await response.text();
      console.error("Raw HTML Error Response:", errorText);
      throw new Error(
        `Kesalahan jaringan atau route API. Status: ${response.status}.`
      );
    }
  } // Server harus mengembalikan { url: "..." }

  try {
    const data = await response.json();
    return data.url;
  } catch (e) {
    throw new Error("Respons OK, tetapi format JSON tidak valid.");
  }
};
// ------------------------------------------------------------------

export const UnitParticipantTable = ({ unitName, participants }) => {
  const [currentPage, setCurrentPage] = useState(1); // State untuk melacak loading tombol secara global (bisa disempurnakan per baris)
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState(null);

  const totalPages = Math.ceil(participants.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedParticipants = participants.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePreviewPdf = async (s3Key) => {
    if (!s3Key) {
      alert("S3 Key dokumen tidak tersedia!");
      return;
    }

    setLoadingKey(s3Key); // ⬅️ hanya tombol dengan key ini yang loading

    try {
      const publicUrl = await getPresignedUrlFromBackend(s3Key);
      window.open(publicUrl, "_blank");
    } catch (error) {
      console.error("Error saat mendapatkan Presigned URL:", error);
      alert(`Gagal memuat dokumen: ${error.message}.`);
    } finally {
      setLoadingKey(null); // ⬅️ hentikan loading
    }
  };

  const headingId = `heading-${unitName.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className="mb-10">
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
            <TableColumn>Status Sertifikat</TableColumn>
            <TableColumn>Preview PDF</TableColumn>
          </TableHeader>
          <TableBody>
            {paginatedParticipants.map((peserta, index) => (
              <TableRow key={peserta.id}>
                <TableCell>{startIndex + index + 1}</TableCell>
                <TableCell className="font-medium">{peserta.nama}</TableCell>
                <TableCell>{peserta.nip}</TableCell>
                <TableCell>
                  {peserta.statusCourse === "Sudah" ? (
                    <span className="text-green-600 font-medium">
                      ✅ Sudah Upload
                    </span>
                  ) : (
                    <span className="text-gray-500">❌ Belum Upload</span>
                  )}
                </TableCell>
                <TableCell>
                  {/* --- IMPLEMENTASI TOMBOL PREVIEW DENGAN S3_KEY --- */}
                  {peserta.statusCourse === "Sudah" && peserta.s3_key ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handlePreviewPdf(peserta.s3_key)}
                      disabled={loadingKey === peserta.s3_key} // hanya tombol ini yang disable
                      startContent={
                        loadingKey === peserta.s3_key ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )
                      }
                    >
                      {loadingKey === peserta.s3_key
                        ? "Loading..."
                        : "Lihat Dokumen"}
                    </Button>
                  ) : (
                    <span className="text-gray-400 text-sm italic">
                      Tidak tersedia
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Kontrol Pagination */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-foreground">
          Halaman {currentPage} dari {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            startContent={<ChevronLeft className="w-4 h-4" />}
          >
            Previous
          </Button>
          {"|"}
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            endContent={<ChevronRight className="w-4 h-4" />}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
};
