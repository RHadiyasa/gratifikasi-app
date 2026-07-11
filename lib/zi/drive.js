import { Readable } from "stream";

import { google } from "googleapis";
import mongoose from "mongoose";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { extractText, getDocumentProxy } from "unpdf";

import { getOcrOAuthClient } from "@/lib/zi/google-auth";
import OcrCache from "@/modules/models/OcrCacheModel";

export async function listFilesInFolder(auth, folderId) {
  const drive = google.drive({ version: "v3", auth: await auth.getClient() });
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, modifiedTime)",
    pageSize: 200,
  });
  return res.data.files || [];
}

async function _listRecursive(drive, folderId, parentPath, maxDepth) {
  if (maxDepth <= 0) return [];
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, modifiedTime)",
    pageSize: 200,
  });
  const items = res.data.files || [];
  const files = [];
  for (const item of items) {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      const subPath = parentPath ? `${parentPath}/${item.name}` : item.name;
      const subFiles = await _listRecursive(drive, item.id, subPath, maxDepth - 1);
      files.push(...subFiles);
    } else {
      files.push({
        ...item,
        path: parentPath ? `${parentPath}/${item.name}` : item.name,
      });
    }
  }
  return files;
}

export async function listFilesRecursive(auth, folderId) {
  const drive = google.drive({ version: "v3", auth: await auth.getClient() });
  return _listRecursive(drive, folderId, "", 5);
}

const MAX_BINARY_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_PAGES = 15; // maks halaman per PDF default

/**
 * Potong PDF menjadi maks N halaman pertama.
 * API Claude limit 100 halaman TOTAL per request — bukan per dokumen.
 */
async function truncatePdf(buffer, maxPages = MAX_PDF_PAGES) {
  let srcDoc;
  try {
    srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch {
    return null;
  }
  const totalPages = srcDoc.getPageCount();
  if (totalPages === 0) return null;
  const keepPages = Math.min(totalPages, maxPages);

  if (totalPages <= maxPages) {
    return {
      type: "document",
      base64: buffer.toString("base64"),
      mimeType: "application/pdf",
      pageCount: totalPages,
    };
  }

  const indices = Array.from({ length: keepPages }, (_, i) => i);
  const trimDoc = await PDFDocument.create();
  const copied = await trimDoc.copyPages(srcDoc, indices);
  for (const page of copied) trimDoc.addPage(page);
  const trimBytes = await trimDoc.save();

  return {
    type: "document",
    base64: Buffer.from(trimBytes).toString("base64"),
    mimeType: "application/pdf",
    pageCount: keepPages,
    totalPages,
  };
}

/**
 * Returns:
 *  - string          → plain-text content (Google Docs, Sheets, Slides, text/*)
 *  - { type, base64, mimeType } → binary document/image for Claude multimodal
 *  - null            → format tidak didukung / terlalu besar
 */
export async function getFileContent(auth, fileId, mimeType, maxPages = MAX_PDF_PAGES) {
  const drive = google.drive({ version: "v3", auth: await auth.getClient() });
  try {
    // Google Docs → export as plain text
    if (mimeType === "application/vnd.google-apps.document") {
      const res = await drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" },
      );
      return String(res.data || "").substring(0, 3000);
    }

    // Google Sheets → export as CSV
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const res = await drive.files.export(
        { fileId, mimeType: "text/csv" },
        { responseType: "text" },
      );
      return String(res.data || "").substring(0, 3000);
    }

    // Google Slides → export as plain text
    if (mimeType === "application/vnd.google-apps.presentation") {
      const res = await drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" },
      );
      return String(res.data || "").substring(0, 3000);
    }

    // PDF → split into chunks of ≤95 pages for Claude API (max 100 per block)
    if (mimeType === "application/pdf") {
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );
      const buffer = Buffer.from(res.data);
      if (buffer.length > MAX_BINARY_SIZE) return null;
      return truncatePdf(buffer, maxPages);
    }

    // Images → base64 image block (Claude vision)
    // Resize to max 2000px (Anthropic limit for many-image requests)
    if (mimeType?.startsWith("image/")) {
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );
      const buffer = Buffer.from(res.data);
      if (buffer.length > MAX_BINARY_SIZE) return null;
      let resized;
      try {
        resized = await sharp(buffer)
          .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
      } catch {
        resized = buffer;
      }
      return { type: "image", base64: resized.toString("base64"), mimeType: "image/jpeg" };
    }

    // Plain text files
    if (mimeType?.startsWith("text/")) {
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" },
      );
      return String(res.data || "").substring(0, 3000);
    }
  } catch {
    /* format tidak didukung */
  }
  return null;
}

// ── Ekstraksi teks penuh (seluruh halaman) untuk penilaian berbasis teks ──────

const MAX_TEXT_PER_FILE = 25000;               // batas karakter teks per file
const MAX_OCR_FILE_SIZE = 50 * 1024 * 1024;    // batas ukuran file untuk konversi Drive

// Cache opsional — dilewati jika koneksi MongoDB belum siap agar tidak
// memblokir proses (mongoose buffering timeout 10 detik per query).
async function readOcrCache(fileId, modifiedTime) {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    const hit = await OcrCache.findOne({ file_id: fileId, modified_time: modifiedTime || "" }).lean();
    return hit ? hit.text : null;
  } catch {
    return null;
  }
}

async function writeOcrCache(fileId, modifiedTime, text) {
  if (mongoose.connection.readyState !== 1) return;
  try {
    await OcrCache.updateOne(
      { file_id: fileId, modified_time: modifiedTime || "" },
      { $set: { text, created_at: new Date() } },
      { upsert: true },
    );
  } catch { /* cache bersifat opsional */ }
}

