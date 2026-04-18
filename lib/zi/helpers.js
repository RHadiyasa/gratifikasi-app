export function colToLetter(col) {
  let letter = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export function letterToCol(letter) {
  if (!letter) return null;
  const str = String(letter).trim().toUpperCase();
  if (/^\d+$/.test(str)) return parseInt(str);
  return str.split("").reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0);
}

export function extractSheetId(urlOrId) {
  const m = urlOrId.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : urlOrId.trim();
}

export function extractFolderId(driveUrl) {
  if (!driveUrl) return null;
  const patterns = [
    /folders\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pat of patterns) {
    const m = driveUrl.match(pat);
    if (m) return m[1];
  }
  return null;
}

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export function computeFingerprint(files) {
  if (!files || files.length === 0) return "empty";
  return files
    .map((f) => `${f.id}:${f.modifiedTime || ""}`)
    .sort()
    .join("|");
}

// Auto-detect baris data pertama
// Cari baris di mana kolom A berisi angka kecil (ID data, bukan tahun/halaman)
// dan minimal 2 baris berurutan juga punya ID angka
export function detectDataStart(rows) {
  for (let i = 0; i < rows.length - 1; i++) {
    const id = String(rows[i][0] || "").trim();
    const idNext = String(rows[i + 1][0] || "").trim();
    const isDataId = /^\d+$/.test(id) && parseInt(id) <= 9999;
    const isDataIdNext = /^\d+$/.test(idNext) && parseInt(idNext) <= 9999;
    if (isDataId && isDataIdNext) return i;
  }
  for (let i = 0; i < rows.length; i++) {
    const id = String(rows[i][0] || "").trim();
    if (/^\d+$/.test(id) && parseInt(id) <= 9999) return i;
  }
  return 0;
}

export function countStats(results) {
  return {
    total: results.length,
    sesuai: results.filter((r) => r.verdict?.color === "HIJAU").length,
    sebagian: results.filter((r) => r.verdict?.color === "KUNING").length,
    tidak: results.filter((r) => r.verdict?.color === "MERAH").length,
  };
}
