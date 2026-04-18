import { google } from "googleapis";

export async function listFilesInFolder(auth, folderId) {
  const drive = google.drive({ version: "v3", auth: await auth.getClient() });
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, modifiedTime)",
    pageSize: 200,
  });
  return res.data.files || [];
}

export async function getFileContent(auth, fileId, mimeType) {
  const drive = google.drive({ version: "v3", auth: await auth.getClient() });
  try {
    if (mimeType === "application/vnd.google-apps.document") {
      const res = await drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" },
      );
      return String(res.data || "").substring(0, 3000);
    }
    if (
      mimeType === "application/pdf" ||
      mimeType?.startsWith("text/") ||
      mimeType?.includes("word") ||
      mimeType?.includes("presentation")
    ) {
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );
      return Buffer.from(res.data).toString("utf8", 0, 3000);
    }
  } catch {
    /* format tidak didukung */
  }
  return null;
}
