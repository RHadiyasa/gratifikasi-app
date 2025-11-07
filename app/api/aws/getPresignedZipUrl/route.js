import { NextResponse } from "next/server";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import AWS from "aws-sdk";
import JSZip from "jszip";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const unitName = searchParams.get("unit");

    if (!unitName) {
      return NextResponse.json(
        { success: false, message: "Parameter 'unit' diperlukan." },
        { status: 400 }
      );
    }

    await connect();

    // Ambil peserta
    const participants = await ElearningParticipant.find({
      unit_eselon_i: unitName,
      statusCourse: "Sudah",
      s3_key: { $exists: true, $ne: null },
    }).select("s3_key nama");

    if (!participants.length) {
      return NextResponse.json(
        { success: false, message: "Tidak ada sertifikat untuk unit ini." },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    for (const p of participants) {
      const file = await s3
        .getObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: p.s3_key,
        })
        .promise();

      zip.file(`${p.nama}.pdf`, file.Body);
    }

    // Buat buffer ZIP
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const zipName = `${unitName.replace(/\s+/g, "_")}_certificates.zip`;

    // Kirim langsung ke browser
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
      },
    });
  } catch (error) {
    console.error("Error creating ZIP:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat ZIP file",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
