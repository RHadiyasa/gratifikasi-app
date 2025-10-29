// src/app/api/status/route.js
import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";

export async function POST(req) {
  try {
    // 1️⃣ Koneksi ke MongoDB
    await connect();

    // 2️⃣ Ambil body dari request
    const { nip, s3_key } = await req.json();

    if (!nip || !s3_key) {
      return NextResponse.json(
        { error: "Input tidak lengkap. NIP dan s3_key diperlukan." },
        { status: 400 }
      );
    }

    // 3️⃣ Update status peserta
    const updatedParticipant = await ElearningParticipant.findOneAndUpdate(
      { nip }, // cari berdasarkan NIP
      {
        s3_key,
        uploaded_at: new Date(),
        statusCourse: "Sudah",
      },
      { new: true } // kembalikan dokumen setelah update
    );

    // 4️⃣ Jika peserta tidak ditemukan
    if (!updatedParticipant) {
      return NextResponse.json(
        { error: "Peserta dengan NIP tersebut tidak ditemukan." },
        { status: 404 }
      );
    }

    // 5️⃣ Respons sukses
    return NextResponse.json(
      {
        success: true,
        message: "Status peserta berhasil diperbarui.",
        data: {
          nama: updatedParticipant.nama,
          nip: updatedParticipant.nip,
          statusCourse: updatedParticipant.statusCourse,
          s3_key: updatedParticipant.s3_key,
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
