import { google } from "googleapis";
import Anthropic from "@anthropic-ai/sdk";
import ExcelJS from "exceljs";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import os from "os";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";

// ── Auth Google ──────────────────────────────────────────
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
    throw new Error(
      "Google credentials tidak ditemukan. Set GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY, atau GOOGLE_CREDENTIALS_FILE",
    );
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });
}

// ── Helpers ──────────────────────────────────────────────
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

function extractSheetId(urlOrId) {
  const m = urlOrId.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : urlOrId.trim();
}

function extractFolderId(driveUrl) {
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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Google Sheets ────────────────────────────────────────
async function readSheet(auth, spreadsheetId, sheetName, range = "A:Z") {
  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${range}`,
  });
  return res.data.values || [];
}

// Ambil metadata sheet, kembalikan properties (sheetId, gridProperties)
async function getSheetProps(sheets, spreadsheetId, sheetName) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties))",
  });
  const sheet = meta.data.sheets?.find((s) => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Tab "${sheetName}" tidak ditemukan`);
  return sheet.properties;
}

// Pastikan sheet punya cukup kolom (expand jika perlu)
async function ensureColumns(sheets, spreadsheetId, sheetProps, neededCols) {
  const current = sheetProps.gridProperties.columnCount;
  if (neededCols <= current) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          appendDimension: {
            sheetId: sheetProps.sheetId,
            dimension: "COLUMNS",
            length: neededCols - current,
          },
        },
      ],
    },
  });
}

// Tulis nilai ke beberapa sel
async function writeCells(sheets, spreadsheetId, sheetName, updates) {
  const data = updates.map(({ row, col, value }) => ({
    range: `${sheetName}!${colToLetter(col)}${row}`,
    values: [[value]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data },
  });
}

// Set dropdown validasi di range kolom supervisi
async function setSupervisiDropdown(
  sheets,
  spreadsheetId,
  sheetProps,
  supervisiCol,
  startRow,
  endRow,
) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId: sheetProps.sheetId,
              startRowIndex: startRow - 1, // 0-indexed inclusive
              endRowIndex: endRow, // 0-indexed exclusive
              startColumnIndex: supervisiCol - 1,
              endColumnIndex: supervisiCol,
            },
            rule: {
              condition: {
                type: "ONE_OF_LIST",
                values: [
                  { userEnteredValue: "Sudah Dicek AI" },
                  { userEnteredValue: "Revisi" },
                ],
              },
              showCustomUi: true,
              strict: false,
            },
          },
        },
      ],
    },
  });
}

async function batchUpdateCells(auth, spreadsheetId, sheetName, updates) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const maxCol = Math.max(...updates.map((u) => u.col));
  const props = await getSheetProps(sheets, spreadsheetId, sheetName);
  await ensureColumns(sheets, spreadsheetId, props, maxCol);
  await writeCells(sheets, spreadsheetId, sheetName, updates);
  return props; // kembalikan props untuk pemakaian selanjutnya
}

// ── Ringkasan AI Sheet ───────────────────────────────────
const RA_SHEET = "Ringkasan AI";

async function ensureRingkasanAiSheet(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))",
  });
  const exists = meta.data.sheets?.some((s) => s.properties.title === RA_SHEET);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: RA_SHEET } } }],
    },
  });
}

async function writeRingkasanAi(sheets, spreadsheetId, nilaiLkeAi, target) {
  await ensureRingkasanAiSheet(sheets, spreadsheetId);
  const n = nilaiLkeAi;
  const tgl = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const rows = [
    ["KOMPONEN", "NILAI AI"],
    ["Manajemen Perubahan", n.pengungkit.manajemen_perubahan.nilai ?? 0],
    ["Penataan Tatalaksana", n.pengungkit.penataan_tatalaksana.nilai ?? 0],
    ["Penataan SDM", n.pengungkit.penataan_sdm.nilai ?? 0],
    [
      "Penguatan Akuntabilitas",
      n.pengungkit.penguatan_akuntabilitas.nilai ?? 0,
    ],
    ["Penguatan Pengawasan", n.pengungkit.penguatan_pengawasan.nilai ?? 0],
    ["Peningkatan Pelayanan", n.pengungkit.peningkatan_pelayanan.nilai ?? 0],
    ["Total Pengungkit", n.pengungkit.total.nilai ?? 0],
    ["IPAK", n.hasil.birokrasi_bersih.ipak.nilai ?? 0],
    ["Capaian Kinerja", n.hasil.birokrasi_bersih.capaian_kinerja.nilai ?? 0],
    ["Birokrasi Bersih", n.hasil.birokrasi_bersih.total.nilai ?? 0],
    ["IPKP", n.hasil.pelayanan_prima.ipkp.nilai ?? 0],
    ["Pelayanan Prima", n.hasil.pelayanan_prima.total.nilai ?? 0],
    ["Total Hasil", n.hasil.total.nilai ?? 0],
    ["NILAI AKHIR", n.nilai_akhir ?? 0],
    ["Target", target],
    ["Terakhir Diperbarui", tgl],
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${RA_SHEET}'!A1:B17`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

// ── Visa Review Sheet ────────────────────────────────────
const VR_SHEET = "Visa review";
const VR_COL = {
  ID: 1, // A
  BUKTI: 2, // B
  LINK: 3, // C
  FINGERPRINT: 4, // D
  RESULT: 5, // E
  REVIU: 6, // F
  SUPERVISI: 7, // G
  TGL_CEK: 8, // H
  KOMPONEN: 9, // I
  BOBOT: 10, // J
  NILAI_AI: 11, // K
};
const VR_HEADER = [
  "ID",
  "Bukti Data",
  "Link Dicek",
  "Fingerprint",
  "Result AI",
  "Reviu AI",
  "Status Supervisi",
  "Tgl Cek",
  "Komponen",
  "Bobot",
  "Nilai AI",
];

function computeFingerprint(files) {
  if (!files || files.length === 0) return "empty";
  return files
    .map((f) => `${f.id}:${f.modifiedTime || ""}`)
    .sort()
    .join("|");
}

// Pastikan sheet "Visa review" ada; buat jika belum; kembalikan properties
async function ensureVisaReviewSheet(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties))",
  });
  const existing = meta.data.sheets?.find(
    (s) => s.properties.title === VR_SHEET,
  );
  if (existing) {
    // Pastikan header sudah punya kolom baru (I, J, K)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${VR_SHEET}!A1:K1`,
      valueInputOption: "RAW",
      requestBody: { values: [VR_HEADER] },
    });
    return existing.properties;
  }

  // Buat sheet baru
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: VR_SHEET } } }],
    },
  });
  // Tulis header
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${VR_SHEET}!A1:K1`,
    valueInputOption: "RAW",
    requestBody: { values: [VR_HEADER] },
  });
  // Ambil properties baru
  const meta2 = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties))",
  });
  return meta2.data.sheets?.find((s) => s.properties.title === VR_SHEET)
    ?.properties;
}

// Baca Visa review, kembalikan map ID → entry dan totalRows (termasuk header)
async function readVisaReviewMap(auth, spreadsheetId) {
  try {
    const rows = await readSheet(auth, spreadsheetId, VR_SHEET, "A:H");
    const map = {};
    // rows[0] = header, rows[1+] = data
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const id = String(row[VR_COL.ID - 1] || "").trim();
      if (!id) continue;
      map[id] = {
        rowNum: i + 1, // 1-indexed sheet row
        linkDicek: String(row[VR_COL.LINK - 1] || ""),
        fingerprint: String(row[VR_COL.FINGERPRINT - 1] || ""),
        result: String(row[VR_COL.RESULT - 1] || ""),
        supervisi: String(row[VR_COL.SUPERVISI - 1] || ""),
      };
    }
    return { map, totalRows: rows.length }; // totalRows incl. header
  } catch (err) {
    if (
      err.message?.includes("Unable to parse range") ||
      err.message?.includes("not found") ||
      err.status === 404
    ) {
      return { map: {}, totalRows: 0 };
    }
    throw err;
  }
}

// Tulis updates ke Visa review: existing rows di-overwrite, baris baru di-append
async function writeVisaReviewRows(
  sheets,
  spreadsheetId,
  existingUpdates,
  newRows,
) {
  if (existingUpdates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: existingUpdates.map(({ rowNum, rowData }) => ({
          range: `${VR_SHEET}!A${rowNum}:K${rowNum}`,
          values: [rowData],
        })),
      },
    });
  }
  if (newRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${VR_SHEET}!A:K`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: newRows },
    });
  }
}

