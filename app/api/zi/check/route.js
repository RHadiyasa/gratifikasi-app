export const maxDuration = 300;

import { google } from "googleapis";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import LkeKriteria from "@/modules/models/LkeKriteria";

// ── Lib modules ─────────────────────────────────────────
import { COL, STANDAR, AI_PATTERN, KOMPONEN_LABEL } from "@/lib/zi/constants";
import { getGoogleAuth } from "@/lib/zi/google-auth";
import {
  extractSheetId, extractFolderId, computeFingerprint,
  detectDataStart, delay, countStats,
} from "@/lib/zi/helpers";
import { readSheet } from "@/lib/zi/sheets";
import { ensureVisaReviewSheet, readVisaReviewMap, writeVisaReviewRows, setVisaReviewDropdown } from "@/lib/zi/visa-review";
import { writeRingkasanAi } from "@/lib/zi/ringkasan-ai";
import { listFilesInFolder, listFilesRecursive, getFileContent } from "@/lib/zi/drive";
import {
  AiCostError, checkByName,
  auditFolderVsNarasi,
  checkWithAIContent, deepContentReview,
  shouldSampleForQC,
  calculateFinalVerdict,
} from "@/lib/zi/ai-checker";
import { generateExcelReport } from "@/lib/zi/excel-report";
import { sendEmailReport } from "@/lib/zi/email";
import { buildScoringDetailMapWithConfig, getScoringWeight, calculateNilaiLkeAi, isDetailKriteria } from "@/lib/zi/scoring";
import { getActiveScoringConfig } from "@/lib/zi/scoring-config";
import { handleAppModeCheck } from "@/lib/zi/app-check";

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
  const standarMap = {};
  const kriteriaMap = {};
  for (const row of standarRows.slice(2)) {
    const id       = String(row[STANDAR.ID       - 1] || "").trim();
    const standar  = String(row[STANDAR.DOK      - 1] || "").trim();
    const kriteria = String(row[STANDAR.KRITERIA - 1] || "").trim();
    if (id && standar)  standarMap[id]  = standar;
    if (id && kriteria) kriteriaMap[id] = kriteria;
  }
  return { standarMap, kriteriaMap };
}

function extractDataRows(penilaianRows, primaryIds = null) {
  const dataStart = detectDataStart(penilaianRows);
  const allDataRows = penilaianRows
    .slice(dataStart)
    .map((row, i) => ({ row, rowNum: i + dataStart + 1 }))
    .filter(({ row }) => {
      const id = String(row[COL.ID - 1] || "").trim();
      if (!/^\d+$/.test(id) || parseInt(id) > 9999) return false;
      return !primaryIds || primaryIds.has(parseInt(id));
    });

  const allValid = allDataRows.filter(({ row }) =>
    String(row[COL.LINK - 1] || "").trim().includes("drive.google"),
  );

  return { dataStart, allDataRows, allValid };
}

function buildJawabanUnitMap(allDataRows) {
  return Object.fromEntries(
    allDataRows.map(({ row }) => [
      String(row[COL.ID - 1] || "").trim(),
      String(row[COL.JAWABAN_UNIT - 1] || "").trim(),
    ]),
  );
}

