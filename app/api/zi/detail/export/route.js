import { google } from "googleapis";
import ExcelJS from "exceljs";
import fs from "fs";
import { connect } from "@/config/dbconfig";
import LkeJawaban from "@/modules/models/LkeJawaban";
import LkeKriteria from "@/modules/models/LkeKriteria";

function getGoogleAuth() {
  let credentials;
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  } else if (process.env.GOOGLE_CREDENTIALS_FILE && fs.existsSync(process.env.GOOGLE_CREDENTIALS_FILE)) {
    credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_FILE, "utf8"));
  } else {
    throw new Error("Google credentials tidak ditemukan.");
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

function detectDataStart(rows) {
  for (let i = 0; i < rows.length - 1; i++) {
    const id     = String(rows[i][0]     || "").trim();
    const idNext = String(rows[i + 1][0] || "").trim();
    if (/^\d+$/.test(id) && parseInt(id) <= 9999 &&
        /^\d+$/.test(idNext) && parseInt(idNext) <= 9999) return i;
  }
  for (let i = 0; i < rows.length; i++) {
    const id = String(rows[i][0] || "").trim();
    if (/^\d+$/.test(id) && parseInt(id) <= 9999) return i;
  }
  return 0;
}

const AI_PATTERN = /^[✅⚠️❌]/u;
const VR_SHEET   = "Visa review";
const COL        = { ID: 1, LINK: 14, NARASI: 12, BUKTI: 13 };
const VR_COL     = { ID: 1, RESULT: 5, REVIU: 6, SUPERVISI: 7, TGL_CEK: 8 };

const COLOR_MAP = {
  HIJAU:  { bg: "FFD4EDDA", font: "FF155724" },
  KUNING: { bg: "FFFFF3CD", font: "FF856404" },
  MERAH:  { bg: "FFF8D7DA", font: "FF721C24" },
  NONE:   { bg: "FFF5F5F5", font: "FF666666" },
};

function isDetailKriteria(kriteria) {
  return (
    kriteria?.answer_type === "jumlah" &&
    kriteria?.parent_question_id != null
  );
}

async function buildRowsFromMongo(submissionId) {
  await connect();
  const [jawabanList, kriteriaList] = await Promise.all([
    LkeJawaban.find({ submission_id: submissionId }).lean(),
    LkeKriteria.find({ aktif: true }).lean(),
  ]);
  const kriteriaMap = new Map(kriteriaList.map((k) => [k.question_id, k]));
  const primaryIds = new Set(
    kriteriaList
      .filter((k) => !isDetailKriteria(k))
      .map((k) => k.question_id),
  );

  return jawabanList.filter((j) => primaryIds.has(j.question_id)).map((j) => {
    const ai     = j.ai_result ?? {};
    const link   = j.link_drive || "";
    const hasLink = link.includes("drive.google");
    const color   = ai.color; // HIJAU|KUNING|MERAH|null
    const isChecked = !!color;
    const status  = !hasLink ? "no_link"
      : ai.supervisi === "Revisi" ? "revisi"
      : isChecked ? "checked"
      : "unchecked";

    const verdictMap = { HIJAU: "✅ Sesuai", KUNING: "⚠️ Sebagian Sesuai", MERAH: "❌ Tidak Sesuai" };

    return {
      id:           String(j.question_id),
      bukti:        j.narasi || j.bukti || kriteriaMap.get(j.question_id)?.pertanyaan || "",
      link:         hasLink ? link : null,
      status,
      verdict:      isChecked ? (ai.status || verdictMap[color] || color) : null,
      verdictColor: isChecked ? color : null,
      reviu:        ai.reviu || null,
      supervisi:    ai.supervisi || null,
      tglCek:       ai.checked_at ? new Date(ai.checked_at).toLocaleString("id-ID") : null,
    };
  });
}

export async function POST(req) {
  try {
    const { submissionId, sheetUrl, sheetName, unitName, eselon1, target } = await req.json();

    // ── App mode: read from MongoDB ──
    if (submissionId && !sheetUrl) {
      const rows     = await buildRowsFromMongo(submissionId);
      return generateExcelResponse(rows, unitName, eselon1, target);
    }

    if (!sheetUrl?.trim()) {
      return new Response("URL sheet wajib diisi", { status: 400 });
    }

    const spreadsheetId = extractSheetId(sheetUrl);
    const tabName       = sheetName?.trim() || "Jawaban";

    await connect();
    const kriteriaList = await LkeKriteria.find({ aktif: true }).lean();
    const primaryIds = new Set(
      kriteriaList
        .filter((k) => !isDetailKriteria(k))
        .map((k) => Number(k.question_id)),
    );

    const auth       = getGoogleAuth();
    const authClient = await auth.getClient();
    const sheets     = google.sheets({ version: "v4", auth: authClient });

    // ── Baca sheet utama ──
    let mainRows = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!A:N`,
      });
      mainRows = res.data.values || [];
    } catch (err) {
      return new Response(err.message, { status: 500 });
    }

    const dataStart   = detectDataStart(mainRows);
    const allDataRows = mainRows.slice(dataStart).filter((row) => {
      const id = String(row[COL.ID - 1] || "").trim();
      return /^\d+$/.test(id) && parseInt(id) <= 9999 && primaryIds.has(parseInt(id));
    });

    // ── Baca Visa review ──
    const vrMap = {};
    try {
      const vrRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${VR_SHEET}!A:H`,
      });
      const vrRows = vrRes.data.values || [];
      for (let i = 1; i < vrRows.length; i++) {
        const id = String(vrRows[i][VR_COL.ID - 1] || "").trim();
        if (!id) continue;
        vrMap[id] = {
          result:    String(vrRows[i][VR_COL.RESULT    - 1] || "").trim(),
          reviu:     String(vrRows[i][VR_COL.REVIU     - 1] || "").trim(),
          supervisi: String(vrRows[i][VR_COL.SUPERVISI - 1] || "").trim(),
          tglCek:    String(vrRows[i][VR_COL.TGL_CEK   - 1] || "").trim(),
        };
      }
    } catch { /* Visa review belum ada */ }

    // ── Susun data rows ──
    const rows = allDataRows.map((row) => {
      const id     = String(row[COL.ID     - 1] || "").trim();
      const narasi = String(row[COL.NARASI - 1] || "").trim();
      const bukti  = String(row[COL.BUKTI  - 1] || "").trim();
      const link   = String(row[COL.LINK   - 1] || "").trim();
      const hasLink = link.includes("drive.google");
      const vr = vrMap[id];
      const isChecked = vr && AI_PATTERN.test(vr.result);
      const isRevisi  = vr?.supervisi === "Revisi";

      let status;
      if (!hasLink)       status = "no_link";
      else if (isRevisi)  status = "revisi";
      else if (isChecked) status = "checked";
      else                status = "unchecked";

      const verdictColor = isChecked
        ? /^✅/u.test(vr.result) ? "HIJAU"
        : /^⚠️/u.test(vr.result) ? "KUNING"
        : "MERAH"
        : null;

      return { id, bukti: narasi || bukti, link: hasLink ? link : null, status, verdict: isChecked ? vr.result : null, verdictColor, reviu: isChecked ? vr.reviu : null, supervisi: vr?.supervisi ?? null, tglCek: isChecked ? vr.tglCek : null };
    });

    return generateExcelResponse(rows, unitName, eselon1, target);
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}

