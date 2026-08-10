import { NextResponse } from "next/server";

import { buildLaporanPdf } from "@/lib/gratifikasi/buildLaporanPdf";

// Dipakai form pelaporan publik di /lapor — sengaja tanpa cek login.
// Untuk cetak ulang dari database oleh admin, lihat ./[id]/route.js
export async function POST(request) {
  try {
    const data = await request.json();
    const pdfBytes = await buildLaporanPdf(data);

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Laporan-${data.uniqueId || "Anon"}.pdf`,
      },
    });
  } catch (error) {
    console.error("Gagal membuat PDF laporan gratifikasi:", error);

    return NextResponse.json(
      { message: "Gagal membuat PDF laporan gratifikasi." },
      { status: 500 }
    );
  }
}