function classifyRows(allValid, visaMap, linkChangedRows, fingerprintRows) {
  const revisiRows = allValid.filter(({ row }) => {
    const id = String(row[COL.ID - 1]).trim();
    return visaMap[id]?.supervisi === "Revisi";
  });

  // Semua baris yang belum pernah dicek AI — tanpa filter posisi/startId
  // agar ID yang dicek secara random tidak terlewat
  const uncheckedRows = allValid.filter(({ row }) => {
    const id = String(row[COL.ID - 1]).trim();
    const entry = visaMap[id];
    if (!entry) return true;
    if (entry.supervisi === "Revisi") return false;
    if (!AI_PATTERN.test(entry.result)) return true;
    return false;
  });

  return {
    revisiRows,
    uncheckedRows,
    combined: [...revisiRows, ...linkChangedRows, ...fingerprintRows, ...uncheckedRows],
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
      const files = await listFilesRecursive(auth, fId);
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

function buildVisaRowData(id, bukti, linkDrive, fingerprint, verdict, reviuLines, tglCek, scoringDetailMap, jawabanUnit = "") {
  const detail = scoringDetailMap[parseInt(id)];
  const weight = getScoringWeight({ verdict, jawaban_unit: jawabanUnit }, detail);
  const nilaiAi = detail ? Math.round(weight * detail.bobot * 100) / 100 : 0;

  return [
    id, bukti, linkDrive, fingerprint,
    verdict.status,
    reviuLines.join("\n"),
    "Sudah Dicek AI",
    tglCek,
    detail ? KOMPONEN_LABEL[detail.komponen] : "",
    detail?.bobot ?? "",
    nilaiAi,
  ];
}

function isReadableMime(mimeType) {
  return (
    mimeType === "application/vnd.google-apps.document" ||
    mimeType === "application/vnd.google-apps.spreadsheet" ||
    mimeType === "application/vnd.google-apps.presentation" ||
    mimeType === "application/pdf" ||
    mimeType?.startsWith("text/") ||
    mimeType?.startsWith("image/")
  );
}

async function processItem({ row, rowNum }, { auth, standarMap, kriteriaMap, visaMap, fileListCache, send, tglCek, scoringDetailMap }) {
  const id = String(row[COL.ID - 1]).trim();
  const bukti = String(row[COL.BUKTI - 1] || "").trim();
  const linkDrive = String(row[COL.LINK - 1] || "").trim();
  const narasi = String(row[COL.NARASI - 1] || "").trim();
  const jawabanUnit = String(row[COL.JAWABAN_UNIT - 1] || "").trim();
  const standar = standarMap[id] || "";

  if (!standar) {
    send("log", { level: "warn", message: `ID ${id}: tidak ada standar, dilewati` });
    return null;
  }

  const folderId = extractFolderId(linkDrive);
  if (!folderId) {
    send("log", { level: "error", message: `ID ${id}: URL Drive tidak valid` });
    const verdict = { status: "\u274C URL Tidak Valid", score: 0, color: "MERAH" };
    const vrData = buildVisaRowData(id, bukti, linkDrive, "", verdict, ["URL Google Drive tidak valid"], tglCek, scoringDetailMap, jawabanUnit);
    return {
      result: {
        id, bukti, jawaban_unit: jawabanUnit, files: [],
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
      files = await listFilesRecursive(auth, folderId);
      fileListCache[folderId] = files;
      send("log", { level: "info", message: `ID ${id}: ${files.length} file ditemukan (termasuk subfolder)` });
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

  const kriteria = kriteriaMap[id] || "";
  const detail = scoringDetailMap[parseInt(id)];
  const bobot = detail?.bobot ?? 0;

  // ── Layer 0: Smart Heuristic ──
  const nameCheck = checkByName(files, standar);
  const heuristic = {
    heuristicScore: nameCheck.heuristicScore || 0,
    ambiguity: nameCheck.ambiguity || false,
    confidence: nameCheck.confidence || "low",
  };
  let aiCheck;
  let deepReview = null;
  let exhausted  = false;
  let readableFiles = null;
  let deepFileContents = null;

  if (nameCheck.skip) {
    send("log", { level: "info", message: `ID ${id}: Layer 0 — ${nameCheck.result.detail}` });
    aiCheck = nameCheck.result;
  } else {
    // ── Layer 1 (Auditor): Folder + Narasi vs PANRB ──
    send("log", { level: "info", message: `ID ${id}: Auditor — analisis struktur folder, narasi unit, dan kriteria PANRB...` });
    aiCheck = await auditFolderVsNarasi(files, narasi, kriteria, standar, id);
    const temuanLog = aiCheck.temuanKritis ? ` ⚠️ ${aiCheck.temuanKritis}` : "";
    send("log", { level: "info", message: `ID ${id}: Auditor — skor ${aiCheck.score}% (${aiCheck.verdict})${temuanLog}` });

    if (aiCheck.score >= 70) {
      // ── Sesuai: tidak perlu baca konten ──
      send("log", { level: "success", message: `ID ${id}: Auditor menyimpulkan Sesuai — pengecekan konten dilewati` });

    } else if (aiCheck.score >= 40) {
      // ── Sebagian Sesuai: lanjut baca isi dokumen ──
      send("log", { level: "info", message: `ID ${id}: Sebagian sesuai — lanjut ke pengecekan isi dokumen...` });

      readableFiles = files.filter((f) => isReadableMime(f.mimeType));
      const fileContents = await Promise.all(
        readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType, 3)),
      );
      const contentCheck = await checkWithAIContent(files, fileContents, standar, id, readableFiles);
      if (contentCheck.score > aiCheck.score) aiCheck = contentCheck;
      send("log", { level: "info", message: `ID ${id}: Layer 3 — skor ${aiCheck.score}%${contentCheck.isTemplate ? " ⚠️ template terdeteksi" : ""}` });

      // ── Layer 4 Rescue: deep review vs PANRB jika konten masih rendah ──
      if (aiCheck.score < 40 && kriteria) {
        send("log", { level: "info", message: `ID ${id}: Layer 4 rescue — deep review vs PANRB...` });
        deepFileContents = await Promise.all(
          readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType, 15)),
        );
        deepReview = await deepContentReview(files, deepFileContents, kriteria, id, readableFiles);
        if (deepReview && deepReview.revisedScore > aiCheck.score) {
          send("log", { level: "info", message: `ID ${id}: skor direvisi ${aiCheck.score}% → ${deepReview.revisedScore}%` });
          aiCheck.score   = deepReview.revisedScore;
          aiCheck.verdict = deepReview.revisedVerdict || aiCheck.verdict;
        }
      }

      if (aiCheck.score < 40) exhausted = true;

    } else {
      // ── Tidak Sesuai: auditor sudah yakin, tidak perlu cek konten ──
      send("log", { level: "warn", message: `ID ${id}: Auditor menyimpulkan Tidak Sesuai (skor ${aiCheck.score}%) — pengecekan konten tidak diperlukan` });
    }

    // ── QC Sampling: Sonnet spot-check independen (8% random + flag tertentu) ──
    if (!deepReview && kriteria && shouldSampleForQC(heuristic, aiCheck, aiCheck.score)) {
      send("log", { level: "info", message: `ID ${id}: [QC] Sampling Sonnet...` });
      if (!readableFiles) readableFiles = files.filter((f) => isReadableMime(f.mimeType));
      if (!deepFileContents) {
        deepFileContents = await Promise.all(
          readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType, 15)),
        );
      }
      const qcReview = await deepContentReview(files, deepFileContents, kriteria, id, readableFiles);
      if (qcReview) {
        deepReview = { ...qcReview, _qcSampling: true };
        if (qcReview.inconsistencyFlag) {
          send("log", { level: "warn", message: `ID ${id}: [QC] Inkonsistensi — ${qcReview.auditFinding || qcReview.alasan}` });
        }
        if (Math.abs(qcReview.revisedScore - aiCheck.score) > 15) {
          send("log", { level: "info", message: `ID ${id}: [QC] Skor dikoreksi ${aiCheck.score}% → ${qcReview.revisedScore}%` });
          aiCheck.score   = qcReview.revisedScore;
          aiCheck.verdict = qcReview.revisedVerdict || aiCheck.verdict;
        }
      }
    }
  }

  const verdict = calculateFinalVerdict(existCheck, aiCheck, exhausted);

  send("log", {
    level: verdict.color === "HIJAU" ? "success" : verdict.color === "KUNING" ? "warn" : "error",
    message: `ID ${id}: ${verdict.status} (skor: ${aiCheck.score}%)`,
  });

  const reviuLines = [
    existCheck.detail,
    aiCheck.dokumenAda?.length    > 0 ? `Ada: ${aiCheck.dokumenAda.slice(0, 3).map((s) => s.substring(0, 70)).join(", ")}` : "",
    aiCheck.dokumenKurang?.length > 0 ? `Kurang: ${aiCheck.dokumenKurang.slice(0, 3).map((s) => s.substring(0, 70)).join(", ")}` : "",
    aiCheck.pendapat || aiCheck.detail,
    aiCheck.temuanKritis ? `[Temuan Auditor] ${aiCheck.temuanKritis}` : "",
  ].filter(Boolean);

  if (deepReview) {
    const label = deepReview._qcSampling ? "[QC]" : "[Review PANRB]";
    reviuLines.push(`${label} ${deepReview.review || deepReview.alasan || ""}`);
    if (deepReview.inconsistencyFlag && deepReview.auditFinding) {
      reviuLines.push(`[Temuan] ${deepReview.auditFinding}`);
    }
  }

  const vrData = buildVisaRowData(id, bukti, linkDrive, fingerprint, verdict, reviuLines, tglCek, scoringDetailMap, jawabanUnit);

  return {
    result: { id, bukti, jawaban_unit: jawabanUnit, standar, files, existCheck, aiCheck, verdict },
    vrData,
  };
}

