// src/app/tracking-peserta/page.jsx

"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { GlobalSummaryCards } from "./_components/GlobalSummaryCards";
import { UnitSummaryCardsList } from "./_components/UnitSummaryCardsList";
import { UnitParticipantTable } from "./_components/UnitParticipantTable";
import { usePesertaData } from "@/hooks/usePesertaData";

const TrackingParticipantPage = () => {
  // Menggunakan Custom Hook untuk semua logika data
  const { groupedData, summary, isLoading, error } = usePesertaData();
  // console.log("Group: ", groupedData)

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

      {/* 1. RINGKASAN GLOBAL ATAS (CARD) */}
      <GlobalSummaryCards summary={summary} />

      <hr className="mb-8" />

      {/* 2. GRAFIK & CARD RINGKASAN PER UNIT */}
      <UnitSummaryCardsList unitSummary={summary.unitSummary} />

      {/* 3. TABEL DETAIL PER UNIT */}
      <h2 className="text-2xl lg:text-4xl font-bold mb-6 text-foreground text-center mt-10">
        Rincian Peserta per Unit
      </h2>

      {Object.entries(groupedData).map(([unitName, participants]) => (
        <UnitParticipantTable
          key={unitName}
          unitName={unitName}
          participants={participants}
        />
      ))}
    </div>
  );
};

export default TrackingParticipantPage;