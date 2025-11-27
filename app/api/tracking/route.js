import { connect } from "@/config/dbconfig";
import ReportModel from "@/modules/models/ReportModel";

export async function GET(req) {
  try {
    await connect();

    // Ambil parameter uniqueId dari URL
    const { searchParams } = new URL(req.url);
    const uniqueId = searchParams.get("uniqueId");

    if (!uniqueId) {
      return Response.json(
        {
          success: false,
          message: "uniqueId wajib diisi.",
        },
        { status: 400 }
      );
    }

    // Cari laporan berdasarkan uniqueId
    const report = await ReportModel.findOne({ uniqueId });

    if (!report) {
      return Response.json(
        {
          success: false,
          message: "Nomor laporan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        uniqueId: report.uniqueId,
        status: report.status,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Tracking API Error:", error);

    return Response.json(
      {
        success: false,
        message: "Terjadi kesalahan server.",
      },
      { status: 500 }
    );
  }
}