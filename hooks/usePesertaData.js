// hooks/usePesertaData.js

import { getAllParticipants } from "@/service/peserta.service";
import { useState, useEffect, useMemo } from "react";

const summarizeData = (groupedData) => {
  let totalParticipants = 0;
  let totalUploaded = 0;
  const unitSummary = [];

  Object.entries(groupedData).forEach(([unitName, participants]) => {
    const uploadedCount = participants.filter(
      (p) => p.statusCourse === "Sudah" || p.statusCourse === "Diverifikasi"
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

/**
 * Hook untuk ambil & group data peserta.
 *
 * @param {Object} options
 * @param {string|number} [options.tahun="all"] - Filter tahun. "all" = semua.
 * @param {string} [options.batch="all"] - Filter batch. "all" = semua.
 */
export const usePesertaData = ({ tahun = "all", batch = "all" } = {}) => {
  const [allData, setAllData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const dataPeserta = await getAllParticipants();
        setAllData(Array.isArray(dataPeserta) ? dataPeserta : []);
      } catch (err) {
        console.error("Gagal dari service:", err);
        setError(err.message || "Gagal memuat data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const cohortScoped = useMemo(() => {
    return allData.filter((p) => {
      if (tahun !== "all" && tahun != null) {
        const tahunNum = parseInt(tahun, 10);
        if (!isNaN(tahunNum) && p.tahun !== tahunNum) return false;
      }
      if (batch !== "all" && batch != null && batch !== "") {
        if ((p.batch ?? "").toString() !== batch.toString()) return false;
      }
      return true;
    });
  }, [allData, tahun, batch]);

  const groupedData = useMemo(() => {
    return cohortScoped.reduce((acc, peserta) => {
      const unit = peserta.unit_eselon_i || "Lain-lain";
      if (!acc[unit]) acc[unit] = [];
      acc[unit].push({
        ...peserta,
        nip: peserta.nip || "N/A",
        status: peserta.status || "Belum",
      });
      return acc;
    }, {});
  }, [cohortScoped]);

  const summary = useMemo(() => summarizeData(groupedData), [groupedData]);

  return { groupedData, summary, isLoading, error, totalRaw: allData.length };
};
