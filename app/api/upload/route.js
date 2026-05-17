import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

// Inisialisasi S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_TYPES = ["application/pdf"];
const ALLOWED_EXTENSIONS = ["pdf"];

export async function POST(req) {
  try {
    const { filename, filetype, unit, name } = await req.json();

    if (!filename || !filetype || !unit || !name) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(filetype)) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung. Hanya PDF yang diperbolehkan." },
        { status: 400 }
      );
    }

    const fileExtension = (filename.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: "Ekstensi file tidak didukung. Hanya .pdf yang diperbolehkan." },
        { status: 400 }
      );
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        { error: "AWS_S3_BUCKET_NAME belum dikonfigurasi di server." },
        { status: 500 }
      );
    }

    const safeUnit = unit.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
    const safeName = name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
    const uniqueID = randomUUID().split("-")[0];

    const key = `sertifikat/${safeUnit}/${safeName}-${uniqueID}.${fileExtension}`;

    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: filetype,
    });

    // Minta Presigned URL dari S3
    const signedUrl = await getSignedUrl(
      s3Client,
      putObjectCommand,
      { expiresIn: 60 * 5 } // URL valid selama 5 menit
    );

    return NextResponse.json({
      success: true,
      url: signedUrl,
      key: key, // Kirim key kembali jika Anda ingin menyimpannya di DB
    });

  } catch (error) {
    console.error("Error creating presigned URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}