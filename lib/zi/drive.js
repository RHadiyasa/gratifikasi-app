import { google } from "googleapis";
import { PDFDocument } from "pdf-lib";

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
const MAX_PDF_PAGES = 15; // maks halaman per PDF (total request limit 100)

/**
 * Potong PDF menjadi maks N halaman pertama.
 * API Claude limit 100 halaman TOTAL per request — bukan per dokumen.
 */
async function truncatePdf(buffer) {
  let srcDoc;
  try {
    srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch {
    // PDF corrupt / bukan PDF valid — skip
    return null;
  }
  const totalPages = srcDoc.getPageCount();
  if (totalPages === 0) return null;
  const keepPages = Math.min(totalPages, MAX_PDF_PAGES);

  if (totalPages <= MAX_PDF_PAGES) {
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
export async function getFileContent(auth, fileId, mimeType) {
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
      return truncatePdf(buffer);
    }

    // Images → base64 image block (Claude vision)
    if (mimeType?.startsWith("image/")) {
      const supported = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const mt = supported.includes(mimeType) ? mimeType : "image/png";
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );
      const buffer = Buffer.from(res.data);
      if (buffer.length > MAX_BINARY_SIZE) return null;
      return { type: "image", base64: buffer.toString("base64"), mimeType: mt };
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
