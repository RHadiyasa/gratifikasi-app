"use client";
import { useEffect, useState } from "react";

export function useReportById(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        const res = await fetch(`/api/report/${id}`);
        const json = await res.json();

        if (!res.ok) throw new Error(json.message);
        setData(json.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  return { data, loading, error, setData };
}
