import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ReportModel from "@/modules/models/ReportModel";
import UpgAdmin from "@/modules/models/UpgAdminModel";

export async function GET() {
  await connect();

  // Ambil semua data laporan & UPG
  const reports = await ReportModel.find({});
  const upgMembers = await UpgAdmin.countDocuments();

  // Hitung total pelapor unik
  const uniquePelapor = new Set(reports.map(r => r.nip || r.nama || r.uniqueId)).size;

  // Hitung total nilai gratifikasi
  const totalNilai = reports.reduce((sum, r) => {
    const nilai = parseInt(r.perkiraanNilai?.replace(/\D/g, "")) || 0;
    return sum + nilai;
  }, 0);

  // Hitung laporan per status
  const perStatus = reports.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  // Hitung laporan per jenis
  const perJenis = reports.reduce((acc, r) => {
    acc[r.reportType] = (acc[r.reportType] || 0) + 1;
    return acc;
  }, {});

  // Buat data tren laporan per bulan (12 bulan terakhir)
  const trend = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const bulan = date.toLocaleString("id-ID", { month: "short" });
    const jumlah = reports.filter(r =>
      new Date(r.createdAt).getMonth() === date.getMonth() &&
      new Date(r.createdAt).getFullYear() === date.getFullYear()
    ).length;
    return { bulan, jumlah };
  });

  // Laporan terbaru
  const recentReports = reports.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return NextResponse.json({
    totalPelapor: uniquePelapor,
    totalNilai,
    perStatus,
    totalUPG: upgMembers,
    perJenis,
    trend,
    recentReports,
  });
}
