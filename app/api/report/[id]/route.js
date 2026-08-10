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

export async function GET(req, { params }) {
  const ditolak = await tolakJikaTidakBerhak();

  if (ditolak) return ditolak;

  await connect();
  const { id } = await params;

  try {
    const data = await ReportModel.findById(id);

    if (!data)
      return NextResponse.json(
        { message: "Tidak ditemukan" },
        { status: 404 }
      );

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const ditolak = await tolakJikaTidakBerhak();

  if (ditolak) return ditolak;

  await connect();
  const { id } = await params;
  const body = await req.json();

  try {
    const updated = await ReportModel.findByIdAndUpdate(id, body, {
      new: true,
    });

    return NextResponse.json({ message: "Status diperbarui", data: updated });
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const ditolak = await tolakJikaTidakBerhak();

  if (ditolak) return ditolak;

  await connect();
  const { id } = await params;

  try {
    await ReportModel.findByIdAndDelete(id);

    return NextResponse.json({ message: "Berhasil dihapus" });
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