// Set dropdown Sudah Dicek AI / Revisi pada kolom Status Supervisi
async function setVisaReviewDropdown(
  sheets,
  spreadsheetId,
  sheetProps,
  totalDataRows,
) {
  if (totalDataRows <= 0) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId: sheetProps.sheetId,
              startRowIndex: 1, // baris 2 (0-indexed)
              endRowIndex: 1 + totalDataRows, // exclusive (0-indexed)
              startColumnIndex: VR_COL.SUPERVISI - 1,
              endColumnIndex: VR_COL.SUPERVISI,
            },
            rule: {
              condition: {
                type: "ONE_OF_LIST",
                values: [
                  { userEnteredValue: "Sudah Dicek AI" },
                  { userEnteredValue: "Revisi" },
                ],
              },
              showCustomUi: true,
              strict: false,
            },
          },
        },
      ],
    },
  });
}

// ── Google Drive ─────────────────────────────────────────
async function listFilesInFolder(auth, folderId) {
  const drive = google.drive({ version: "v3", auth: await auth.getClient() });
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, modifiedTime)",
    pageSize: 200,
  });
  return res.data.files || [];
}

async function getFileContent(auth, fileId, mimeType) {
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

// ── Checker AI ───────────────────────────────────────────
async function checkWithAI(files, fileContents, standarText, id) {
  if (!files || files.length === 0) {
    return {
      score: 0,
      verdict: "Tidak Ada File",
      dokumenAda: [],
      dokumenKurang: [],
      detail: "Tidak ada file di folder Drive",
      basedOn: "none",
    };
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const hasContent = fileContents && fileContents.some(Boolean);
  const fileList = files
    .map((f) => `- ${f.name} (${f.mimeType || "unknown"})`)
    .join("\n");
  const contentSection = hasContent
    ? `\nSAMPEL ISI FILE:\n${fileContents
        .map((c, i) => (c ? `=== ${files[i]?.name} ===\n${c}` : null))
        .filter(Boolean)
        .join("\n\n")
        .substring(0, 3500)}`
    : "\n(Konten tidak dapat dibaca — nilai dari nama file saja.)";

  const prompt = `Kamu adalah validator dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

STANDAR DOKUMEN untuk ID ${id}:
${standarText}

DAFTAR FILE di folder Google Drive:
${fileList}
${contentSection}

INSTRUKSI:
- Nilai kesesuaian berdasarkan nama file dan isi (jika ada)
- Nama file relevan sudah merupakan bukti keberadaan dokumen
- Jika nama file mengandung kata kunci dari standar, anggap dokumen ADA
- Berikan skor realistis: jika file relevan ada, minimal 60

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","dokumenAda":[],"dokumenKurang":[],"catatan":"<1 kalimat>","basedOn":"<nama_file|konten|keduanya>"}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0].text
      .trim()
      .replace(/```json|```/g, "")
      .trim();
    const result = JSON.parse(text);
    return {
      score: result.score || 0,
      verdict: result.verdict || "Tidak diketahui",
      dokumenAda: result.dokumenAda || [],
      dokumenKurang: result.dokumenKurang || [],
      detail: result.catatan || "",
      basedOn: result.basedOn || "nama_file",
    };
  } catch (err) {
    return {
      score: 0,
      verdict: "Error AI",
      dokumenAda: [],
      dokumenKurang: [],
      detail: `Gagal: ${err.message}`,
      basedOn: "error",
    };
  }
}

function calculateFinalVerdict(existCheck, aiCheck) {
  if (!existCheck.exists)
    return { status: "❌ Tidak Ada File", score: 0, color: "MERAH" };
  const score = aiCheck?.score || 0;
  if (score >= 70) return { status: "✅ Sesuai", score, color: "HIJAU" };
  if (score >= 40)
    return { status: "⚠️ Sebagian Sesuai", score, color: "KUNING" };
  return { status: "❌ Tidak Sesuai", score, color: "MERAH" };
}

// ── Excel Report ─────────────────────────────────────────
async function generateExcelReport(results, reportId) {
  const dir = path.join(os.tmpdir(), "zi-laporan");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 10);
  const filePath = path.join(dir, `laporan_zi_${reportId}.xlsx`);

  const wb = new ExcelJS.Workbook();
  wb.creator = "ZI Dokumen Checker";

  const colorMap = {
    HIJAU: { bg: "FFD4EDDA", font: "FF155724" },
    KUNING: { bg: "FFFFF3CD", font: "FF856404" },
    MERAH: { bg: "FFF8D7DA", font: "FF721C24" },
  };
  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E4057" },
  };
  const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const applyHeader = (row) => {
    row.eachCell((c) => {
      c.font = headerFont;
      c.fill = headerFill;
      c.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });
    row.height = 22;
  };

  // Sheet 1: Ringkasan
  const ws1 = wb.addWorksheet("Ringkasan");
  ws1.mergeCells("A1:H1");
  ws1.getCell("A1").value = `Laporan Pengecekan Data Dukung ZI — ${timestamp}`;
  ws1.getCell("A1").font = { bold: true, size: 14 };
  ws1.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(1).height = 30;
  applyHeader(
    ws1.addRow([
      "ID",
      "Bukti Data Dukung",
      "Standar Dokumen",
      "Jml File",
      "Matchers",
      "Skor AI",
      "Result AI",
      "Reviu",
    ]),
  );
  for (const r of results) {
    const row = ws1.addRow([
      r.id,
      r.bukti || "",
      r.standar || "",
      r.existCheck?.fileCount || 0,
      r.aiCheck?.dokumenAda?.join(", ") || "-",
      `${r.aiCheck?.score || 0}%`,
      r.verdict?.status || "",
      r.aiCheck?.detail || "",
    ]);
    const c = colorMap[r.verdict?.color] || colorMap.MERAH;
    row.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: c.bg },
    };
    row.getCell(7).font = { color: { argb: c.font }, bold: true };
    [2, 3, 5, 8].forEach(
      (i) => (row.getCell(i).alignment = { wrapText: true, vertical: "top" }),
    );
    row.height = 60;
  }
  ws1.columns = [
    { width: 6 },
    { width: 32 },
    { width: 40 },
    { width: 9 },
    { width: 35 },
    { width: 9 },
    { width: 20 },
    { width: 45 },
  ];

  // Sheet 2: Detail File
  const ws2 = wb.addWorksheet("Detail File");
  applyHeader(
    ws2.addRow([
      "ID",
      "Bukti Data",
      "Standar Dokumen",
      "File di Drive",
      "Dokumen Ada (AI)",
      "Dokumen Kurang (AI)",
      "Result AI",
      "Skor",
    ]),
  );
  for (const r of results) {
    const row = ws2.addRow([
      r.id,
      r.bukti || "",
      r.standar || "",
      r.files?.map((f) => f.name).join("\n") || "-",
      r.aiCheck?.dokumenAda?.join("\n") || "-",
      r.aiCheck?.dokumenKurang?.join("\n") || "-",
      r.verdict?.status || "",
      r.verdict?.score || 0,
    ]);
    const c = colorMap[r.verdict?.color] || colorMap.MERAH;
    row.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: c.bg },
    };
    row.getCell(7).font = { color: { argb: c.font }, bold: true };
    [2, 3, 4, 5, 6].forEach(
      (i) => (row.getCell(i).alignment = { wrapText: true, vertical: "top" }),
    );
    row.height = 80;
  }
  ws2.columns = [
    { width: 6 },
    { width: 30 },
    { width: 40 },
    { width: 40 },
    { width: 35 },
    { width: 35 },
    { width: 20 },
    { width: 8 },
  ];

  // Sheet 3: Statistik
  const ws3 = wb.addWorksheet("Statistik");
  const total = results.length;
  const sesuai = results.filter((r) => r.verdict?.color === "HIJAU").length;
  const sebagian = results.filter((r) => r.verdict?.color === "KUNING").length;
  const tidak = results.filter((r) => r.verdict?.color === "MERAH").length;
  ws3.mergeCells("A1:C1");
  ws3.getCell("A1").value = "Statistik Pengecekan Data Dukung ZI";
  ws3.getCell("A1").font = { bold: true, size: 13 };
  ws3.getRow(1).height = 24;
  ws3.addRow([
    "Tanggal",
    new Date().toLocaleDateString("id-ID", { dateStyle: "long" }),
  ]);
  ws3.addRow([]);
  ws3.addRow(["Total item diproses", total, "100%"]);
  const r5 = ws3.addRow([
    "✅ Sesuai",
    sesuai,
    `${total ? Math.round((sesuai / total) * 100) : 0}%`,
  ]);
  r5.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD4EDDA" },
  };
  const r6 = ws3.addRow([
    "⚠️ Sebagian Sesuai",
    sebagian,
    `${total ? Math.round((sebagian / total) * 100) : 0}%`,
  ]);
  r6.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF3CD" },
  };
  const r7 = ws3.addRow([
    "❌ Tidak Sesuai",
    tidak,
    `${total ? Math.round((tidak / total) * 100) : 0}%`,
  ]);
  r7.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8D7DA" },
  };
  ws3.columns = [{ width: 22 }, { width: 10 }, { width: 8 }];

  await wb.xlsx.writeFile(filePath);
  return filePath;
}

// ── Send Email ───────────────────────────────────────────
async function sendEmailReport(results, excelPath, emailTo) {
  const total = results.length;
  const sesuai = results.filter((r) => r.verdict?.color === "HIJAU").length;
  const sebagian = results.filter((r) => r.verdict?.color === "KUNING").length;
  const tidak = results.filter((r) => r.verdict?.color === "MERAH").length;

  const rows = results
    .map((r) => {
      const bg =
        r.verdict?.color === "HIJAU"
          ? "#d4edda"
          : r.verdict?.color === "KUNING"
            ? "#fff3cd"
            : "#f8d7da";
      return `<tr style="background:${bg}"><td style="padding:5px 8px;border:1px solid #dee2e6">${r.id}</td><td style="padding:5px 8px;border:1px solid #dee2e6">${(r.bukti || "-").substring(0, 50)}</td><td style="padding:5px 8px;border:1px solid #dee2e6;text-align:center">${r.existCheck?.fileCount || 0}</td><td style="padding:5px 8px;border:1px solid #dee2e6;text-align:center">${r.verdict?.score || 0}%</td><td style="padding:5px 8px;border:1px solid #dee2e6;font-weight:bold">${r.verdict?.status || "-"}</td></tr>`;
    })
    .join("");

  const html = `<div style="font-family:Arial,sans-serif;max-width:800px;margin:auto;color:#333"><h2 style="color:#2e4057;border-bottom:2px solid #2e4057;padding-bottom:8px">Laporan Pengecekan Data Dukung ZI</h2><p>Tanggal: <strong>${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</strong></p><table style="width:100%;border-collapse:collapse;margin:12px 0"><tr><td style="padding:12px;background:#2e4057;color:#fff;text-align:center">Total<br><b style="font-size:22px">${total}</b></td><td style="padding:12px;background:#28a745;color:#fff;text-align:center">Sesuai<br><b style="font-size:22px">${sesuai}</b></td><td style="padding:12px;background:#ffc107;color:#212529;text-align:center">Sebagian<br><b style="font-size:22px">${sebagian}</b></td><td style="padding:12px;background:#dc3545;color:#fff;text-align:center">Tidak Sesuai<br><b style="font-size:22px">${tidak}</b></td></tr></table><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#2e4057;color:#fff"><th style="padding:7px 8px;border:1px solid #dee2e6">ID</th><th style="padding:7px 8px;border:1px solid #dee2e6">Bukti Data</th><th style="padding:7px 8px;border:1px solid #dee2e6">Jml File</th><th style="padding:7px 8px;border:1px solid #dee2e6">Skor</th><th style="padding:7px 8px;border:1px solid #dee2e6">Status</th></tr></thead><tbody>${rows}</tbody></table><p style="color:#888;font-size:11px;margin-top:12px">Laporan lengkap terlampir.</p></div>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.ZI_EMAIL_FROM, pass: process.env.ZI_EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `ZI Checker <${process.env.ZI_EMAIL_FROM}>`,
    to: emailTo,
    subject: `Laporan ZI — ${sesuai}/${total} sesuai — ${new Date().toLocaleDateString("id-ID")}`,
    html,
    attachments: [{ filename: path.basename(excelPath), path: excelPath }],
  });
}

// Huruf kolom → angka: A=1, S=19, T=20
function letterToCol(letter) {
  if (!letter) return null;
  const str = String(letter).trim().toUpperCase();
  // Jika sudah angka
  if (/^\d+$/.test(str)) return parseInt(str);
  return str.split("").reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0);
}