function buildMetricsForId(id, kriteriaList, jawabanUnitMap) {
  const metrics = {};
  for (const k of kriteriaList) {
    if (k.answer_type !== "jumlah" || k.parent_question_id !== parseInt(id)) continue;
    const val = jawabanUnitMap[String(k.question_id)];
    if (val === undefined || val === null || String(val).trim() === "") continue;
    const num = Number(val);
    if (isNaN(num)) continue;
    metrics[`qid_${k.question_id}`] = num;
    const key = String(k.sub_komponen || "").trim();
    if (key) metrics[key] = num;
  }
  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

async function computeAndWriteNilaiLke({ submissionId, visaMap, results, sheets, penilaianId, send, scoringDetailMap, jawabanUnitMap, kriteriaList }) {
  const submission = await LkeSubmission.findById(submissionId).select("target").lean();
  const target = submission?.target || "WBK";

  // Seed dari visaMap (run sebelumnya) + override dengan results (run ini)
  const allResultsMap = new Map();
  for (const [id, entry] of Object.entries(visaMap)) {
    if (!AI_PATTERN.test(entry.result)) continue;
    const color = /^\u2705/u.test(entry.result) ? "HIJAU"
      : /^\u26A0\uFE0F/u.test(entry.result) ? "KUNING" : "MERAH";
    const metrics = buildMetricsForId(id, kriteriaList, jawabanUnitMap);
    allResultsMap.set(id, { id, verdict: { color }, jawaban_unit: jawabanUnitMap[id] ?? "", ...(metrics && { metrics }) });
  }
  for (const r of results) {
    const metrics = buildMetricsForId(r.id, kriteriaList, jawabanUnitMap);
    allResultsMap.set(r.id, metrics ? { ...r, metrics } : r);
  }

  const allResultsForScoring = Array.from(allResultsMap.values());
  if (allResultsForScoring.length === 0) return null;

  const nilaiLkeAi = calculateNilaiLkeAi(allResultsForScoring, target, scoringDetailMap);
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

      const send = createSSESender(controller);

      try {
        // ── App mode: delegate ke app-check ──
        const submissionMeta = await LkeSubmission.findById(submissionId).select("source target").lean();
        if (submissionMeta?.source === "app") {
          await handleAppModeCheck({ submissionId, submission: submissionMeta, dataLimit: parseInt(limit) || 0, send });
          return;
        }

        if (!sheetUrl) throw new Error("URL Google Sheet wajib diisi");
        const penilaianId = extractSheetId(sheetUrl);
        const penilaianName = sheetName?.trim() || "Jawaban";
        const standarId = process.env.ZI_STANDARISASI_SHEET_ID;
        const standarName = process.env.ZI_STANDARISASI_SHEET_NAME || "Standarisasi";
        const dataLimit = parseInt(limit) || 0;

        if (!standarId) throw new Error("ZI_STANDARISASI_SHEET_ID belum dikonfigurasi di .env");

        const kriteriaList = await LkeKriteria.find({ aktif: true }).lean();
        const primaryKriteria = kriteriaList.filter((k) => !isDetailKriteria(k));
        const primaryIds = new Set(primaryKriteria.map((k) => Number(k.question_id)));
        const scoringConfig = await getActiveScoringConfig();
        const scoringDetailMap = buildScoringDetailMapWithConfig(kriteriaList, scoringConfig);
        const masterTotalData = primaryKriteria.length;

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
        const { standarMap, kriteriaMap } = buildStandarMap(standarRows);
        send("log", { level: "info", message: `${Object.keys(standarMap).length} standar dokumen ditemukan` });

        // ── Extract & classify rows ──
        const { dataStart, allDataRows, allValid } = extractDataRows(penilaianRows, primaryIds);
        const jawabanUnitMap = buildJawabanUnitMap(allDataRows);
        send("log", { level: "info", message: `Baris data mulai dari baris ke-${dataStart + 1} (ID: ${String(penilaianRows[dataStart]?.[0] || "?").trim()})` });
        send("log", { level: "info", message: `Total data utama: ${masterTotalData} indikator (${allValid.length} punya link Drive di sheet)` });

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

        const { revisiRows, combined } = classifyRows(allValid, visaMap, linkChangedRows, fingerprintRows);

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
        const totalData = masterTotalData;
        const baseChecked = Array.from(primaryIds).filter((id) => {
          const entry = visaMap[String(id)];
          return entry && AI_PATTERN.test(entry.result);
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

          let processed;
          try {
            processed = await processItem(item, { auth, standarMap, kriteriaMap, visaMap, fileListCache, send, tglCek, scoringDetailMap });
          } catch (err) {
            if (err instanceof AiCostError) {
              send("log", { level: "error", message: `Kredit AI habis: ${err.message}` });
              send("error", { message: `Kredit habis. Proses dihentikan pada ID ${id}.` });
              await flushBatch(); // simpan hasil yang sudah selesai sebelumnya
              break;
            }
            throw err;
          }
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
          submissionId, visaMap, results, sheets, penilaianId, send, scoringDetailMap, jawabanUnitMap, kriteriaList,
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
