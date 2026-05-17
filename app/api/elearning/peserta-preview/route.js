import { NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const NIP_REGEX = /^\d{18}$/;

/**
 * POST /api/elearning/peserta-preview
 * Body: { nip: "199811222025061013" }
 *
 * Endpoint publik (peserta tidak login) untuk lihat sertifikat MILIK SENDIRI.
 * Validasi: NIP harus 18 digit angka dan tercatat di DB dengan s3_key.
 */
export async function POST(req) {
  try {
    if (!BUCKET_NAME) {
      return NextResponse.json(
        { error: "AWS_S3_BUCKET_NAME belum dikonfigurasi di server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const nip = (body?.nip ?? "").toString().replace(/\s+/g, "");

    if (!NIP_REGEX.test(nip)) {
      return NextResponse.json(
        { error: "NIP tidak valid. Harus 18 digit angka." },
        { status: 400 }
      );
    }

    await connect();
    const peserta = await ElearningParticipant.findOne({ nip })
      .select("nama nip s3_key statusCourse uploaded_at")
      .lean();

    if (!peserta) {
      return NextResponse.json(
        { error: "Peserta tidak ditemukan." },
        { status: 404 }
      );
    }
    if (!peserta.s3_key) {
      return NextResponse.json(
        { error: "Peserta belum mengupload sertifikat." },
        { status: 404 }
      );
    }
    if (!peserta.s3_key.startsWith("sertifikat/")) {
      return NextResponse.json(
        { error: "Key sertifikat tidak valid." },
        { status: 400 }
      );
    }

    // Lazy reconcile: cek dulu apakah file masih ada di S3.
    // Kalau sudah dihapus dari S3 (misal manual via console), reset status DB.
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: peserta.s3_key,
        })
      );
    } catch (headErr) {
      const status = headErr?.$metadata?.httpStatusCode;
      const isMissing =
        status === 404 ||
        headErr?.name === "NotFound" ||
        headErr?.Code === "NotFound" ||
        headErr?.Code === "NoSuchKey";

      if (isMissing) {
        await ElearningParticipant.updateOne(
          { _id: peserta._id },
          {
            $set: {
              statusCourse: "Belum",
              s3_key: null,
              uploaded_at: null,
              verified_at: null,
              verified_by: null,
              verify_note: "",
            },
          }
        );
        return NextResponse.json(
          {
            error:
              "File sertifikat tidak ditemukan di server (sudah dihapus). Status sudah direset, silakan upload ulang.",
            code: "FILE_GONE",
            reconciled: true,
          },
          { status: 404 }
        );
      }
      throw headErr;
    }

    const fileName = peserta.s3_key.split("/").pop() || "sertifikat.pdf";

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: peserta.s3_key,
      ResponseContentDisposition: `inline; filename="${fileName}"`,
      ResponseContentType: "application/pdf",
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return NextResponse.json({
      success: true,
      url,
      uploaded_at: peserta.uploaded_at,
      statusCourse: peserta.statusCourse,
    });
  } catch (error) {
    console.error("Error generating preview URL:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan preview sertifikat." },
      { status: 500 }
    );
  }
}
