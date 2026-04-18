export const maxDuration = 300;

import { google } from "googleapis";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";

// ── Lib modules ─────────────────────────────────────────
import { COL, STANDAR, AI_PATTERN, KOMPONEN_LABEL, ID_DETAIL_MAP } from "@/lib/zi/constants";
import { getGoogleAuth } from "@/lib/zi/google-auth";
import {
  extractSheetId, extractFolderId, computeFingerprint,
  detectDataStart, delay, countStats,
} from "@/lib/zi/helpers";
import { readSheet } from "@/lib/zi/sheets";
import { ensureVisaReviewSheet, readVisaReviewMap, writeVisaReviewRows, setVisaReviewDropdown } from "@/lib/zi/visa-review";
import { writeRingkasanAi } from "@/lib/zi/ringkasan-ai";
import { listFilesInFolder, getFileContent } from "@/lib/zi/drive";
import { checkWithAI, calculateFinalVerdict } from "@/lib/zi/ai-checker";
import { generateExcelReport } from "@/lib/zi/excel-report";
import { sendEmailReport } from "@/lib/zi/email";
import { getAnswerWeight, calculateNilaiLkeAi } from "@/lib/zi/scoring";

// ── Helpers ─────────────────────────────────────────────

function createSSESender(controller) {
  const encoder = new TextEncoder();
  return (type, payload) => {
    try {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`),
      );
    } catch { /* client disconnected */ }
  };
}

function buildStandarMap(standarRows) {
  const map = {};
  for (const row of standarRows.slice(2)) {
    const id = String(row[STANDAR.ID - 1] || "").trim();
    const standar = String(row[STANDAR.DOK - 1] || "").trim();
    if (id && standar) map[id] = standar;
  }
  return map;
}

function extractDataRows(penilaianRows) {
  const dataStart = detectDataStart(penilaianRows);
  const allDataRows = penilaianRows
    .slice(dataStart)
    .map((row, i) => ({ row, rowNum: i + dataStart + 1 }))
    .filter(({ row }) => {
      const id = String(row[COL.ID - 1] || "").trim();
      return /^\d+$/.test(id) && parseInt(id) <= 9999;
    });

  const allValid = allDataRows.filter(({ row }) =>
    String(row[COL.LINK - 1] || "").trim().includes("drive.google"),
  );

  return { dataStart, allDataRows, allValid };
}

function classifyRows(allValid, visaMap, linkChangedRows, fingerprintRows, startId) {
  const revisiRows = allValid.filter(({ row }) => {
    const id = String(row[COL.ID - 1]).trim();
    return visaMap[id]?.supervisi === "Revisi";
  });

  const uncheckedRows = allValid.filter(({ row }) => {
    const id = String(row[COL.ID - 1]).trim();
    const entry = visaMap[id];
    if (!entry) return true;
    if (entry.supervisi === "Revisi") return false;
    if (!AI_PATTERN.test(entry.result)) return true;
    return false;
  });

  let offsetted = uncheckedRows;
  if (startId) {
    const startIdx = uncheckedRows.findIndex(
      ({ row }) => parseInt(String(row[COL.ID - 1]).trim()) >= parseInt(startId),
    );
    if (startIdx > 0) offsetted = uncheckedRows.slice(startIdx);
    else if (startIdx === -1) offsetted = [];
  }

  return {
    revisiRows,
    uncheckedRows: offsetted,
    combined: [...revisiRows, ...linkChangedRows, ...fingerprintRows, ...offsetted],
  };
}

function detectLinkChangedRows(allValid, visaMap) {
  return allValid.filter(({ row }) => {
    const id = String(row[COL.ID - 1]).trim();
    const entry = visaMap[id];
    if (!entry || !AI_PATTERN.test(entry.result)) return false;
    if (entry.supervisi === "Revisi") return false;
    const currentLink = String(row[COL.LINK - 1] || "").trim();
    return entry.linkDicek !== currentLink;
  });
}

async function detectFingerprintChanges(allValid, visaMap, auth, fileListCache, send) {
  const checkedStable = allValid.filter(({ row }) => {
    const id = String(row[COL.ID - 1]).trim();
    const entry = visaMap[id];
    if (!entry || !AI_PATTERN.test(entry.result)) return false;
    if (entry.supervisi === "Revisi") return false;
    const currentLink = String(row[COL.LINK - 1] || "").trim();
    return entry.linkDicek === currentLink;
  });

  send("log", { level: "info", message: `Memeriksa perubahan konten ${checkedStable.length} folder...` });
  const changed = [];

  for (const item of checkedStable) {
    const id = String(item.row[COL.ID - 1]).trim();
    const link = String(item.row[COL.LINK - 1] || "").trim();
    const fId = extractFolderId(link);
    if (!fId) continue;
    try {
      const files = await listFilesInFolder(auth, fId);
      fileListCache[fId] = files;
      if (computeFingerprint(files) !== visaMap[id].fingerprint) {
        changed.push(item);
      }
    } catch { /* biarkan lewat */ }
  }

  if (changed.length > 0) {
    send("log", { level: "warn", message: `${changed.length} folder berubah konten, akan dicek ulang` });
  }
  return changed;
}

function buildVisaRowData(id, bukti, linkDrive, fingerprint, verdict, reviuLines, tglCek) {
  const detail = ID_DETAIL_MAP[parseInt(id)];
  const weight = getAnswerWeight(verdict.color, detail?.answer_type);
  const nilaiAi = detail ? Math.round(weight * detail.bobot * 100) / 100 : 0;

  return [
    id, bukti, linkDrive, fingerprint,
    verdict.status,
    reviuLines.join(" | "),
    "Sudah Dicek AI",
    tglCek,
    detail ? KOMPONEN_LABEL[detail.komponen] : "",
    detail?.bobot ?? "",
    nilaiAi,
  ];
}

async function processItem({ row, rowNum }, { auth, standarMap, visaMap, fileListCache, send, tglCek }) {
  const id = String(row[COL.ID - 1]).trim();
  const bukti = String(row[COL.BUKTI - 1] || "").trim();
  const linkDrive = String(row[COL.LINK - 1] || "").trim();
  const standar = standarMap[id] || "";

  if (!standar) {
    send("log", { level: "warn", message: `ID ${id}: tidak ada standar, dilewati` });
    return null;
  }

  const folderId = extractFolderId(linkDrive);
  if (!folderId) {
    send("log", { level: "error", message: `ID ${id}: URL Drive tidak valid` });
    const verdict = { status: "\u274C URL Tidak Valid", score: 0, color: "MERAH" };
    const vrData = buildVisaRowData(id, bukti, linkDrive, "", verdict, ["URL Google Drive tidak valid"], tglCek);
    return {
      result: {
        id, bukti, files: [],
        existCheck: { exists: false, fileCount: 0, detail: "URL tidak valid" },
        aiCheck: { score: 0, verdict: "N/A", detail: "URL Drive tidak valid", dokumenAda: [], dokumenKurang: [] },
        verdict,
      },
      vrData,
    };
  }

  // Gunakan cache jika sudah di-fetch saat fingerprint check
  let files = fileListCache[folderId] ?? null;
  if (files === null) {
    try {
      files = await listFilesInFolder(auth, folderId);
      fileListCache[folderId] = files;
      send("log", { level: "info", message: `ID ${id}: ${files.length} file ditemukan` });
    } catch (err) {
      files = [];
      send("log", { level: "error", message: `ID ${id}: gagal akses Drive \u2014 ${err.message}` });
    }
  } else {
    send("log", { level: "info", message: `ID ${id}: ${files.length} file ditemukan (cached)` });
  }

  const fingerprint = computeFingerprint(files);
  const existCheck = {
    exists: files.length > 0,
    fileCount: files.length,
    detail: files.length > 0 ? `${files.length} file ditemukan` : "Folder kosong",
  };

  let fileContents = [];
  if (existCheck.exists) {
    const readable = files
      .filter((f) =>
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
    level: verdict.color === "HIJAU" ? "success" : verdict.color === "KUNING" ? "warn" : "error",
    message: `ID ${id}: ${verdict.status} (skor: ${aiCheck.score}%)`,
  });

  const reviuLines = [
    existCheck.detail,
    aiCheck.dokumenAda?.length > 0 ? `Ada: ${aiCheck.dokumenAda.slice(0, 3).join(", ")}` : "",
    aiCheck.dokumenKurang?.length > 0 ? `Kurang: ${aiCheck.dokumenKurang.slice(0, 3).join(", ")}` : "",
    aiCheck.detail,
  ].filter(Boolean);

  const vrData = buildVisaRowData(id, bukti, linkDrive, fingerprint, verdict, reviuLines, tglCek);

  return {
    result: { id, bukti, standar, files, existCheck, aiCheck, verdict },
    vrData,
  };
}

async function computeAndWriteNilaiLke({ submissionId, visaMap, results, sheets, penilaianId, send }) {
  const submission = await LkeSubmission.findById(submissionId).select("target").lean();
  const target = submission?.target || "WBK";

  // Seed dari visaMap (run sebelumnya) + override dengan results (run ini)
  const allResultsMap = new Map();
  for (const [id, entry] of Object.entries(visaMap)) {
    if (!AI_PATTERN.test(entry.result)) continue;
    const color = /^\u2705/u.test(entry.result) ? "HIJAU"
      : /^\u26A0\uFE0F/u.test(entry.result) ? "KUNING" : "MERAH";
    allResultsMap.set(id, { id, verdict: { color } });
  }
  for (const r of results) allResultsMap.set(r.id, r);

  const allResultsForScoring = Array.from(allResultsMap.values());
  if (allResultsForScoring.length === 0) return null;

  const nilaiLkeAi = calculateNilaiLkeAi(allResultsForScoring, target);
  send("log", {
    level: "info",
    message: `Penilaian AI: nilai akhir ${nilaiLkeAi.nilai_akhir ?? "\u2014"} (${target}) \u2014 dari ${allResultsForScoring.length} item tercek`,
  });

  try {
    await writeRingkasanAi(sheets, penilaianId, nilaiLkeAi, target);
    send("log", { level: "success", message: "Sheet 'Ringkasan AI' diperbarui \u2713" });
  } catch (err) {
    send("log", { level: "warn", message: `Gagal tulis Ringkasan AI: ${err.message}` });
  }

  return nilaiLkeAi;
}

// ── Main SSE Route ───────────────────────────────────────
export async function POST(req) {
  const {
    submissionId, sheetUrl, sheetName, limit,
    startFromId, email, checkContentChange,
  } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      await connect();
      if (!submissionId) throw new Error("submissionId wajib diisi");
      if (!sheetUrl) throw new Error("URL Google Sheet wajib diisi");

      const send = createSSESender(controller);

      try {
        const penilaianId = extractSheetId(sheetUrl);
        const penilaianName = sheetName?.trim() || "Jawaban";
        const standarId = process.env.ZI_STANDARISASI_SHEET_ID;
        const standarName = process.env.ZI_STANDARISASI_SHEET_NAME || "Standarisasi";
        const dataLimit = parseInt(limit) || 0;
        const startId = String(startFromId ?? "").trim();

        if (!standarId) throw new Error("ZI_STANDARISASI_SHEET_ID belum dikonfigurasi di .env");

        // ── Init Google ──
        send("log", { level: "info", message: "Menginisialisasi koneksi Google..." });
        const auth = getGoogleAuth();
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        // ── Baca Sheets ──
        send("log", { level: "info", message: `Membaca Sheet LKE: ${penilaianName}...` });
        const penilaianRows = await readSheet(auth, penilaianId, penilaianName);

        send("log", { level: "info", message: "Membaca Sheet Standarisasi..." });
        const standarRows = await readSheet(auth, standarId, standarName);
        const standarMap = buildStandarMap(standarRows);
        send("log", { level: "info", message: `${Object.keys(standarMap).length} standar dokumen ditemukan` });

        // ── Extract & classify rows ──
        const { dataStart, allDataRows, allValid } = extractDataRows(penilaianRows);
        send("log", { level: "info", message: `Baris data mulai dari baris ke-${dataStart + 1} (ID: ${String(penilaianRows[dataStart]?.[0] || "?").trim()})` });
        send("log", { level: "info", message: `Total data: ${allDataRows.length} baris (${allValid.length} punya link Drive, ${allDataRows.length - allValid.length} tanpa link)` });

        // ── Baca Visa review ──
        send("log", { level: "info", message: "Membaca sheet 'Visa review'..." });
        const { map: visaMap, totalRows: visaRowCount } = await readVisaReviewMap(auth, penilaianId);
        send("log", { level: "info", message: `${Object.keys(visaMap).length} entri ditemukan di Visa review` });

        // ── Detect changes ──
        const linkChangedRows = detectLinkChangedRows(allValid, visaMap);
        const fileListCache = {};
        const fingerprintRows = checkContentChange
          ? await detectFingerprintChanges(allValid, visaMap, auth, fileListCache, send)
          : [];

        const { revisiRows, combined } = classifyRows(allValid, visaMap, linkChangedRows, fingerprintRows, startId);

        if (revisiRows.length > 0)
          send("log", { level: "info", message: `${revisiRows.length} baris status "Revisi" akan dicek ulang` });
        if (linkChangedRows.length > 0)
          send("log", { level: "info", message: `${linkChangedRows.length} baris link berubah akan dicek ulang` });

        const rowsToProcess = dataLimit > 0 ? combined.slice(0, dataLimit) : combined;
        const total = rowsToProcess.length;

        send("log", { level: "info", message: `Mulai memproses ${total} item...` });
        send("total", {
          total,
          revisiCount: revisiRows.length,
          linkChangedCount: linkChangedRows.length,
          fingerprintChangedCount: fingerprintRows.length,
        });

        // ── Progress tracking ──
        const totalData = allDataRows.length;
        const baseChecked = allDataRows.filter(({ row }) => {
          const id = String(row[COL.ID - 1]).trim();
          return visaMap[id] && AI_PATTERN.test(visaMap[id].result);
        }).length;
        let uncheckedProcessed = 0;

        await LkeSubmission.findByIdAndUpdate(submissionId, {
          total_data: totalData,
          checked_count: baseChecked,
          unchecked_count: totalData - baseChecked,
          progress_percent: totalData > 0 ? Math.round((baseChecked / totalData) * 100) : 0,
          status: "Sedang Dicek",
          last_checked_at: new Date(),
        });

        // ── Processing loop ──
        const results = [];
        const visaExistUpdates = [];
        const visaNewRows = [];
        const tglCek = new Date().toLocaleString("id-ID");
        const BATCH_SIZE = 5;
        let savedCount = 0;
        let totalNewRowsWritten = 0;
        let lastSavedId = null;
        let vrSheetProps = null;

        try {
          vrSheetProps = await ensureVisaReviewSheet(sheets, penilaianId);
        } catch (e) {
          send("log", { level: "warn", message: `Gagal siapkan sheet Visa review: ${e.message}` });
        }

        async function flushBatch() {
          if (visaExistUpdates.length === 0 && visaNewRows.length === 0) return;
          try {
            if (!vrSheetProps) vrSheetProps = await ensureVisaReviewSheet(sheets, penilaianId);
            const newCount = visaNewRows.length;
            await writeVisaReviewRows(sheets, penilaianId, [...visaExistUpdates], [...visaNewRows]);
            savedCount += visaExistUpdates.length + newCount;
            totalNewRowsWritten += newCount;
            visaExistUpdates.length = 0;
            visaNewRows.length = 0;
            send("batch_saved", { savedCount, lastSavedId });
          } catch (e) {
            send("log", { level: "warn", message: `Gagal simpan batch: ${e.message}` });
          }
        }

        for (let idx = 0; idx < rowsToProcess.length; idx++) {
          const item = rowsToProcess[idx];
          const id = String(item.row[COL.ID - 1]).trim();
          const bukti = String(item.row[COL.BUKTI - 1] || "").trim();

          const isNewRow = !visaMap[id] || !AI_PATTERN.test(visaMap[id].result);
          if (isNewRow) uncheckedProcessed++;
          const currentChecked = Math.min(totalData, baseChecked + uncheckedProcessed);
          const progressPercent = totalData > 0 ? Math.round((currentChecked / totalData) * 100) : 0;

          await LkeSubmission.findByIdAndUpdate(submissionId, {
            total_data: totalData,
            checked_count: currentChecked,
            unchecked_count: totalData - currentChecked,
            progress_percent: progressPercent,
            status: progressPercent >= 100 ? "Selesai" : "Sedang Dicek",
            last_checked_at: new Date(),
          });

          const isRevisi = visaMap[id]?.supervisi === "Revisi";
          const isLinkChanged = linkChangedRows.some((r) => String(r.row[COL.ID - 1]).trim() === id);
          const isFpChanged = fingerprintRows.some((r) => String(r.row[COL.ID - 1]).trim() === id);
          const tag = isRevisi ? "[Revisi] " : isLinkChanged ? "[Link Baru] " : isFpChanged ? "[Konten Baru] " : "";

          send("progress", {
            current: idx + 1, total, id,
            message: `${tag}ID ${id} \u2014 ${bukti.substring(0, 50)}${bukti.length > 50 ? "\u2026" : ""}`,
          });

          const processed = await processItem(item, { auth, standarMap, visaMap, fileListCache, send, tglCek });
          if (!processed) continue;

          results.push(processed.result);
          if (visaMap[id]) {
            visaExistUpdates.push({ rowNum: visaMap[id].rowNum, rowData: processed.vrData });
          } else {
            visaNewRows.push(processed.vrData);
          }
          lastSavedId = id;

          if ((visaExistUpdates.length + visaNewRows.length) >= BATCH_SIZE) {
            send("log", { level: "info", message: `Menyimpan batch ke sheet... (${savedCount + visaExistUpdates.length + visaNewRows.length} tersimpan)` });
            await flushBatch();
          }

          await delay(600);
        }

        // ── Flush sisa ──
        if (visaExistUpdates.length > 0 || visaNewRows.length > 0) {
          send("log", { level: "info", message: `Menulis ${visaExistUpdates.length} update + ${visaNewRows.length} baru ke sheet 'Visa review'...` });
          try {
            const remainingNew = visaNewRows.length;
            await writeVisaReviewRows(sheets, penilaianId, visaExistUpdates, visaNewRows);
            savedCount += visaExistUpdates.length + remainingNew;
            totalNewRowsWritten += remainingNew;
            visaExistUpdates.length = 0;
            visaNewRows.length = 0;
            send("log", { level: "success", message: "Sheet 'Visa review' diupdate \u2713" });
          } catch (err) {
            send("log", { level: "warn", message: `Gagal update Visa review: ${err.message}` });
          }
        }

        // ── Dropdown ──
        try {
          if (vrSheetProps) {
            const existingDataRows = visaRowCount > 0 ? visaRowCount - 1 : 0;
            await setVisaReviewDropdown(sheets, penilaianId, vrSheetProps, existingDataRows + totalNewRowsWritten);
            send("log", { level: "success", message: "Dropdown supervisi terpasang \u2713" });
          }
        } catch (err) {
          send("log", { level: "warn", message: `Gagal pasang dropdown: ${err.message}` });
        }

        // ── Excel ──
        send("log", { level: "info", message: "Membuat laporan Excel..." });
        const reportId = Date.now();
        const excelPath = await generateExcelReport(results, reportId);
        send("log", { level: "success", message: "Laporan Excel selesai \u2713" });

        // ── Email ──
        if (email?.trim()) {
          send("log", { level: "info", message: `Mengirim email ke ${email}...` });
          try {
            await sendEmailReport(results, excelPath, email.trim());
            send("log", { level: "success", message: `Email terkirim ke ${email} \u2713` });
          } catch (err) {
            send("log", { level: "warn", message: `Gagal kirim email: ${err.message}` });
          }
        }

        // ── Nilai LKE AI ──
        const nilaiLkeAi = await computeAndWriteNilaiLke({
          submissionId, visaMap, results, sheets, penilaianId, send,
        });

        // ── Final MongoDB update ──
        try {
          const finalChecked = Math.min(totalData, baseChecked + uncheckedProcessed);
          const finalPct = totalData > 0 ? Math.round((finalChecked / totalData) * 100) : 0;
          const finalStatus = finalPct >= 100 ? "Selesai" : finalPct > 0 ? "Sedang Dicek" : "Belum Dicek";

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
          send("log", { level: "success", message: `Monitoring diupdate: ${finalChecked}/${totalData} data (${finalPct}%) \u2014 ${finalStatus}` });
        } catch (e) {
          send("log", { level: "warn", message: `Gagal update monitoring: ${e.message}` });
        }

        // ── Done ──
        const { sesuai, sebagian, tidak } = countStats(results);
        send("done", { reportId, summary: { total: results.length, sesuai, sebagian, tidak } });
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
