// src/components/TrackingPeserta/usePesertaData.js

import { getAllParticipants } from "@/service/peserta.service";
import { useState, useEffect, useMemo } from "react";

// Fungsi untuk meringkas data (dipindahkan dari page.jsx)
const summarizeData = (groupedData) => {
  let totalParticipants = 0;
  let totalUploaded = 0;
  const unitSummary = [];

  Object.entries(groupedData).forEach(([unitName, participants]) => {
    const uploadedCount = participants.filter(
      (p) => p.statusCourse === "Sudah"
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

export const usePesertaData = () => {
  const [groupedData, setGroupedData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const dataPeserta = await getAllParticipants();

        const grouped = dataPeserta.reduce((acc, peserta) => {
          const unit = peserta.unit_eselon_i || "Lain-lain";
          if (!acc[unit]) {
            acc[unit] = [];
          }
          acc[unit].push({
            ...peserta,
            nip: peserta.nip || "N/A",
            status: peserta.status || "Belum",
          });
          return acc;
        }, {});

        setGroupedData(grouped);
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

  return { groupedData, summary, isLoading, error };
};