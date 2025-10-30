import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 1. Inisialisasi Klien S3
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
        const { searchParams } = new URL(request.url);
        const s3Key = searchParams.get('key');

        if (!s3Key) {
            return NextResponse.json(
                { error: "Query parameter 'key' (s3Key) diperlukan." },
                { status: 400 }
            );
        }
        
        // Ekstrak nama file bersih dari s3Key untuk digunakan sebagai nama unduhan
        const fileName = s3Key.split('/').pop() || 'document.pdf';

        // 2. Membuat Command untuk mendapatkan objek DENGAN Content-Disposition
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            // KOREKSI UTAMA: Menambahkan ResponseContentDisposition
            // Ini akan menambahkan header Content-Disposition: attachment;... ke URL S3
            ResponseContentDisposition: `attachment; filename="${fileName}"`
        });

        // 3. Generate Presigned URL
        // Link berlaku selama 300 detik (5 menit)
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // 4. Mengembalikan URL yang sudah ditandatangani
        return NextResponse.json({ url: presignedUrl });

    } catch (error) {
        console.error("Error generating signed URL:", error);
        return NextResponse.json(
            { error: "Gagal memproses permintaan URL dokumen." },
            { status: 500 }
        );
    }
}