import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const ALLOWED_TYPES = ["application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const unit = formData.get("unit");
    const name = formData.get("name");

    if (!file || !unit || !name) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung. Hanya PDF yang diperbolehkan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5 MB." },
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

    const fileExtension = (file.name.split(".").pop() || "pdf").toLowerCase();
    const safeUnit = unit.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
    const safeName = name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
    const uniqueID = randomUUID().split("-")[0];
    const key = `sertifikat/${safeUnit}/${safeName}-${uniqueID}.${fileExtension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return NextResponse.json(
      { error: "Gagal mengupload file ke server." },
      { status: 500 }
    );
  }
}