async function generateExcelResponse(rows, unitName, eselon1, target) {
  const total     = rows.length;
  const checked   = rows.filter((r) => r.status === "checked").length;
  const unchecked = rows.filter((r) => r.status === "unchecked").length;
  const noLink    = rows.filter((r) => r.status === "no_link").length;
  const revisi    = rows.filter((r) => r.status === "revisi").length;
  const sesuai    = rows.filter((r) => r.verdictColor === "HIJAU").length;
  const sebagian  = rows.filter((r) => r.verdictColor === "KUNING").length;
  const tidak     = rows.filter((r) => r.verdictColor === "MERAH").length;

  const timestamp = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });

  const wb = new ExcelJS.Workbook();
  wb.creator = "ZI LKE Checker";

  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D3748" } };
  const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };

  function applyHeader(row) {
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: "FF4A5568" } } };
    });
    row.height = 22;
  }

  // ── Sheet 1: Ringkasan ──
  const ws1 = wb.addWorksheet("Ringkasan");
  ws1.mergeCells("A1:G1");
  ws1.getCell("A1").value = `Laporan Detail Data Dukung ZI — ${unitName || "Unit Kerja"} — ${timestamp}`;
  ws1.getCell("A1").font  = { bold: true, size: 13 };
  ws1.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(1).height = 30;

  if (eselon1) {
    ws1.mergeCells("A2:G2");
    ws1.getCell("A2").value = eselon1;
    ws1.getCell("A2").font  = { size: 10, color: { argb: "FF6B7280" } };
    ws1.getCell("A2").alignment = { horizontal: "center" };
    ws1.addRow([]);
  }

  applyHeader(ws1.addRow(["ID", "Narasi Unit", "Link Drive", "Hasil AI", "Catatan Reviu", "Tgl Cek", "Status"]));

  for (const r of rows) {
    const row = ws1.addRow([
      r.id,
      r.bukti || "",
      r.link  || "",
      r.verdict || (r.status === "no_link" ? "Tanpa Link" : r.status === "unchecked" ? "Belum Dicek" : r.status === "revisi" ? "Revisi" : ""),
      r.reviu  || "",
      r.tglCek || "",
      r.supervisi || "",
    ]);
    const color = r.verdictColor ? COLOR_MAP[r.verdictColor] : COLOR_MAP.NONE;
    [4].forEach((ci) => {
      row.getCell(ci).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color.bg } };
      row.getCell(ci).font = { color: { argb: color.font }, bold: !!r.verdictColor };
    });
    if (r.link) {
      row.getCell(3).value = { text: "Buka Link", hyperlink: r.link };
      row.getCell(3).font  = { color: { argb: "FF3B82F6" }, underline: true };
    }
    [2, 5].forEach((ci) => (row.getCell(ci).alignment = { wrapText: true, vertical: "top" }));
    row.height = r.reviu ? 45 : 18;
  }

  ws1.columns = [{ width: 6 }, { width: 38 }, { width: 14 }, { width: 22 }, { width: 50 }, { width: 18 }, { width: 16 }];

  // ── Sheet 2: Bermasalah ──
  const ws2 = wb.addWorksheet("Perlu Tindak Lanjut");
  const masalah = rows.filter((r) => ["KUNING", "MERAH"].includes(r.verdictColor) || r.status === "revisi" || r.status === "unchecked" || r.status === "no_link");
  ws2.mergeCells("A1:G1");
  ws2.getCell("A1").value = `Data Perlu Tindak Lanjut — ${unitName || "Unit Kerja"}`;
  ws2.getCell("A1").font  = { bold: true, size: 12 };
  ws2.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws2.getRow(1).height = 26;
  ws2.addRow([]);
  applyHeader(ws2.addRow(["ID", "Narasi Unit", "Link Drive", "Hasil AI", "Catatan Reviu", "Tgl Cek", "Keterangan"]));

  for (const r of masalah) {
    const ket = r.status === "no_link" ? "Tidak ada link Drive"
      : r.status === "unchecked" ? "Belum dicek AI"
      : r.status === "revisi" ? "Perlu dicek ulang (Revisi)"
      : r.verdictColor === "KUNING" ? "Sebagian sesuai"
      : "Tidak sesuai";
    const row = ws2.addRow([r.id, r.bukti || "", r.link || "", r.verdict || "", r.reviu || "", r.tglCek || "", ket]);
    const color = r.verdictColor ? COLOR_MAP[r.verdictColor] : COLOR_MAP.NONE;
    row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color.bg } };
    row.getCell(4).font = { color: { argb: color.font }, bold: !!r.verdictColor };
    if (r.link) {
      row.getCell(3).value = { text: "Buka Link", hyperlink: r.link };
      row.getCell(3).font  = { color: { argb: "FF3B82F6" }, underline: true };
    }
    [2, 5].forEach((ci) => (row.getCell(ci).alignment = { wrapText: true, vertical: "top" }));
    row.height = r.reviu ? 45 : 18;
  }
  ws2.columns = [{ width: 6 }, { width: 38 }, { width: 14 }, { width: 22 }, { width: 50 }, { width: 18 }, { width: 22 }];

  // ── Sheet 3: Statistik ──
  const ws3 = wb.addWorksheet("Statistik");
  ws3.mergeCells("A1:C1");
  ws3.getCell("A1").value = `Statistik — ${unitName || "Unit Kerja"}`;
  ws3.getCell("A1").font  = { bold: true, size: 13 };
  ws3.getRow(1).height = 26;

  const stats = [
    ["Tanggal Laporan", timestamp],
    ["Target Predikat", target || "-"],
    [],
    ["Total Data", total],
    ["✅ Sesuai", sesuai],
    ["⚠️ Sebagian Sesuai", sebagian],
    ["❌ Tidak Sesuai", tidak],
    ["🕐 Belum Dicek", unchecked],
    ["🔗 Tanpa Link", noLink],
    ["🔄 Revisi", revisi],
    [],
    ["Progress Pengecekan", `${checked} / ${total} (${total > 0 ? Math.round(checked / total * 100) : 0}%)`],
  ];

  for (const [label, value] of stats) {
    if (!label) { ws3.addRow([]); continue; }
    const row = ws3.addRow([label, value]);
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(2).font = { size: 10 };
    row.height = 18;
  }
  ws3.columns = [{ width: 24 }, { width: 30 }];

  const buffer   = await wb.xlsx.writeBuffer();
  const safeName = (unitName || "unit").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  const filename = `laporan_zi_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.byteLength.toString(),
    },
  });
}
