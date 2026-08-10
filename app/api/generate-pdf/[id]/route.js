import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connect } from "@/config/dbconfig";
import ReportModel from "@/modules/models/ReportModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildLaporanPdf } from "@/lib/gratifikasi/buildLaporanPdf";

// Cetak ulang PDF laporan dari data yang tersimpan di database.
// Hanya untuk pengelola gratifikasi — laporan bisa bersifat rahasia.
export async function GET(req, { params }) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    if (!hasPermission(user.role, "report:list")) {
      return NextResponse.json(
        { message: "Anda tidak berhak mengunduh laporan ini." },
        { status: 403 }
      );
    }

    const { id } = await params;

    await connect();

    // Terima _id Mongo maupun nomor laporan (uniqueId)
    const laporan = mongoose.isValidObjectId(id)
      ? await ReportModel.findById(id).lean()
      : await ReportModel.findOne({ uniqueId: id }).lean();

    if (!laporan) {
      return NextResponse.json(
        { message: "Laporan tidak ditemukan." },
        { status: 404 }
      );
    }

    const pdfBytes = await buildLaporanPdf(laporan);

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Laporan-${laporan.uniqueId || "Anon"}.pdf`,
      },
    });
  } catch (error) {
    console.error("Gagal mencetak ulang PDF laporan gratifikasi:", error);

    return NextResponse.json(
      { message: "Gagal membuat PDF laporan gratifikasi." },
      { status: 500 }
    );
  }
}
