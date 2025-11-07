// src/app/tracking-peserta/page.jsx

"use client";

import React from "react";
import { ListCheckIcon, Loader2 } from "lucide-react";
import { GlobalSummaryCards } from "./_components/GlobalSummaryCards";
import { UnitSummaryCardsList } from "./_components/UnitSummaryCardsList";
import { UnitParticipantTable } from "./_components/UnitParticipantTable";
import { usePesertaData } from "@/hooks/usePesertaData";
import { Button } from "@heroui/button";
import Link from "next/link";

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
      <div className="grid lg:flex items-center justify-between">
        <h1 className="text-3xl font-bold py-6 text-foreground">
          Tracking Peserta Sertifikasi
        </h1>
        <Button
          as={Link}
          href="/e-learning/participants"
          variant="shadow"
          color="primary"
          className="flex items-center justify-center gap-2 mb-5"
        >
          <ListCheckIcon size={20} />
          <p>Daftar Seluruh Peserta</p>
        </Button>
      </div>

      {/* 1. RINGKASAN GLOBAL ATAS (CARD) */}
      <GlobalSummaryCards summary={summary} />

      <hr className="mb-8" />

      {/* 2. GRAFIK & CARD RINGKASAN PER UNIT */}
      <UnitSummaryCardsList unitSummary={summary.unitSummary} />

      {/* 3. TABEL DETAIL PER UNIT */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl lg:text-4xl font-bold text-foreground text-center py-10">
          Rincian Peserta per Unit
        </h2>
      </div>

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
