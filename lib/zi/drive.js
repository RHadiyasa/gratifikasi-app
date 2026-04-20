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
