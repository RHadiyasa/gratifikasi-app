// src/components/AuthHydrator.jsx

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react"; // Opsional: untuk visual loading
import { useAuthStore } from "@/store/authStore";

export function AuthHydrator({ children }) {
  const [hasHydrated, setHasHydrated] = useState(false);
  // Ambil fungsi checkToken dari store
  const checkToken = useAuthStore((state) => state.checkToken);

  useEffect(() => {
    // 1. Panggil checkToken saat komponen mount
    checkToken();

    // 2. Set status hydrated menjadi true
    setHasHydrated(true);

    // Dependency array kosong: dijalankan hanya sekali saat mount
  }, [checkToken]);

  // Opsional: Tampilkan indikator loading saat status otentikasi sedang divalidasi
  // Ini menghindari 'flash' tombol login/logout.
  if (!hasHydrated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-foreground">Memverifikasi sesi...</span>
      </div>
    );
  }

  return children;
}
