import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import os from "os";
import { countStats } from "./helpers.js";

const COLOR_MAP = {
  HIJAU: { bg: "FFD4EDDA", font: "FF155724" },
  KUNING: { bg: "FFFFF3CD", font: "FF856404" },
  MERAH: { bg: "FFF8D7DA", font: "FF721C24" },
};

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2E4057" },
};
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

function applyHeader(row) {
  row.eachCell((c) => {
    c.font = HEADER_FONT;
    c.fill = HEADER_FILL;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  row.height = 22;
}

function applyColorCell(cell, color) {
  const c = COLOR_MAP[color] || COLOR_MAP.MERAH;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.bg } };
  cell.font = { color: { argb: c.font }, bold: true };
}

function buildRingkasanSheet(wb, results, timestamp) {
  const ws = wb.addWorksheet("Ringkasan");
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = `Laporan Pengecekan Data Dukung ZI \u2014 ${timestamp}`;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  applyHeader(
    ws.addRow([
      "ID", "Bukti Data Dukung", "Standar Dokumen", "Jml File",
      "Matchers", "Skor AI", "Result AI", "Reviu",
    ]),
  );

  for (const r of results) {
    const row = ws.addRow([
      r.id,
      r.bukti || "",
      r.standar || "",
      r.existCheck?.fileCount || 0,
      r.aiCheck?.dokumenAda?.join(", ") || "-",
      `${r.aiCheck?.score || 0}%`,
      r.verdict?.status || "",
      r.aiCheck?.detail || "",
    ]);
    applyColorCell(row.getCell(7), r.verdict?.color);
    [2, 3, 5, 8].forEach(
      (i) => (row.getCell(i).alignment = { wrapText: true, vertical: "top" }),
    );
    row.height = 60;
  }

  ws.columns = [
    { width: 6 }, { width: 32 }, { width: 40 }, { width: 9 },
    { width: 35 }, { width: 9 }, { width: 20 }, { width: 45 },
  ];
}

function buildDetailSheet(wb, results) {
  const ws = wb.addWorksheet("Detail File");
  applyHeader(
    ws.addRow([
      "ID", "Bukti Data", "Standar Dokumen", "File di Drive",
      "Dokumen Ada (AI)", "Dokumen Kurang (AI)", "Result AI", "Skor",
    ]),
  );

  for (const r of results) {
    const row = ws.addRow([
      r.id,
      r.bukti || "",
      r.standar || "",
      r.files?.map((f) => f.name).join("\n") || "-",
      r.aiCheck?.dokumenAda?.join("\n") || "-",
      r.aiCheck?.dokumenKurang?.join("\n") || "-",
      r.verdict?.status || "",
      r.verdict?.score || 0,
    ]);
    applyColorCell(row.getCell(7), r.verdict?.color);
    [2, 3, 4, 5, 6].forEach(
      (i) => (row.getCell(i).alignment = { wrapText: true, vertical: "top" }),
    );
    row.height = 80;
  }

  ws.columns = [
    { width: 6 }, { width: 30 }, { width: 40 }, { width: 40 },
    { width: 35 }, { width: 35 }, { width: 20 }, { width: 8 },
  ];
}

function buildStatistikSheet(wb, results) {
  const ws = wb.addWorksheet("Statistik");
  const { total, sesuai, sebagian, tidak } = countStats(results);

  ws.mergeCells("A1:C1");
  ws.getCell("A1").value = "Statistik Pengecekan Data Dukung ZI";
  ws.getCell("A1").font = { bold: true, size: 13 };
  ws.getRow(1).height = 24;
  ws.addRow([
    "Tanggal",
    new Date().toLocaleDateString("id-ID", { dateStyle: "long" }),
  ]);
  ws.addRow([]);
  ws.addRow(["Total item diproses", total, "100%"]);

  const pct = (n) => `${total ? Math.round((n / total) * 100) : 0}%`;

  const r5 = ws.addRow(["\u2705 Sesuai", sesuai, pct(sesuai)]);
  applyColorCell(r5.getCell(1), "HIJAU");

  const r6 = ws.addRow(["\u26A0\uFE0F Sebagian Sesuai", sebagian, pct(sebagian)]);
  applyColorCell(r6.getCell(1), "KUNING");

  const r7 = ws.addRow(["\u274C Tidak Sesuai", tidak, pct(tidak)]);
  applyColorCell(r7.getCell(1), "MERAH");

  ws.columns = [{ width: 22 }, { width: 10 }, { width: 8 }];
}

export async function generateExcelReport(results, reportId) {
  const dir = path.join(os.tmpdir(), "zi-laporan");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 10);
  const filePath = path.join(dir, `laporan_zi_${reportId}.xlsx`);

  const wb = new ExcelJS.Workbook();
  wb.creator = "ZI Dokumen Checker";

  buildRingkasanSheet(wb, results, timestamp);
  buildDetailSheet(wb, results);
  buildStatistikSheet(wb, results);

  await wb.xlsx.writeFile(filePath);
  return filePath;
}