// Di bawah rata-rata ini per halaman, PDF dianggap hasil scan (butuh OCR)
const MIN_TEXT_PER_PAGE = 40;

/**
 * Ekstraksi text layer PDF secara lokal (tanpa menyentuh Drive).
 * Mayoritas PDF digital (SK, surat dinas, laporan) selesai di jalur ini.
 */
async function extractPdfTextLocally(buffer) {
  // verbosity: 0 — bungkam warning font pdf.js ("TT: undefined function") yang membanjiri log
  const pdf = await getDocumentProxy(new Uint8Array(buffer), { verbosity: 0 });
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { totalPages: totalPages || 1, text: String(text || "").trim() };
}

/**
 * OCR via upload-konversi dengan akun OAuth user: bytes file (yang sudah
 * diunduh service account) diunggah ulang sebagai Google Doc — Drive
 * meng-OCR isinya saat konversi — lalu di-export sebagai teks dan file
 * sementaranya dihapus.
 *
 * Memakai akun OAuth user (bukan service account) karena service account
 * tidak punya kuota penyimpanan Drive. Scope cukup drive.file (hanya file
 * buatan aplikasi ini), dan file temp hidup hanya beberapa detik.
 */
async function ocrViaUploadConvert(buffer, sourceMimeType) {
  const oauth = getOcrOAuthClient();
  if (!oauth) {
    throw new Error(
      "OAuth OCR belum dikonfigurasi (GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN) — OCR dokumen hasil scan dilewati",
    );
  }
  const drive = google.drive({ version: "v3", auth: oauth });
  let tempId = null;
  try {
    const created = await drive.files.create({
      ocrLanguage: "id",
      requestBody: {
        name: "__ocr_temp_lke",
        mimeType: "application/vnd.google-apps.document",
      },
      media: { mimeType: sourceMimeType, body: Readable.from(buffer) },
      fields: "id",
    });
    tempId = created.data.id;
    const res = await drive.files.export(
      { fileId: tempId, mimeType: "text/plain" },
      { responseType: "text" },
    );
    return String(res.data || "");
  } finally {
    if (tempId) {
      drive.files.delete({ fileId: tempId }).catch(() => {});
    }
  }
}

/**
 * Ambil isi file sebagai teks penuh — seluruh halaman, bukan potongan.
 * - Google Docs/Slides → export text/plain; Sheets → export CSV
 * - PDF & gambar → OCR via konversi Drive (hasil di-cache per file_id + modifiedTime)
 * Return string, atau null jika tidak didukung / konversi gagal.
 */
export async function getFileText(auth, file) {
  const drive = google.drive({ version: "v3", auth: await auth.getClient() });
  const { id: fileId, mimeType, modifiedTime } = file;

  try {
    if (
      mimeType === "application/vnd.google-apps.document" ||
      mimeType === "application/vnd.google-apps.presentation"
    ) {
      const res = await drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" },
      );
      return String(res.data || "").substring(0, MAX_TEXT_PER_FILE);
    }

    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const res = await drive.files.export(
        { fileId, mimeType: "text/csv" },
        { responseType: "text" },
      );
      return String(res.data || "").substring(0, MAX_TEXT_PER_FILE);
    }

    if (mimeType?.startsWith("text/")) {
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" },
      );
      return String(res.data || "").substring(0, MAX_TEXT_PER_FILE);
    }

    if (mimeType === "application/pdf") {
      if (file.size && Number(file.size) > MAX_OCR_FILE_SIZE) return null;

      const cached = await readOcrCache(fileId, modifiedTime);
      if (cached) return cached.substring(0, MAX_TEXT_PER_FILE);

      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );
      const buffer = Buffer.from(res.data);

      // 1) Text layer lokal — mayoritas PDF digital selesai di sini
      let text = "";
      try {
        const { totalPages, text: extracted } = await extractPdfTextLocally(buffer);
        if (extracted.length >= MIN_TEXT_PER_PAGE * totalPages) text = extracted;
      } catch (err) {
        console.warn(`[getFileText] Gagal ekstrak text layer "${file.name || fileId}": ${err.message}`);
      }

      // 2) Text layer kosong/minim → PDF hasil scan → OCR via upload-konversi
      if (!text) {
        try {
          text = (await ocrViaUploadConvert(buffer, "application/pdf")).trim();
        } catch (err) {
          console.warn(`[getFileText] OCR gagal untuk "${file.name || fileId}": ${err.message}`);
        }
      }

      if (text) await writeOcrCache(fileId, modifiedTime, text);
      return text ? text.substring(0, MAX_TEXT_PER_FILE) : null;
    }

    if (mimeType?.startsWith("image/")) {
      if (file.size && Number(file.size) > MAX_OCR_FILE_SIZE) return null;

      const cached = await readOcrCache(fileId, modifiedTime);
      if (cached) return cached.substring(0, MAX_TEXT_PER_FILE);

      let text = "";
      try {
        const res = await drive.files.get(
          { fileId, alt: "media" },
          { responseType: "arraybuffer" },
        );
        text = (await ocrViaUploadConvert(Buffer.from(res.data), mimeType)).trim();
      } catch (err) {
        console.warn(`[getFileText] OCR gambar gagal untuk "${file.name || fileId}": ${err.message}`);
      }

      if (text) await writeOcrCache(fileId, modifiedTime, text);
      return text ? text.substring(0, MAX_TEXT_PER_FILE) : null;
    }
  } catch (err) {
    console.warn(`[getFileText] "${file.name || fileId}": ${err.message}`);
  }
  return null;
}
