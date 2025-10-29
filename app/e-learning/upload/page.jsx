"use client";
import React, { useEffect, useState } from "react";
import { Select, SelectItem } from "@heroui/react";
import { Button } from "@heroui/button";
import { Upload, Loader2, CheckCircle } from "lucide-react";
import { getAllParticipants } from "@/service/peserta.service";
import axios from "axios"; // <-- 1. IMPORT AXIOS

export default function UploadCertificate() {
  // --- State untuk Dropdown & Data Peserta ---
  const [data, setData] = useState([]);
  const [unitList, setUnitList] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [selectedNip, setSelectedNip] = useState("");

  // --- State untuk Proses Upload ---
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch data peserta (termasuk NIP) - (Tidak berubah)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getAllParticipants();
        const normalized = res.map((p) => ({
          ...p,
          Nama: (p.nama ?? p.Nama ?? p.NAMA ?? "").toString(),
          UnitEselonI: (
            p.unit_eselon_i ??
            p["Unit Eselon I"] ??
            p.unit_eselon_i ??
            ""
          ).toString(),
          nip: (p.nip ?? p.NIP ?? "").toString(),
        }));

        setData(normalized);
        const uniqueUnits = Array.from(
          new Set(
            normalized
              .map((p) => p.UnitEselonI?.toString().trim())
              .filter(Boolean)
          )
        ).sort();
        setUnitList(uniqueUnits);
      } catch (err) {
        console.error("Gagal memuat data peserta:", err);
        setUploadStatus("error");
        setErrorMessage("Gagal memuat daftar peserta. Refresh halaman.");
      }
    };
    fetchData();
  }, []);

  // Update daftar peserta ketika unit dipilih - (Tidak berubah)
  useEffect(() => {
    if (!selectedUnit) {
      setFilteredParticipants([]);
      setSelectedNip("");
      return;
    }
    const filtered = data
      .filter(
        (p) =>
          p.UnitEselonI?.toString().trim() === selectedUnit.toString().trim()
      )
      .map((p) => ({
        nama: (p.Nama ?? "").toString().trim(),
        nip: (p.nip ?? "").toString().trim(),
      }))
      .filter((p) => p.nama && p.nip);

    setFilteredParticipants(filtered);
    setSelectedNip("");
  }, [selectedUnit, data]);

  // Handle pemilihan file - (Tidak berubah)
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus("");
      setErrorMessage("");
    }
  };

  // PROSES UPLOAD UTAMA - (MODIFIKASI)
  // PROSES UPLOAD UTAMA (SUDAH DIPERBAIKI)
  const handleUpload = async () => {
    // Validasi 1: Cek input form
    if (!file || !selectedNip || !selectedUnit) {
      setErrorMessage("Harap pilih Unit, Nama Peserta, dan File.");
      setUploadStatus("error");
      return;
    }

    // Validasi 2: Dapatkan nama peserta dari NIP yang dipilih
    const currentPeserta = data.find((p) => p.nip === selectedNip);
    if (!currentPeserta) {
      setErrorMessage("Data peserta tidak valid. Hubungi admin.");
      setUploadStatus("error");
      return;
    }
    const safeSelectedName = currentPeserta.Nama;

    // --- Mulai Proses Upload ---
    setIsUploading(true);
    setUploadStatus("");
    setErrorMessage("");

    try {
      // Step 1: Dapatkan Presigned URL (tetap pakai fetch, atau bisa ganti axios)
      const resApi = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          filetype: file.type,
          unit: selectedUnit,
          name: safeSelectedName,
        }),
      });
      if (!resApi.ok) throw new Error("Gagal mendapatkan izin upload.");
      const { url, key } = await resApi.json();

      // Step 2: Upload file ke S3 (tetap pakai fetch)
      const resS3 = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!resS3.ok) throw new Error("Upload file ke S3 gagal.");

      // --- PERBAIKAN DI SINI ---
      // Step 3: Kirim status ke MongoDB
      try {
        const statusData = {
          nip: selectedNip, // <-- pastikan 'p' kecil
          s3_key: key,
        };
        // Menggunakan axios.post
        await axios.post("/api/status", statusData);
      } catch (dbError) {
        // Axios otomatis melempar error jika status bukan 2xx
        console.error(
          "PENTING: S3 sukses, tapi GAGAL simpan status DB.",
          dbError.response?.data || dbError.message // <-- Error akan ditangkap di sini
        );
      }
      // ------------------------

      // Step 4: Selesai!
      setUploadStatus("success");
    } catch (err) {
      console.error(err);
      // Jika errornya adalah ReferenceError, err.message akan menampilkannya
      const errorMessage = err.message || "Terjadi kesalahan saat upload.";
      setErrorMessage(errorMessage);
      setUploadStatus("error");
    } finally {
      setIsUploading(false);
    }
  };

  // Render Halaman
  return (
    <div className="flex flex-col items-center justify-center mt-20">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-300 via-white to-indigo-200 bg-clip-text dark:text-transparent mb-6">
        Upload Sertifikat Anda
      </h1>

      {/* --- Dropdown Unit Eselon 1 --- */}
      <div className="w-full max-w-2xl mb-6">
        <Select
          label="Unit Eselon 1"
          placeholder="Pilih Unit Eselon 1"
          selectedKeys={selectedUnit ? [selectedUnit] : []}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0] ?? "";
            setSelectedUnit(val?.toString().trim() ?? "");
          }}
          disabled={isUploading || unitList.length === 0}
        >
          {unitList.map((unit) => (
            <SelectItem key={unit} textValue={unit}>
              {unit}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* --- Dropdown Pilih Nama --- */}
      {selectedUnit && (
        <div className="w-full max-w-2xl mb-6">
          <Select
            label="Pilih Nama"
            placeholder="Pilih Nama Peserta (Nama - NIP)"
            selectedKeys={selectedNip ? [selectedNip] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] ?? "";
              setSelectedNip(val?.toString().trim() ?? "");
            }}
            disabled={isUploading}
          >
            {filteredParticipants.map((peserta) => (
              <SelectItem key={peserta.nip} textValue={peserta.nama}>
                {peserta.nama} - {peserta.nip}
              </SelectItem>
            ))}
          </Select>
        </div>
      )}

      {/* --- Input File --- */}
      <div className="w-full max-w-2xl mb-8">
        <label htmlFor="file" className="block text-sm font-medium mb-2">
          Pilih Dokumen Sertifikat (PDF)
        </label>
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white/15 hover:shadow-md transition">
          <input
            type="file"
            id="file"
            accept=".pdf"
            className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
      </div>

      {/* --- Tombol Upload --- */}
      <Button
        color="primary"
        variant="shadow"
        size="lg"
        startContent={
          isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )
        }
        className="transition-all duration-700 hover:scale-105"
        onPress={handleUpload}
        disabled={isUploading || uploadStatus === "success"}
      >
        {isUploading
          ? "Mengupload..."
          : uploadStatus === "success"
            ? "Berhasil Diupload!"
            : "Upload Sertifikat"}
      </Button>

      {/* --- Pesan Status --- */}
      {uploadStatus === "error" && (
        <p className="text-red-400 mt-4">{errorMessage}</p>
      )}
      {uploadStatus === "success" && (
        <p className="text-green-400 mt-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          File Anda telah berhasil diupload.
        </p>
      )}
    </div>
  );
}
