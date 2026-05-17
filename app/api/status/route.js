import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";

export async function POST(req) {
  try {
    await connect();

    const { nip, s3_key } = await req.json();

    if (!nip || !s3_key) {
      return NextResponse.json(
        { error: "Input tidak lengkap. NIP dan s3_key diperlukan." },
        { status: 400 }
      );
    }

    const existing = await ElearningParticipant.findOne({ nip });
    if (!existing) {
      return NextResponse.json(
        { error: "Peserta dengan NIP tersebut tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.statusCourse === "Diverifikasi") {
      return NextResponse.json(
        {
          error:
            "Sertifikat Anda sudah diverifikasi oleh admin dan tidak dapat diubah. Hubungi Admin E-Learning jika perlu mengganti.",
          code: "ALREADY_VERIFIED",
        },
        { status: 409 }
      );
    }

    existing.s3_key = s3_key;
    existing.uploaded_at = new Date();
    existing.statusCourse = "Sudah";
    await existing.save();

    return NextResponse.json(
      {
        success: true,
        message: "Status peserta berhasil diperbarui.",
        data: {
          nama: existing.nama,
          nip: existing.nip,
          statusCourse: existing.statusCourse,
          s3_key: existing.s3_key,
          uploaded_at: existing.uploaded_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gagal memperbarui status peserta:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
