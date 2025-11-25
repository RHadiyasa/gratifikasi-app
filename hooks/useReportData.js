"use client";

import { useEffect, useState } from "react";

export default function useReportData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Gagal mengambil data laporan");
      }

      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return {
    data,
    loading,
    error,
    refresh: fetchReports,
  };
}
