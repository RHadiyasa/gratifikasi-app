import { google } from "googleapis";
import fs from "fs";

function getGoogleAuth() {
  let credentials;
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } else if (process.env.GOOGLE_CREDENTIALS_FILE && fs.existsSync(process.env.GOOGLE_CREDENTIALS_FILE)) {
    credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_FILE, "utf8"));
  } else {
    throw new Error("Google credentials tidak ditemukan. Set GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY, atau GOOGLE_CREDENTIALS_FILE");
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function extractSheetId(urlOrId) {
  const m = urlOrId.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : urlOrId.trim();
}

// Kolom angka → huruf: 1=A, 19=S, 20=T, 26=Z, 27=AA
function colToLetter(col) {
  let letter = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

// Huruf kolom → angka: A=1, S=19, T=20
function letterToCol(letter) {
  return letter.toUpperCase().split("").reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0);
}

const AI_PATTERN = /^[✅⚠️❌]/u;

// Analisis status satu kolom output dari daftar data rows
function analyzeOutputCol(dataRows, colIndex) {
  const maxCol = Math.max(...dataRows.map((r) => r.length));
  const exists = maxCol >= colIndex + 1;

  if (!exists) return { exists: false, status: "not_exist", sample: null };

  const values = dataRows.map((r) => String(r[colIndex] || "").trim()).filter(Boolean);

  if (values.length === 0) return { exists: true, status: "empty", sample: null };

  const aiCount    = values.filter((v) => AI_PATTERN.test(v)).length;
  const otherCount = values.length - aiCount;

  if (otherCount === 0) return { exists: true, status: "has_ai_data",    sample: values[0] };
  if (aiCount    === 0) return { exists: true, status: "has_other_data", sample: values[0] };
  return                       { exists: true, status: "mixed",          sample: values[0] };
}

// Cari kolom kosong pertama setelah kolom tertentu
function findNextEmptyCol(dataRows, afterCol) {
  for (let c = afterCol + 1; c <= afterCol + 10; c++) {
    const hasData = dataRows.some((r) => String(r[c - 1] || "").trim() !== "");
    if (!hasData) return c;
  }
  return afterCol + 1;
}

// Auto-detect baris data pertama
// Cari baris di mana kolom A berisi angka kecil (ID data, bukan tahun/halaman)
// dan minimal 2 baris berurutan juga punya ID angka → hindari false match header
function detectDataStart(rows) {
  for (let i = 0; i < rows.length - 1; i++) {
    const id      = String(rows[i][0]     || "").trim();
    const idNext  = String(rows[i + 1][0] || "").trim();
    const isDataId     = /^\d+$/.test(id)     && parseInt(id)     <= 9999;
    const isDataIdNext = /^\d+$/.test(idNext) && parseInt(idNext) <= 9999;
    if (isDataId && isDataIdNext) return i;
  }
  // Fallback: baris pertama dengan ID angka ≤ 9999
  for (let i = 0; i < rows.length; i++) {
    const id = String(rows[i][0] || "").trim();
    if (/^\d+$/.test(id) && parseInt(id) <= 9999) return i;
  }
  return 0;
}

const VR_SHEET = "Visa review"; // kolom E = Result AI (index 4)

export async function POST(req) {
  try {
    const { sheetUrl, sheetName } = await req.json();

    if (!sheetUrl?.trim()) {
      return Response.json({ error: "URL sheet wajib diisi" }, { status: 400 });
    }

    const spreadsheetId = extractSheetId(sheetUrl);
    const tabName       = sheetName?.trim() || "Jawaban";

    const COL_ID   = 1;
    const COL_LINK = 14;

    const auth = getGoogleAuth();

    let rows;
    try {
      const authClient = await auth.getClient();
      const sheets     = google.sheets({ version: "v4", auth: authClient });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!A:Z`,
      });
      rows = res.data.values || [];
    } catch (err) {
      if (err.message?.includes("Unable to parse range")) {
        return Response.json({ error: `Tab "${tabName}" tidak ditemukan di sheet ini` }, { status: 404 });
      }
      if (err.message?.includes("not found") || err.status === 404) {
        return Response.json({ error: "Sheet tidak ditemukan. Pastikan ID benar dan service account sudah diberi akses" }, { status: 404 });
      }
      throw err;
    }

    const dataStart = detectDataStart(rows);

    const allDataRows = rows.slice(dataStart).filter((row) => {
      const id = String(row[COL_ID - 1] || "").trim();
      return /^\d+$/.test(id) && parseInt(id) <= 9999;
    });

    const dataRows = allDataRows.filter((row) =>
      String(row[COL_LINK - 1] || "").trim().includes("drive.google")
    );

    const total  = allDataRows.length;
    const noLink = allDataRows.length - dataRows.length;

    // ── Hitung checked dari Visa review ──────────────────────────
    // Visa review columns: A=ID, B=Bukti, C=Link, D=FP, E=Result AI, F=Reviu, G=Supervisi
    const vrCheckedIds = new Set();
    try {
      const authClient = await auth.getClient();
      const sheets     = google.sheets({ version: "v4", auth: authClient });
      const vrRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${VR_SHEET}!A:E`,
      });
      const vrRows = vrRes.data.values || [];
      for (let i = 1; i < vrRows.length; i++) { // skip header
        const vrIdCell = String(vrRows[i][0] || "").trim(); // kolom A = ID
        const vrResult = String(vrRows[i][4] || "").trim(); // kolom E = Result AI
        if (vrIdCell && AI_PATTERN.test(vrResult)) vrCheckedIds.add(vrIdCell);
      }
    } catch {
      // Visa review belum ada — semua dianggap belum dicek
    }

    const checked   = allDataRows.filter((r) => vrCheckedIds.has(String(r[COL_ID - 1] || "").trim())).length;
    const unchecked = total - checked;

    // IDs yang belum punya hasil AI di Visa review
    const nextIds = dataRows
      .filter((r) => !vrCheckedIds.has(String(r[COL_ID - 1] || "").trim()))
      .slice(0, 5)
      .map((r) => String(r[COL_ID - 1]).trim());

    return Response.json({
      total,
      checked,
      unchecked,
      noLink,
      nextIds,
      tabName,
      dataStart,
      // colStatus dan suggested masih dikembalikan untuk kompatibilitas UI
      colStatus: {
        reviu:  { status: "visa_review", col: 19, letter: "S" },
        result: { status: "visa_review", col: 20, letter: "T" },
      },
      suggested: {
        reviu:  { col: 19, letter: "S" },
        result: { col: 20, letter: "T" },
      },
      needsColOverride: false,
      visaReview: true, // flag bahwa output AI ada di sheet Visa review
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
