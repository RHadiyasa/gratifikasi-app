// src/app/api/s3/presigned-url/route.js

import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 1. Inisialisasi Klien S3
// Klien S3 diinisialisasi sekali dan menggunakan Environment Variables
// (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) dari .env.local
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-southeast-2", // Pastikan region sesuai
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const BUCKET_NAME = "gratifikasi-app"; // Ganti dengan nama bucket Anda

/**
 * Handler GET untuk Next.js App Router.
 * URL: /api/s3/presigned-url?key=<s3_key_file>
 */
export async function GET(request) {
    try {
        // Mendapatkan URLSearchParams dari request
        const { searchParams } = new URL(request.url);
        const s3Key = searchParams.get('key');

        if (!s3Key) {
            return NextResponse.json(
                { error: "Query parameter 'key' (s3Key) diperlukan." },
                { status: 400 }
            );
        }

        // 2. Membuat Command untuk mendapatkan objek
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
        });

        // 3. Generate Presigned URL
        // Link berlaku selama 300 detik (5 menit)
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // 4. Mengembalikan URL yang sudah ditandatangani
        return NextResponse.json({ url: presignedUrl });

    } catch (error) {
        console.error("Error generating signed URL:", error);
        // Mengembalikan error 500 ke frontend
        return NextResponse.json(
            { error: "Gagal memproses permintaan URL dokumen." },
            { status: 500 }
        );
    }
}

// Opsional: Jika Anda ingin membatasi metode, Anda bisa menghapus fungsi lainnya.
// Atau tambahkan:
// export async function POST() { return NextResponse.json({ message: "Method not supported" }, { status: 405 }); }