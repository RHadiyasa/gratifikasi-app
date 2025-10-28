// src/app/api/status/route.js
import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import Status from "@/modules/models/statusModel";

export async function POST(req) {
  try {
    // 1. Selalu panggil connect() di awal
    await connect();

    const { nip, s3_key } = await req.json();

    if (!nip || !s3_key) {
      return NextResponse.json(
        { error: "Input tidak lengkap. NIP dan s3_key diperlukan." },
        { status: 400 }
      );
    }

    // 2. Gunakan Model Mongoose (bukan db.collection)
    // Ini adalah operasi 'upsert' di Mongoose:
    await Status.findOneAndUpdate(
      { nip: nip }, // Filter: cari berdasarkan NIP
      {
        // Data: data yang akan di-set
        status: "uploaded",
        s3_key: s3_key,
        uploaded_at: new Date(),
      },
      {
        upsert: true, // Buat baru jika tidak ada
        new: true, // Kembalikan dokumen yang baru
      }
    );

    return NextResponse.json(
      { success: true, message: "Status berhasil disimpan" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gagal menyimpan status ke MongoDB:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