// ── ID → Detail Mapping (komponen + bobot + answer_type) ─────────────────────
// Bobot per ID = bobot sub-komponen ÷ jumlah pertanyaan dalam sub-komponen
// answer_type: ya_tidak | abc | abcd | abcde | persen | nilai_04
const ID_DETAIL_MAP = {
  // ── PEMENUHAN ── MANAJEMEN PERUBAHAN (4.00) ──────────────────────────────
  // i. Penyusunan Tim Kerja (0.50 ÷ 2)
  6: { komponen: "mp", bobot: 0.25, answer_type: "ya_tidak" },
  7: { komponen: "mp", bobot: 0.25, answer_type: "abc" },
  // ii. Rencana Pembangunan ZI (1.00 ÷ 3)
  9: { komponen: "mp", bobot: 0.3333, answer_type: "ya_tidak" },
  10: { komponen: "mp", bobot: 0.3333, answer_type: "abc" },
  11: { komponen: "mp", bobot: 0.3333, answer_type: "abc" },
  // iii. Pemantauan & Evaluasi (1.00 ÷ 3)
  13: { komponen: "mp", bobot: 0.3333, answer_type: "abcd" },
  14: { komponen: "mp", bobot: 0.3333, answer_type: "abcd" },
  15: { komponen: "mp", bobot: 0.3333, answer_type: "abcd" },
  // iv. Perubahan Pola Pikir (1.50 ÷ 4)
  17: { komponen: "mp", bobot: 0.375, answer_type: "ya_tidak" },
  18: { komponen: "mp", bobot: 0.375, answer_type: "abc" },
  19: { komponen: "mp", bobot: 0.375, answer_type: "abc" },
  20: { komponen: "mp", bobot: 0.375, answer_type: "abcd" },
  // ── PEMENUHAN ── PENATAAN TATALAKSANA (3.50) ─────────────────────────────
  // i. SOP (1.00 ÷ 3)
  23: { komponen: "tt", bobot: 0.3333, answer_type: "abcd" },
  24: { komponen: "tt", bobot: 0.3333, answer_type: "abcde" },
  25: { komponen: "tt", bobot: 0.3333, answer_type: "abcde" },
  // ii. SPBE (2.00 ÷ 4)
  27: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  28: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  29: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  30: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  // iii. Keterbukaan Informasi (0.50 ÷ 2)
  32: { komponen: "tt", bobot: 0.25, answer_type: "abc" },
  33: { komponen: "tt", bobot: 0.25, answer_type: "abc" },
  // ── PEMENUHAN ── PENATAAN SDM (5.00) ─────────────────────────────────────
  // i. Perencanaan Kebutuhan (0.25 ÷ 3)
  36: { komponen: "sdm", bobot: 0.0833, answer_type: "ya_tidak" },
  37: { komponen: "sdm", bobot: 0.0833, answer_type: "abcd" },
  38: { komponen: "sdm", bobot: 0.0833, answer_type: "ya_tidak" },
  // ii. Pola Mutasi Internal (0.50 ÷ 3)
  40: { komponen: "sdm", bobot: 0.1667, answer_type: "ya_tidak" },
  41: { komponen: "sdm", bobot: 0.1667, answer_type: "abcde" },
  42: { komponen: "sdm", bobot: 0.1667, answer_type: "ya_tidak" },
  // iii. Pengembangan Berbasis Kompetensi (1.25 ÷ 6)
  44: { komponen: "sdm", bobot: 0.2083, answer_type: "ya_tidak" },
  45: { komponen: "sdm", bobot: 0.2083, answer_type: "abcd" },
  46: { komponen: "sdm", bobot: 0.2083, answer_type: "abcd" },
  47: { komponen: "sdm", bobot: 0.2083, answer_type: "abcd" },
  48: { komponen: "sdm", bobot: 0.2083, answer_type: "abcd" },
  49: { komponen: "sdm", bobot: 0.2083, answer_type: "abc" },
  // iv. Penetapan Kinerja Individu (2.00 ÷ 4)
  51: { komponen: "sdm", bobot: 0.5, answer_type: "abcd" },
  52: { komponen: "sdm", bobot: 0.5, answer_type: "abcd" },
  53: { komponen: "sdm", bobot: 0.5, answer_type: "abcde" },
  54: { komponen: "sdm", bobot: 0.5, answer_type: "ya_tidak" },
  // v. Penegakan Aturan Disiplin (0.75)
  56: { komponen: "sdm", bobot: 0.75, answer_type: "abcd" },
  // vi. Sistem Informasi Kepegawaian (0.25)
  58: { komponen: "sdm", bobot: 0.25, answer_type: "abc" },
  // ── PEMENUHAN ── PENGUATAN AKUNTABILITAS (5.00) ───────────────────────────
  // i. Keterlibatan Pimpinan (2.50 ÷ 3)
  61: { komponen: "ak", bobot: 0.8333, answer_type: "abc" },
  62: { komponen: "ak", bobot: 0.8333, answer_type: "abc" },
  63: { komponen: "ak", bobot: 0.8333, answer_type: "abcd" },
  // ii. Pengelolaan Akuntabilitas Kinerja (2.50 ÷ 8)
  65: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  66: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  67: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  68: { komponen: "ak", bobot: 0.3125, answer_type: "abcd" },
  69: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  70: { komponen: "ak", bobot: 0.3125, answer_type: "abc" },
  71: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  72: { komponen: "ak", bobot: 0.3125, answer_type: "abc" },
  // ── PEMENUHAN ── PENGUATAN PENGAWASAN (7.50) ──────────────────────────────
  // i. Pengendalian Gratifikasi (1.50 ÷ 2)
  75: { komponen: "pw", bobot: 0.75, answer_type: "abc" },
  76: { komponen: "pw", bobot: 0.75, answer_type: "abcd" },
  // ii. SPIP (1.50 ÷ 4)
  78: { komponen: "pw", bobot: 0.375, answer_type: "abcde" },
  79: { komponen: "pw", bobot: 0.375, answer_type: "abcde" },
  80: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  81: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  // iii. Pengaduan Masyarakat (1.50 ÷ 4)
  83: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  84: { komponen: "pw", bobot: 0.375, answer_type: "ya_tidak" },
  85: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  86: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  // iv. Whistle-Blowing System (1.50 ÷ 3)
  88: { komponen: "pw", bobot: 0.5, answer_type: "abc" },
  89: { komponen: "pw", bobot: 0.5, answer_type: "abc" },
  90: { komponen: "pw", bobot: 0.5, answer_type: "abc" },
  // v. Penanganan Benturan Kepentingan (1.50 ÷ 5)
  92: { komponen: "pw", bobot: 0.3, answer_type: "abcd" },
  93: { komponen: "pw", bobot: 0.3, answer_type: "abcd" },
  94: { komponen: "pw", bobot: 0.3, answer_type: "abcd" },
  95: { komponen: "pw", bobot: 0.3, answer_type: "abc" },
  96: { komponen: "pw", bobot: 0.3, answer_type: "abc" },
  // ── PEMENUHAN ── PENINGKATAN KUALITAS PELAYANAN PUBLIK (5.00) ────────────
  // i. Standar Pelayanan (1.00 ÷ 4)
  99: { komponen: "pp", bobot: 0.25, answer_type: "abcde" },
  100: { komponen: "pp", bobot: 0.25, answer_type: "abcd" },
  101: { komponen: "pp", bobot: 0.25, answer_type: "abcd" },
  102: { komponen: "pp", bobot: 0.25, answer_type: "ya_tidak" },
  // ii. Budaya Pelayanan Prima (1.00 ÷ 6)
  104: { komponen: "pp", bobot: 0.1667, answer_type: "abcde" },
  105: { komponen: "pp", bobot: 0.1667, answer_type: "abcd" },
  106: { komponen: "pp", bobot: 0.1667, answer_type: "abcd" },
  107: { komponen: "pp", bobot: 0.1667, answer_type: "abcd" },
  108: { komponen: "pp", bobot: 0.1667, answer_type: "abcd" },
  109: { komponen: "pp", bobot: 0.1667, answer_type: "abcde" },
  // iii. Pengelolaan Pengaduan (1.00 ÷ 3)
  111: { komponen: "pp", bobot: 0.3333, answer_type: "abcde" },
  112: { komponen: "pp", bobot: 0.3333, answer_type: "abc" },
  113: { komponen: "pp", bobot: 0.3333, answer_type: "abc" },
  // iv. Penilaian Kepuasan terhadap Pelayanan (1.00 ÷ 3)
  115: { komponen: "pp", bobot: 0.3333, answer_type: "abcde" },
  116: { komponen: "pp", bobot: 0.3333, answer_type: "abc" },
  117: { komponen: "pp", bobot: 0.3333, answer_type: "abcd" },
  // v. Pemanfaatan Teknologi Informasi (1.00 ÷ 3)
  119: { komponen: "pp", bobot: 0.3333, answer_type: "abcd" },
  120: { komponen: "pp", bobot: 0.3333, answer_type: "ya_tidak" },
  121: { komponen: "pp", bobot: 0.3333, answer_type: "abc" },
  // ── REFORM ── MANAJEMEN PERUBAHAN (4.00) ─────────────────────────────────
  // i. Komitmen dalam Perubahan (2.00 ÷ 2)
  125: { komponen: "mp", bobot: 1.0, answer_type: "persen" },
  128: { komponen: "mp", bobot: 1.0, answer_type: "persen" },
  // ii. Komitmen Pimpinan (1.00)
  132: { komponen: "mp", bobot: 1.0, answer_type: "abcde" },
  // iii. Membangun Budaya Kerja (1.00)
  134: { komponen: "mp", bobot: 1.0, answer_type: "abcd" },
  // ── REFORM ── PENATAAN TATALAKSANA (3.50) ────────────────────────────────
  // i. Peta Proses Bisnis (0.50)
  137: { komponen: "tt", bobot: 0.5, answer_type: "abcd" },
  // ii. SPBE Terintegrasi (1.00 ÷ 2)
  139: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  140: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  // iii. Transformasi Digital Memberikan Nilai Manfaat (2.00 ÷ 3)
  142: { komponen: "tt", bobot: 0.6667, answer_type: "abcde" },
  143: { komponen: "tt", bobot: 0.6667, answer_type: "abcde" },
  144: { komponen: "tt", bobot: 0.6667, answer_type: "abcde" },
  // ── REFORM ── PENATAAN SDM (5.00) ────────────────────────────────────────
  // i. Kinerja Individu (1.50)
  147: { komponen: "sdm", bobot: 1.5, answer_type: "abc" },
  // ii. Assessment Pegawai (1.50)
  149: { komponen: "sdm", bobot: 1.5, answer_type: "abc" },
  // iii. Pelanggaran Disiplin Pegawai (2.00)
  151: { komponen: "sdm", bobot: 2.0, answer_type: "persen" },
  // ── REFORM ── PENGUATAN AKUNTABILITAS (5.00) ─────────────────────────────
  // i. Meningkatnya Capaian Kinerja (2.00)
  157: { komponen: "ak", bobot: 2.0, answer_type: "persen" },
  // ii. Pemberian Reward and Punishment (1.50)
  161: { komponen: "ak", bobot: 1.5, answer_type: "abcd" },
  // iii. Kerangka Logis Kinerja (1.50)
  163: { komponen: "ak", bobot: 1.5, answer_type: "abcd" },
  // ── REFORM ── PENGUATAN PENGAWASAN (7.50) ────────────────────────────────
  // i. Mekanisme Pengendalian (2.50)
  166: { komponen: "pw", bobot: 2.5, answer_type: "abcde" },
  // ii. Penanganan Pengaduan Masyarakat (3.00)
  168: { komponen: "pw", bobot: 3.0, answer_type: "persen" },
  // iii. Penyampaian LHKPN (1.00)
  174: { komponen: "pw", bobot: 1.0, answer_type: "persen" },
  // iv. Penyampaian Non-LHKPN (1.00)
  181: { komponen: "pw", bobot: 1.0, answer_type: "persen" },
  // ── REFORM ── PENINGKATAN KUALITAS PELAYANAN PUBLIK (5.00) ───────────────
  // i. Upaya dan/atau Inovasi Pelayanan (2.50 ÷ 2)
  189: { komponen: "pp", bobot: 1.25, answer_type: "abcd" },
  190: { komponen: "pp", bobot: 1.25, answer_type: "persen" },
  // ii. Penanganan Pengaduan Pelayanan dan Konsultasi (2.50)
  194: { komponen: "pp", bobot: 2.5, answer_type: "abcd" },
  // ── HASIL ─────────────────────────────────────────────────────────────────
  199: { komponen: "ipak", bobot: 17.5, answer_type: "nilai_04" },
  200: { komponen: "capaian_kinerja", bobot: 5.0, answer_type: "abcde" },
  202: { komponen: "prima", bobot: 17.5, answer_type: "nilai_04" },
};

