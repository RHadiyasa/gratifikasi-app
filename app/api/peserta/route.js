// src/app/api/peserta/route.js

import { NextResponse } from "next/server";
import dataPeserta from "@/modules/data/peserta_batch_1_elearning_2025.json";
import { connect } from "@/config/dbconfig";
import Status from "@/modules/models/statusModel";

export async function GET() {
  try {
    // 1. Selalu panggil connect()
    await connect();

    // 2. Ambil data status dari MongoDB pakai Model
    const statusDocs = await Status.find({}).lean(); // .lean() agar lebih cepat

    // 3. Ambil data peserta dari JSON
    // (Langkah ini sama)

    // 4. Gabungkan (Merge) Data
    const statusMap = new Map(statusDocs.map((doc) => [doc.nip, doc]));

    const mergedData = dataPeserta.map((peserta) => {
      const statusInfo = statusMap.get(peserta.nip);

      if (statusInfo) {
        return {
          ...peserta,
          status: statusInfo.status,
          s3_key: statusInfo.s3_key,
        };
      } else {
        return {
          ...peserta,
          status: "Belum Upload",
        };
      }
    });

    // 5. Kirim Hasil Gabungan
    return NextResponse.json(mergedData);
  } catch (error) {
    console.error("Gagal memuat data peserta:", error.message);
    return NextResponse.json(
      { error: "Gagal memuat data dari server", details: error.message },
      { status: 500 }
    );
  }
}
