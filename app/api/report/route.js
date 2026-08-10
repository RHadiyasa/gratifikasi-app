import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ReportModel from "@/modules/models/ReportModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * Pastikan pemanggil berhak mengakses data laporan.
 * @returns {Promise<NextResponse|null>} response penolakan, atau null kalau boleh
 */
async function tolakJikaTidakBerhak() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { message: "Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (!hasPermission(user.role, "report:list")) {
    return NextResponse.json(
      { message: "Anda tidak berhak mengakses data laporan." },
      { status: 403 }
    );
  }

  return null;
}

// Endpoint publik: dipakai form pelaporan di /lapor, tanpa login.
export async function POST(req) {
  try {
    await connect();
    const body = await req.json();

    // save report
    const report = await ReportModel.create(body);

    return NextResponse.json(
      { message: "Laporan berhasil dibuat", data: report },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST ERROR", error);

    return NextResponse.json(
      {
        message: "Gagal Menyimpan Laporan",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Daftar laporan berisi data pelapor dan laporan rahasia — wajib login.
export async function GET() {
  const ditolak = await tolakJikaTidakBerhak();

  if (ditolak) return ditolak;

  await connect();

  try {
    const response = await ReportModel.find().sort({ createdAt: -1 });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
