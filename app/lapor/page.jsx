"use client";

import { useEffect } from "react";
import axios from "axios";

export default function LaporPage() {
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await axios.get("/api/test");
        console.log(res.data.message);
      } catch (error) {
        console.error("Gagal koneksi ke MongoDB:", error);
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <h1 className="text-2xl font-bold mb-4">Form Pelaporan Gratifikasi</h1>
      <p>Halaman ini otomatis mengecek koneksi MongoDB saat dibuka.</p>
    </div>
  );
}