const KOMPONEN_LABEL = {
  mp: "Manajemen Perubahan",
  tt: "Penataan Tatalaksana",
  sdm: "Penataan SDM",
  ak: "Penguatan Akuntabilitas",
  pw: "Penguatan Pengawasan",
  pp: "Peningkatan Pelayanan",
  ipak: "Hasil - IPAK",
  capaian_kinerja: "Hasil - Capaian Kinerja",
  prima: "Hasil - Pelayanan Prima",
};

// Bobot verdict per answer_type: HIJAU=A, KUNING=B, MERAH=terbawah
function getAnswerWeight(verdictColor, answerType) {
  if (verdictColor === "HIJAU") return 1.0;
  if (verdictColor === "MERAH") return 0.0;
  // KUNING → opsi B (partial)
  switch (answerType) {
    case "ya_tidak":
      return 0.5;
    case "abc":
      return 0.5; // B of A/B/C
    case "abcd":
      return 0.67; // B of A/B/C/D
    case "abcde":
      return 0.75; // B of A/B/C/D/E
    case "persen":
      return 0.5;
    case "nilai_04":
      return 0.5;
    default:
      return 0.5;
  }
}

// Hitung nilai_lke_ai dari hasil AI per row
// Setiap ID dikontribusikan: getAnswerWeight(verdict) × bobot
// Komponen yang belum dicek = 0 (bukan null), sehingga nilai_akhir selalu muncul
function calculateNilaiLkeAi(results, target) {
  const r2 = (v) => Math.round(v * 100) / 100;
  const accum = {
    mp: 0,
    tt: 0,
    sdm: 0,
    ak: 0,
    pw: 0,
    pp: 0,
    ipak: 0,
    capaian_kinerja: 0,
    prima: 0,
  };

  for (const r of results) {
    const detail = ID_DETAIL_MAP[parseInt(r.id)];
    if (!detail) continue;
    const w = getAnswerWeight(r.verdict?.color, detail.answer_type);
    accum[detail.komponen] += w * detail.bobot;
  }

  const toK = (key) => ({ nilai: r2(accum[key]), persen: null });

  const mp = toK("mp");
  const tt = toK("tt");
  const sdm = toK("sdm");
  const ak = toK("ak");
  const pw = toK("pw");
  const pp = toK("pp");
  const ipak = toK("ipak");
  const ck = toK("capaian_kinerja");
  const prima = toK("prima");

  const totalPeng = {
    nilai: r2(mp.nilai + tt.nilai + sdm.nilai + ak.nilai + pw.nilai + pp.nilai),
    persen: null,
  };
  const bbTotal = { nilai: r2(ipak.nilai + ck.nilai), persen: null };
  const ppTotal = { nilai: r2(prima.nilai), persen: null };
  const totalHasil = { nilai: r2(bbTotal.nilai + ppTotal.nilai), persen: null };
  const nilaiAkhir = r2(totalPeng.nilai + totalHasil.nilai);
  const threshold = target === "WBBM" ? 75 : 60;

  return {
    pengungkit: {
      manajemen_perubahan: mp,
      penataan_tatalaksana: tt,
      penataan_sdm: sdm,
      penguatan_akuntabilitas: ak,
      penguatan_pengawasan: pw,
      peningkatan_pelayanan: pp,
      total: totalPeng,
    },
    hasil: {
      birokrasi_bersih: { ipak, capaian_kinerja: ck, total: bbTotal },
      pelayanan_prima: { ipkp: prima, total: ppTotal },
      total: totalHasil,
    },
    nilai_akhir: nilaiAkhir,
    target_tercapai: nilaiAkhir >= threshold,
  };
}

