import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/elearning/participants/[id]/reset
 * Body (opsional): { "deleteFile": true }
 *
 * Reset status peserta jadi "Belum" + clear s3_key + verified fields.
 * Kalau deleteFile=true, juga hapus file di S3 (best-effort, tidak fatal kalau gagal).
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionUser({ includeProfile: true });
    if (!hasPermission(session?.role, "elearning:participants:manage")) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak punya akses untuk reset status upload.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const deleteFile = body?.deleteFile === true;

    await connect();
    const peserta = await ElearningParticipant.findById(id);
    if (!peserta) {
      return NextResponse.json(
        { success: false, message: "Peserta tidak ditemukan." },
        { status: 404 }
      );
    }

    const previousKey = peserta.s3_key;
    const previousStatus = peserta.statusCourse;

    let s3DeleteResult: "skipped" | "deleted" | "failed" = "skipped";
    if (deleteFile && previousKey && BUCKET_NAME) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: previousKey,
          })
        );
        s3DeleteResult = "deleted";
      } catch (s3Err) {
        console.error("Gagal hapus file S3 saat reset:", s3Err);
        s3DeleteResult = "failed";
        // Lanjut reset DB walau S3 delete gagal — file mungkin sudah tidak ada
      }
    }

    peserta.statusCourse = "Belum";
    peserta.s3_key = undefined;
    peserta.uploaded_at = null;
    peserta.verified_at = null;
    peserta.verified_by = null;
    peserta.verify_note = "";
    await peserta.save();

    return NextResponse.json({
      success: true,
      message: "Status upload peserta berhasil direset.",
      data: {
        _id: peserta._id,
        statusCourse: peserta.statusCourse,
        previousStatus,
        previousKey,
        s3DeleteResult,
      },
    });
  } catch (error: any) {
    console.error("Gagal reset peserta:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal reset status peserta.",
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
