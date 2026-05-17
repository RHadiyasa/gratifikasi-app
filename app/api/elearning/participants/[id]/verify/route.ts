import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionUser({ includeProfile: true });
    if (!hasPermission(session?.role, "elearning:participants:manage")) {
      return NextResponse.json(
        { success: false, message: "Anda tidak punya akses untuk memverifikasi sertifikat." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const note: string = typeof body?.note === "string" ? body.note.slice(0, 300) : "";

    await connect();
    const peserta = await ElearningParticipant.findById(id);
    if (!peserta) {
      return NextResponse.json(
        { success: false, message: "Peserta tidak ditemukan." },
        { status: 404 }
      );
    }
    if (!peserta.s3_key) {
      return NextResponse.json(
        {
          success: false,
          message: "Peserta belum mengupload sertifikat — tidak bisa diverifikasi.",
        },
        { status: 400 }
      );
    }

    peserta.statusCourse = "Diverifikasi";
    peserta.verified_at = new Date();
    peserta.verified_by =
      session?.name || session?.nip || session?.id || "admin";
    if (note) peserta.verify_note = note;
    await peserta.save();

    return NextResponse.json({
      success: true,
      message: "Sertifikat berhasil diverifikasi.",
      data: {
        _id: peserta._id,
        statusCourse: peserta.statusCourse,
        verified_at: peserta.verified_at,
        verified_by: peserta.verified_by,
        verify_note: peserta.verify_note,
      },
    });
  } catch (error: any) {
    console.error("Gagal verify peserta:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memverifikasi sertifikat.", error: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionUser();
    if (!hasPermission(session?.role, "elearning:participants:manage")) {
      return NextResponse.json(
        { success: false, message: "Anda tidak punya akses untuk membatalkan verifikasi." },
        { status: 403 }
      );
    }

    const { id } = await params;

    await connect();
    const peserta = await ElearningParticipant.findById(id);
    if (!peserta) {
      return NextResponse.json(
        { success: false, message: "Peserta tidak ditemukan." },
        { status: 404 }
      );
    }

    peserta.statusCourse = peserta.s3_key ? "Sudah" : "Belum";
    peserta.verified_at = null;
    peserta.verified_by = null;
    peserta.verify_note = "";
    await peserta.save();

    return NextResponse.json({
      success: true,
      message: "Verifikasi sertifikat dibatalkan.",
      data: {
        _id: peserta._id,
        statusCourse: peserta.statusCourse,
      },
    });
  } catch (error: any) {
    console.error("Gagal unverify peserta:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membatalkan verifikasi.", error: error?.message },
      { status: 500 }
    );
  }
}