// Auto-detect baris data pertama
// Cari baris di mana kolom A berisi angka kecil (ID data, bukan tahun/halaman)
// dan minimal 2 baris berurutan juga punya ID angka → hindari false match header
function detectDataStart(rows) {
  for (let i = 0; i < rows.length - 1; i++) {
    const id = String(rows[i][0] || "").trim();
    const idNext = String(rows[i + 1][0] || "").trim();
    const isDataId = /^\d+$/.test(id) && parseInt(id) <= 9999;
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

// ── Main SSE Route ───────────────────────────────────────
export async function POST(req) {
  const {
    submissionId,
    sheetUrl,
    sheetName,
    limit,
    startFromId,
    email,
    checkContentChange,
  } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      await connect();

      if (!submissionId) {
        throw new Error("submissionId wajib diisi");
      }

      const send = (type, payload) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`),
          );
        } catch {
          /* client disconnected */
        }
      };

      try {
        // Validate inputs
        if (!sheetUrl) throw new Error("URL Google Sheet wajib diisi");

        const penilaianId = extractSheetId(sheetUrl);
        const penilaianName = sheetName?.trim() || "Jawaban";
        const standarId = process.env.ZI_STANDARISASI_SHEET_ID;
        const standarName =
          process.env.ZI_STANDARISASI_SHEET_NAME || "Standarisasi";
        const dataLimit = parseInt(limit) || 0;
        const startId = String(startFromId ?? "").trim();

        const COL = { ID: 1, BUKTI: 13, LINK: 14 };
        const AI_PATTERN = /^[✅⚠️❌]/u;
        const STANDAR = { ID: 1, DOK: 11 };

        if (!standarId)
          throw new Error(
            "ZI_STANDARISASI_SHEET_ID belum dikonfigurasi di .env",
          );

        send("log", {
          level: "info",
          message: "Menginisialisasi koneksi Google...",
        });
        const auth = getGoogleAuth();
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        // ── Baca Sheet LKE & Standarisasi ──
        send("log", {
          level: "info",
          message: `Membaca Sheet LKE: ${penilaianName}...`,
        });
        const penilaianRows = await readSheet(auth, penilaianId, penilaianName);

        send("log", {
          level: "info",
          message: "Membaca Sheet Standarisasi...",
        });
        const standarRows = await readSheet(auth, standarId, standarName);

        const standarMap = {};
        for (const row of standarRows.slice(2)) {
          const id = String(row[STANDAR.ID - 1] || "").trim();
          const standar = String(row[STANDAR.DOK - 1] || "").trim();
          if (id && standar) standarMap[id] = standar;
        }
        send("log", {
          level: "info",
          message: `${Object.keys(standarMap).length} standar dokumen ditemukan`,
        });

        // ── Deteksi baris data ──
        const dataStart = detectDataStart(penilaianRows);
        send("log", {
          level: "info",
          message: `Baris data mulai dari baris ke-${dataStart + 1} (ID: ${String(penilaianRows[dataStart]?.[0] || "?").trim()})`,
        });

        const allDataRows = penilaianRows
          .slice(dataStart)
          .map((row, i) => ({ row, rowNum: i + dataStart + 1 }))
          .filter(({ row }) => {
            const id = String(row[COL.ID - 1] || "").trim();
            return /^\d+$/.test(id) && parseInt(id) <= 9999;
          });

        const allValid = allDataRows.filter(({ row }) =>
          String(row[COL.LINK - 1] || "")
            .trim()
            .includes("drive.google"),
        );

        send("log", {
          level: "info",
          message: `Total data: ${allDataRows.length} baris (${allValid.length} punya link Drive, ${allDataRows.length - allValid.length} tanpa link)`,
        });

        // ── Baca Visa review ──
        send("log", {
          level: "info",
          message: "Membaca sheet 'Visa review'...",
        });
        const { map: visaMap, totalRows: visaRowCount } =
          await readVisaReviewMap(auth, penilaianId);
        send("log", {
          level: "info",
          message: `${Object.keys(visaMap).length} entri ditemukan di Visa review`,
        });

        // ── Klasifikasi baris ──
        // 1. Revisi: ada di Visa review dengan supervisi = "Revisi"
        const revisiRows = allValid.filter(({ row }) => {
          const id = String(row[COL.ID - 1]).trim();
          return visaMap[id]?.supervisi === "Revisi";
        });

        // 2. Link berubah: ada di Visa review, link saat ini ≠ link yang dicek sebelumnya
        const linkChangedRows = allValid.filter(({ row }) => {
          const id = String(row[COL.ID - 1]).trim();
          const entry = visaMap[id];
          if (!entry || !AI_PATTERN.test(entry.result)) return false; // belum dicek → unchecked
          if (entry.supervisi === "Revisi") return false; // sudah di revisiRows
          const currentLink = String(row[COL.LINK - 1] || "").trim();
          return entry.linkDicek !== currentLink;
        });

        // 3. Belum dicek: tidak ada di Visa review atau ada tapi tidak punya hasil AI
        const uncheckedRows = allValid.filter(({ row }) => {
          const id = String(row[COL.ID - 1]).trim();
          const entry = visaMap[id];
          if (!entry) return true;
          if (entry.supervisi === "Revisi") return false;
          if (!AI_PATTERN.test(entry.result)) return true;
          return false;
        });

        // 4. Fingerprint berubah (hanya jika checkContentChange aktif)
        const fileListCache = {}; // folderId → files (hindari double-fetch)
        const fingerprintRows = [];

        if (checkContentChange) {
          const checkedStable = allValid.filter(({ row }) => {
            const id = String(row[COL.ID - 1]).trim();
            const entry = visaMap[id];
            if (!entry || !AI_PATTERN.test(entry.result)) return false;
            if (entry.supervisi === "Revisi") return false;
            const currentLink = String(row[COL.LINK - 1] || "").trim();
            return entry.linkDicek === currentLink; // link tidak berubah → kandidat fingerprint check
          });

          send("log", {
            level: "info",
            message: `Memeriksa perubahan konten ${checkedStable.length} folder...`,
          });
          for (const item of checkedStable) {
            const id = String(item.row[COL.ID - 1]).trim();
            const link = String(item.row[COL.LINK - 1] || "").trim();
            const fId = extractFolderId(link);
            if (!fId) continue;
            try {
              const files = await listFilesInFolder(auth, fId);
              fileListCache[fId] = files;
              const currentFp = computeFingerprint(files);
              if (currentFp !== visaMap[id].fingerprint) {
                fingerprintRows.push(item);
              }
            } catch {
              /* biarkan lewat */
            }
          }
          if (fingerprintRows.length > 0) {
            send("log", {
              level: "warn",
              message: `${fingerprintRows.length} folder berubah konten, akan dicek ulang`,
            });
          }
        }

        // startFromId: lewati unchecked rows sebelum ID tersebut
        let offsetted = uncheckedRows;
        if (startId) {
          const startIdx = uncheckedRows.findIndex(
            ({ row }) =>
              parseInt(String(row[COL.ID - 1]).trim()) >= parseInt(startId),
          );
          if (startIdx > 0) {
            offsetted = uncheckedRows.slice(startIdx);
            send("log", {
              level: "info",
              message: `Mulai dari ID ${startId} (melewati ${startIdx} data sebelumnya)`,
            });
          } else if (startIdx === -1) {
            offsetted = [];
            send("log", {
              level: "info",
              message: `ID ${startId} tidak ditemukan di data belum dicek, tidak ada yang diproses`,
            });
          }
        }
        if (revisiRows.length > 0)
          send("log", {
            level: "info",
            message: `${revisiRows.length} baris status "Revisi" akan dicek ulang`,
          });
        if (linkChangedRows.length > 0)
          send("log", {
            level: "info",
            message: `${linkChangedRows.length} baris link berubah akan dicek ulang`,
          });

        const combined = [
          ...revisiRows,
          ...linkChangedRows,
          ...fingerprintRows,
          ...offsetted,
        ];
        const rowsToProcess =
          dataLimit > 0 ? combined.slice(0, dataLimit) : combined;
        const total = rowsToProcess.length;

        send("log", {
          level: "info",
          message: `Mulai memproses ${total} item...`,
        });
        send("total", {
          total,
          revisiCount: revisiRows.length,
          linkChangedCount: linkChangedRows.length,
          fingerprintChangedCount: fingerprintRows.length,
        });

        // baseChecked = baris yang sudah punya hasil AI di Visa review
        const totalData = allDataRows.length;
        const baseChecked = allDataRows.filter(({ row }) => {
          const id = String(row[COL.ID - 1]).trim();
          return visaMap[id] && AI_PATTERN.test(visaMap[id].result);
        }).length;
        let uncheckedProcessed = 0;

        // Set status awal MongoDB
        await LkeSubmission.findByIdAndUpdate(submissionId, {
          total_data: totalData,
          checked_count: baseChecked,
          unchecked_count: totalData - baseChecked,
          progress_percent:
            totalData > 0 ? Math.round((baseChecked / totalData) * 100) : 0,
          status: "Sedang Dicek",
          last_checked_at: new Date(),
        });

        const results = [];
        const visaExistUpdates = []; // { rowNum, rowData }
        const visaNewRows = []; // rowData arrays untuk di-append
        const tglCek = new Date().toLocaleString("id-ID");

        for (let idx = 0; idx < rowsToProcess.length; idx++) {
          const { row, rowNum } = rowsToProcess[idx];
          const id = String(row[COL.ID - 1]).trim();
          const bukti = String(row[COL.BUKTI - 1] || "").trim();
          const linkDrive = String(row[COL.LINK - 1] || "").trim();
          const standar = standarMap[id] || "";

          // Hanya tambah ke progress jika baris ini benar-benar baru (belum punya AI result)
          const isNewRow = !visaMap[id] || !AI_PATTERN.test(visaMap[id].result);
          if (isNewRow) uncheckedProcessed++;
          const currentChecked = Math.min(
            totalData,
            baseChecked + uncheckedProcessed,
          );
          const progressPercent =
            totalData > 0 ? Math.round((currentChecked / totalData) * 100) : 0;

          await LkeSubmission.findByIdAndUpdate(submissionId, {
            total_data: totalData,
            checked_count: currentChecked,
            unchecked_count: totalData - currentChecked,
            progress_percent: progressPercent,
            status: progressPercent >= 100 ? "Selesai" : "Sedang Dicek",
            last_checked_at: new Date(),
          });

          const isRevisi = visaMap[id]?.supervisi === "Revisi";
          const isLinkChanged = linkChangedRows.some(
            (r) => String(r.row[COL.ID - 1]).trim() === id,
          );
          const isFpChanged = fingerprintRows.some(
            (r) => String(r.row[COL.ID - 1]).trim() === id,
          );
          const tag = isRevisi
            ? "[Revisi] "
            : isLinkChanged
              ? "[Link Baru] "
              : isFpChanged
                ? "[Konten Baru] "
                : "";

          send("progress", {
            current: idx + 1,
            total,
            id,
            message: `${tag}ID ${id} — ${bukti.substring(0, 50)}${bukti.length > 50 ? "…" : ""}`,
          });

          if (!standar) {
            send("log", {
              level: "warn",
              message: `ID ${id}: tidak ada standar, dilewati`,
            });
            continue;
          }

          const folderId = extractFolderId(linkDrive);
          if (!folderId) {
            send("log", {
              level: "error",
              message: `ID ${id}: URL Drive tidak valid`,
            });
            results.push({
              id,
              bukti,
              files: [],
              existCheck: {
                exists: false,
                fileCount: 0,
                detail: "URL tidak valid",
              },
              aiCheck: {
                score: 0,
                verdict: "N/A",
                detail: "URL Drive tidak valid",
                dokumenAda: [],
                dokumenKurang: [],
              },
              verdict: {
                status: "❌ URL Tidak Valid",
                score: 0,
                color: "MERAH",
              },
            });
            const _vrDetail = ID_DETAIL_MAP[parseInt(id)];
            const vrData = [
              id,
              bukti,
              linkDrive,
              "",
              "❌ URL Tidak Valid",
              "URL Google Drive tidak valid",
              "Sudah Dicek AI",
              tglCek,
              _vrDetail ? KOMPONEN_LABEL[_vrDetail.komponen] : "",
              _vrDetail?.bobot ?? "",
              0,
            ];
            if (visaMap[id])
              visaExistUpdates.push({
                rowNum: visaMap[id].rowNum,
                rowData: vrData,
              });
            else visaNewRows.push(vrData);
            continue;
          }

          // Gunakan file list dari cache jika sudah di-fetch saat fingerprint pre-check
          let files = fileListCache[folderId] ?? null;
          if (files === null) {
            try {
              files = await listFilesInFolder(auth, folderId);
              fileListCache[folderId] = files;
              send("log", {
                level: "info",
                message: `ID ${id}: ${files.length} file ditemukan`,
              });
            } catch (err) {
              files = [];
              send("log", {
                level: "error",
                message: `ID ${id}: gagal akses Drive — ${err.message}`,
              });
            }
          } else {
            send("log", {
              level: "info",
              message: `ID ${id}: ${files.length} file ditemukan (cached)`,
            });
          }

          const fingerprint = computeFingerprint(files);

          const existCheck = {
            exists: files.length > 0,
            fileCount: files.length,
            detail:
              files.length > 0
                ? `${files.length} file ditemukan`
                : "Folder kosong",
          };

          let fileContents = [];
          if (existCheck.exists) {
            const readable = files
              .filter(
                (f) =>
                  f.mimeType === "application/vnd.google-apps.document" ||
                  f.mimeType === "application/pdf" ||
                  f.mimeType?.startsWith("text/") ||
                  f.mimeType?.includes("word") ||
                  f.mimeType?.includes("presentation"),
              )
              .slice(0, 3);
            fileContents = await Promise.all(
              readable.map((f) => getFileContent(auth, f.id, f.mimeType)),
            );
          }

          send("log", { level: "info", message: `ID ${id}: analisis AI...` });
          const aiCheck = await checkWithAI(files, fileContents, standar, id);
          const verdict = calculateFinalVerdict(existCheck, aiCheck);

          send("log", {
            level:
              verdict.color === "HIJAU"
                ? "success"
                : verdict.color === "KUNING"
                  ? "warn"
                  : "error",
            message: `ID ${id}: ${verdict.status} (skor: ${aiCheck.score}%)`,
          });

          const reviuLines = [
            existCheck.detail,
            aiCheck.dokumenAda?.length > 0
              ? `Ada: ${aiCheck.dokumenAda.slice(0, 3).join(", ")}`
              : "",
            aiCheck.dokumenKurang?.length > 0
              ? `Kurang: ${aiCheck.dokumenKurang.slice(0, 3).join(", ")}`
              : "",
            aiCheck.detail,
          ].filter(Boolean);

          results.push({
            id,
            bukti,
            standar,
            files,
            existCheck,
            aiCheck,
            verdict,
          });

          // Antri update ke Visa review
          const _vrDetail = ID_DETAIL_MAP[parseInt(id)];
          const _vrWeight = getAnswerWeight(
            verdict.color,
            _vrDetail?.answer_type,
          );
          const _vrNilaiAi = _vrDetail
            ? Math.round(_vrWeight * _vrDetail.bobot * 100) / 100
            : 0;
          const vrData = [
            id,
            bukti,
            linkDrive,
            fingerprint,
            verdict.status,
            reviuLines.join(" | "),
            "Sudah Dicek AI",
            tglCek,
            _vrDetail ? KOMPONEN_LABEL[_vrDetail.komponen] : "",
            _vrDetail?.bobot ?? "",
            _vrNilaiAi,
          ];
          if (visaMap[id])
            visaExistUpdates.push({
              rowNum: visaMap[id].rowNum,
              rowData: vrData,
            });
          else visaNewRows.push(vrData);

          await delay(600);
        }


        // ── Tulis ke Visa review ──
        if (visaExistUpdates.length > 0 || visaNewRows.length > 0) {
          send("log", {
            level: "info",
            message: `Menulis ${visaExistUpdates.length} update + ${visaNewRows.length} baru ke sheet 'Visa review'...`,
          });
          try {
            const vrSheetProps = await ensureVisaReviewSheet(
              sheets,
              penilaianId,
            );
            await writeVisaReviewRows(
              sheets,
              penilaianId,
              visaExistUpdates,
              visaNewRows,
            );

            // Set dropdown pada kolom Status Supervisi (G)
            const existingDataRows = visaRowCount > 0 ? visaRowCount - 1 : 0;
            const totalVrDataRows = existingDataRows + visaNewRows.length;
            await setVisaReviewDropdown(
              sheets,
              penilaianId,
              vrSheetProps,
              totalVrDataRows,
            );

            send("log", {
              level: "success",
              message: `Sheet 'Visa review' diupdate ✓ (dropdown supervisi terpasang)`,
            });
          } catch (err) {
            send("log", {
              level: "warn",
              message: `Gagal update Visa review: ${err.message}`,
            });
          }
        }

        // ── Generate Excel ──
        send("log", { level: "info", message: "Membuat laporan Excel..." });
        const reportId = Date.now();
        const excelPath = await generateExcelReport(results, reportId);
        send("log", { level: "success", message: "Laporan Excel selesai ✓" });

        // ── Email ──
        if (email?.trim()) {
          send("log", {
            level: "info",
            message: `Mengirim email ke ${email}...`,
          });
          try {
            await sendEmailReport(results, excelPath, email.trim());
            send("log", {
              level: "success",
              message: `Email terkirim ke ${email} ✓`,
            });
          } catch (err) {
            send("log", {
              level: "warn",
              message: `Gagal kirim email: ${err.message}`,
            });
          }
        }

        // ── Summary ──
        const sesuai = results.filter(
          (r) => r.verdict?.color === "HIJAU",
        ).length;
        const sebagian = results.filter(
          (r) => r.verdict?.color === "KUNING",
        ).length;
        const tidak = results.filter(
          (r) => r.verdict?.color === "MERAH",
        ).length;

        // ── Hitung nilai_lke_ai dari hasil AI ──
        // Gabungkan seluruh visaMap (run sebelumnya) + results (run ini) agar score mencakup semua data
        let nilaiLkeAi = null;
        {
          const submission = await LkeSubmission.findById(submissionId)
            .select("target")
            .lean();
          const target = submission?.target || "WBK";

          // Seed dari visaMap: semua entri yang sudah punya hasil AI (dari run-run sebelumnya)
          const allResultsMap = new Map();
          for (const [id, entry] of Object.entries(visaMap)) {
            if (!AI_PATTERN.test(entry.result)) continue;
            const color = /^✅/u.test(entry.result)
              ? "HIJAU"
              : /^⚠️/u.test(entry.result)
                ? "KUNING"
                : "MERAH";
            allResultsMap.set(id, { id, verdict: { color } });
          }
          // Override dengan data run saat ini (lebih baru)
          for (const r of results) allResultsMap.set(r.id, r);

          const allResultsForScoring = Array.from(allResultsMap.values());
          if (allResultsForScoring.length > 0) {
            nilaiLkeAi = calculateNilaiLkeAi(allResultsForScoring, target);
            send("log", {
              level: "info",
              message: `Penilaian AI: nilai akhir ${nilaiLkeAi.nilai_akhir ?? "—"} (${target}) — dari ${allResultsForScoring.length} item tercek`,
            });
            // Tulis ringkasan ke sheet "Ringkasan AI"
            try {
              await writeRingkasanAi(sheets, penilaianId, nilaiLkeAi, target);
              send("log", {
                level: "success",
                message: "Sheet 'Ringkasan AI' diperbarui ✓",
              });
            } catch (err) {
              send("log", {
                level: "warn",
                message: `Gagal tulis Ringkasan AI: ${err.message}`,
              });
            }
          }
        }

        // ── Final MongoDB update ──
        try {
          const finalChecked = Math.min(
            totalData,
            baseChecked + uncheckedProcessed,
          );
          const finalPct =
            totalData > 0 ? Math.round((finalChecked / totalData) * 100) : 0;
          const finalStatus =
            finalPct >= 100
              ? "Selesai"
              : finalPct > 0
                ? "Sedang Dicek"
                : "Belum Dicek";

          const mongoUpdate = {
            total_data: totalData,
            checked_count: finalChecked,
            unchecked_count: totalData - finalChecked,
            progress_percent: finalPct,
            status: finalStatus,
            last_checked_at: new Date(),
          };
          if (nilaiLkeAi) mongoUpdate.nilai_lke_ai = nilaiLkeAi;

          await LkeSubmission.findByIdAndUpdate(submissionId, mongoUpdate);
          send("log", {
            level: "success",
            message: `Monitoring diupdate: ${finalChecked}/${totalData} data (${finalPct}%) — ${finalStatus}`,
          });
        } catch (e) {
          send("log", {
            level: "warn",
            message: `Gagal update monitoring: ${e.message}`,
          });
        }

        send("done", {
          reportId,
          summary: { total: results.length, sesuai, sebagian, tidak },
        });
      } catch (err) {
        send("error", { message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
