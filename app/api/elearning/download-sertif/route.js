import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-southeast-2",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export async function GET(request) {
    try {
        const session = await getSessionUser();
        if (!hasPermission(session?.role, "elearning:participants")) {
            return NextResponse.json(
                { error: "Anda tidak punya akses untuk mengunduh sertifikat." },
                { status: 403 }
            );
        }

        if (!BUCKET_NAME) {
            return NextResponse.json(
                { error: "AWS_S3_BUCKET_NAME belum dikonfigurasi di server." },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const s3Key = searchParams.get('key');

        if (!s3Key) {
            return NextResponse.json(
                { error: "Query parameter 'key' (s3Key) diperlukan." },
                { status: 400 }
            );
        }

        if (!s3Key.startsWith("sertifikat/")) {
            return NextResponse.json(
                { error: "Key tidak valid." },
                { status: 400 }
            );
        }

        const fileName = s3Key.split('/').pop() || 'document.pdf';

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            ResponseContentDisposition: `attachment; filename="${fileName}"`
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return NextResponse.json({ url: presignedUrl });

    } catch (error) {
        console.error("Error generating signed URL:", error);
        return NextResponse.json(
            { error: "Gagal memproses permintaan URL dokumen." },
            { status: 500 }
        );
    }
}