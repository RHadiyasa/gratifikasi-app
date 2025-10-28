// src/app/api/upload/route.js
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

export async function POST(req) {
  try {
    const { filename, filetype, unit, name } = await req.json();

    if (!filename || !filetype || !unit || !name) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    // Buat nama file yang unik dan terstruktur
    // Format: sertifikat/NAMA_UNIT/NAMA_PESERTA-UUID.pdf
    const safeUnit = unit.replace(/[^a-zA-Z0-9]/g, "_");
    const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
    const uniqueID = randomUUID().split("-")[0]; // ID unik singkat
    const fileExtension = filename.split(".").pop();
    
    // Ini akan menjadi path file di S3
    const key = `sertifikat/${safeUnit}/${safeName}-${uniqueID}.${fileExtension}`;


    // Buat command untuk S3
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