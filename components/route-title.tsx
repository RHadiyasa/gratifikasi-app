"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const APP_NAME = "Visa Assistant";

const exactTitles: Record<string, string> = {
  "/": "Home",
  "/about": "Inspektorat V",
  "/dashboard": "Dashboard",
  "/dashboard/accounts": "Manajemen Akun",
  "/dashboard/report-list": "Daftar Laporan",
  "/dashboard/upg": "Dashboard Gratifikasi",
  "/dashboard/zi": "Dashboard Zona Integritas",
  "/dashboard/zi/kriteria": "Master Kriteria ZI",
  "/docs": "Panduan",
  "/e-learning": "E-Learning",
  "/e-learning/participants": "Peserta E-Learning",
  "/e-learning/tracker": "Tracker E-Learning",
  "/e-learning/upload": "Upload Sertifikat",
  "/gratifikasi": "Gratifikasi",
  "/lapor": "Lapor Gratifikasi",
  "/login": "Login",
  "/panduan": "Panduan",
  "/profile": "Profile Akun",
  "/register": "Register Akun",
  "/zona-integritas": "Zona Integritas",
  "/zona-integritas/lke-checker": "LKE Checker",
  "/zona-integritas/monitoring": "Monitoring ZI",
};

function resolveRouteTitle(pathname: string) {
  if (exactTitles[pathname]) return exactTitles[pathname];

  if (/^\/dashboard\/report-list\/[^/]+/.test(pathname)) {
    return "Detail Laporan";
  }

  if (/^\/zona-integritas\/lke-checker\/[^/]+\/input/.test(pathname)) {
    return "Input LKE";
  }

  if (/^\/zona-integritas\/lke-checker\/[^/]+/.test(pathname)) {
    return "Detail LKE";
  }

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    );

  return segments.at(-1) || "Home";
}

export function RouteTitle() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    document.title = `${resolveRouteTitle(pathname)} - ${APP_NAME}`;
  }, [pathname]);

  return null;
}
