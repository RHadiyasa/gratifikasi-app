export const maxDuration = 300;

import { google } from "googleapis";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import LkeKriteria from "@/modules/models/LkeKriteria";

import { COL, STANDAR, KOMPONEN_LABEL, AI_PATTERN } from "@/lib/zi/constants";
import { getGoogleAuth } from "@/lib/zi/google-auth";
import {
  extractSheetId, extractFolderId, computeFingerprint, detectDataStart,
} from "@/lib/zi/helpers";
import { readSheet } from "@/lib/zi/sheets";
import {
  ensureVisaReviewSheet, readVisaReviewMap, writeVisaReviewRows,
} from "@/lib/zi/visa-review";
import { listFilesRecursive, getFileContent } from "@/lib/zi/drive";
import {
  AiCostError, checkByName,
  checkWithAINames, checkWithAINamesPanrb,
  checkWithAIContent, deepContentReview,
  confidenceRouting, shouldSampleForQC,
  calculateFinalVerdict,
} from "@/lib/zi/ai-checker";
import { buildScoringDetailMapWithConfig, getScoringWeight, calculateNilaiLkeAi, isDetailKriteria } from "@/lib/zi/scoring";
import { getActiveScoringConfig } from "@/lib/zi/scoring-config";
import { writeRingkasanAi } from "@/lib/zi/ringkasan-ai";
import { handleSingleAppModeCheck } from "@/lib/zi/app-check";

// Cache in-memory untuk mengurangi Google Sheets API reads per menit.
// Standarisasi: jarang berubah → TTL 5 menit.
// Sheet LKE (Jawaban): berubah perlahan → TTL 30 detik.
const _sheetCache = new Map();
const STANDAR_TTL = 5 * 60 * 1000;
const JAWABAN_TTL = 30 * 1000;

async function readSheetCached(auth, sheetId, sheetName, ttl) {
  const key = `${sheetId}:${sheetName}`;
  const hit = _sheetCache.get(key);
  if (hit && Date.now() - hit.ts < ttl) return hit.data;
  const data = await readSheet(auth, sheetId, sheetName);
  _sheetCache.set(key, { data, ts: Date.now() });
  return data;
}

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
  const standarMap  = {};
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

function buildVisaRowData(id, bukti, linkDrive, fingerprint, verdict, reviuLines, tglCek, scoringDetailMap, jawabanUnit = "") {
  const detail  = scoringDetailMap[parseInt(id)];
  const weight  = getScoringWeight({ verdict, jawaban_unit: jawabanUnit }, detail);
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

function buildJawabanUnitMap(penilaianRows, dataStart, primaryIds) {
  const map = {};
  for (const row of penilaianRows.slice(dataStart)) {
    const id = String(row[COL.ID - 1] || "").trim();
    if (!/^\d+$/.test(id) || !primaryIds.has(Number(id))) continue;
    map[id] = String(row[COL.JAWABAN_UNIT - 1] || "").trim();
  }
  return map;
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

function isReadableMime(mimeType) {
  return (
    mimeType === "application/vnd.google-apps.document"     ||
    mimeType === "application/vnd.google-apps.spreadsheet"  ||
    mimeType === "application/vnd.google-apps.presentation" ||
    mimeType === "application/pdf"                          ||
    mimeType?.startsWith("text/")                           ||
    mimeType?.startsWith("image/")
  );
}

export async function POST(req) {
  const { submissionId, rowId, sheetUrl, sheetName } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const send = createSSESender(controller);
      try {
        await connect();

        if (!submissionId || !rowId) {
          throw new Error("submissionId dan rowId wajib diisi");
        }

        // ── App mode: delegate ke app-check ──
        const submissionDoc = await LkeSubmission.findById(submissionId).select("source target total_data").lean();
        if (submissionDoc?.source === "app") {
          await handleSingleAppModeCheck({ submissionId, questionId: rowId, send });
          return;
        }

        if (!sheetUrl) throw new Error("sheetUrl wajib diisi");
        const penilaianId   = extractSheetId(sheetUrl);
        const penilaianName = sheetName?.trim() || "Jawaban";
        const standarId     = process.env.ZI_STANDARISASI_SHEET_ID;
        const standarName   = process.env.ZI_STANDARISASI_SHEET_NAME || "Standarisasi";

        if (!standarId) throw new Error("ZI_STANDARISASI_SHEET_ID belum dikonfigurasi di .env");

        const kriteriaList = await LkeKriteria.find({ aktif: true }).lean();
        const kriteriaDoc = kriteriaList.find((k) => Number(k.question_id) === Number(rowId));
        if (!kriteriaDoc) throw new Error(`ID ${rowId} tidak ditemukan di master kriteria`);
        if (isDetailKriteria(kriteriaDoc)) {
          throw new Error(`ID ${rowId} adalah detil indikator. Pemeriksaan dilakukan melalui parent ID ${kriteriaDoc.parent_question_id}.`);
        }
        const primaryKriteria = kriteriaList.filter((k) => !isDetailKriteria(k));
        const primaryIds = new Set(primaryKriteria.map((k) => Number(k.question_id)));
        const scoringConfig = await getActiveScoringConfig();
        const scoringDetailMap = buildScoringDetailMapWithConfig(kriteriaList, scoringConfig);

        // ── Init Google ──
        send("log", { level: "info", message: "Menginisialisasi koneksi Google..." });
        const auth   = getGoogleAuth();
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        // ── Baca sheet LKE — cari baris target ──
        send("log", { level: "info", message: `Membaca sheet "${penilaianName}"...` });
        const penilaianRows = await readSheetCached(auth, penilaianId, penilaianName, JAWABAN_TTL);
        const dataStart     = detectDataStart(penilaianRows);
        const jawabanUnitMap = buildJawabanUnitMap(penilaianRows, dataStart, primaryIds);

        const targetEntry = penilaianRows
          .slice(dataStart)
          .map((row, i) => ({ row, rowNum: i + dataStart + 1 }))
          .find(({ row }) => String(row[COL.ID - 1] || "").trim() === String(rowId));

        if (!targetEntry) {
          throw new Error(`ID ${rowId} tidak ditemukan di sheet "${penilaianName}"`);
        }

        const { row } = targetEntry;
        const bukti     = String(row[COL.BUKTI - 1] || "").trim();
        const linkDrive = String(row[COL.LINK  - 1] || "").trim();
        const jawabanUnit = String(row[COL.JAWABAN_UNIT - 1] || "").trim();

        if (!linkDrive.includes("drive.google")) {
          throw new Error(`ID ${rowId}: tidak memiliki link Google Drive`);
        }

        // ── Baca standar ──
        send("log", { level: "info", message: "Membaca standar dokumen..." });
        const standarRows         = await readSheetCached(auth, standarId, standarName, STANDAR_TTL);
        const { standarMap, kriteriaMap } = buildStandarMap(standarRows);
        const standar             = standarMap[String(rowId)] || "";
        const kriteria            = kriteriaMap[String(rowId)] || "";

        if (!standar) {
          throw new Error(`ID ${rowId}: tidak ada standar dokumen yang terdefinisi`);
        }

        // ── Baca Visa review ──
        send("log", { level: "info", message: "Membaca sheet 'Visa review'..." });
        const { map: visaMap } = await readVisaReviewMap(auth, penilaianId);
        const existingEntry    = visaMap[String(rowId)];

        // ── Pastikan sheet Visa review ada ──
        try {
          await ensureVisaReviewSheet(sheets, penilaianId);
        } catch (e) {
          // Bila error karena sheet sudah ada (race condition parallel check), lanjut saja
          if (!e.message?.includes("already exists")) {
            send("log", { level: "warn", message: `Peringatan sheet Visa review: ${e.message}` });
          }
        }

        // ── Akses folder Drive ──
        const folderId = extractFolderId(linkDrive);
        if (!folderId) throw new Error(`ID ${rowId}: URL Drive tidak valid`);

        send("log", { level: "info", message: `ID ${rowId}: membaca folder Drive...` });
        let files = [];
        try {
          files = await listFilesRecursive(auth, folderId);
          send("log", { level: "info", message: `ID ${rowId}: ${files.length} file ditemukan (termasuk subfolder)` });
        } catch (err) {
          send("log", { level: "error", message: `ID ${rowId}: gagal akses Drive — ${err.message}` });
        }

        const fingerprint = computeFingerprint(files);
        const existCheck  = {
          exists:    files.length > 0,
          fileCount: files.length,
          detail:    files.length > 0 ? `${files.length} file ditemukan` : "Folder kosong",
        };

        const detailItem = scoringDetailMap[parseInt(rowId)];
        const bobot = detailItem?.bobot ?? 0;

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
          send("log", { level: "info", message: `ID ${rowId}: Layer 0 — ${nameCheck.result.detail}` });
          aiCheck = nameCheck.result;
        } else {
          // ── Layer 1: AI nama file vs standar ──
          send("log", { level: "info", message: `ID ${rowId}: Layer 1 — Analisis folder vs standar...` });
          try {
            aiCheck = await checkWithAINames(files, standar, rowId);
          } catch (err) {
            if (err instanceof AiCostError) {
              send("error", { message: `Kredit AI habis: ${err.message}.` });
              controller.close();
              return;
            }
            throw err;
          }
          send("log", { level: "info", message: `ID ${rowId}: Layer 1 — skor ${aiCheck.score}% (confidence: ${aiCheck.confidence})` });

          // ── Layer 1b: nama file vs PANRB (hanya jika skor rendah & ada kriteria) ──
          if (aiCheck.score < 65 && !kriteria) {
            send("log", { level: "warn", message: `ID ${rowId}: Layer 1b — dilewati (kriteria PANRB kosong)` });
          }
          if (aiCheck.score < 65 && kriteria && existCheck.exists) {
            send("log", { level: "info", message: `ID ${rowId}: Layer 1b — nama file vs PANRB...` });
            try {
              const panrbNameCheck = await checkWithAINamesPanrb(files, kriteria, rowId);
              if (panrbNameCheck.score > aiCheck.score) aiCheck = panrbNameCheck;
            } catch (err) {
              if (err instanceof AiCostError) {
                send("error", { message: `Kredit AI habis: ${err.message}. Silakan top-up akun Anthropic.` });
                controller.close();
                return;
              }
              throw err;
            }
            send("log", { level: "info", message: `ID ${rowId}: Layer 1b — skor ${aiCheck.score}%` });
          }

          // ── Layer 2: Confidence Routing ──
          const routing = confidenceRouting(heuristic, aiCheck, existCheck, bobot);

          if (routing.needsContentCheck) {
            // ── Layer 3: isi dokumen vs standar ──
            send("log", { level: "info", message: `ID ${rowId}: Layer 3 — membaca isi dokumen (alasan: ${routing.reason})...` });
            readableFiles = files.filter((f) => isReadableMime(f.mimeType));
            const fileContents = await Promise.all(
              readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType, 3)),
            );
            try {
              const contentCheck = await checkWithAIContent(files, fileContents, standar, rowId, readableFiles);
              if (contentCheck.score > aiCheck.score) aiCheck = contentCheck;
            } catch (err) {
              if (err instanceof AiCostError) {
                send("error", { message: `Kredit AI habis: ${err.message}. Silakan top-up akun Anthropic.` });
                controller.close();
                return;
              }
              throw err;
            }
            send("log", { level: "info", message: `ID ${rowId}: Layer 3 — skor ${aiCheck.score}%${aiCheck.isTemplate ? " ⚠️ template terdeteksi" : ""}` });

            // ── Layer 4 Rescue: deep review vs PANRB (hanya jika masih rendah & ada kriteria) ──
            if (aiCheck.score < 40 && kriteria) {
              send("log", { level: "info", message: `ID ${rowId}: Layer 4 rescue — deep review vs PANRB...` });
              deepFileContents = await Promise.all(
                readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType, 15)),
              );
              try {
                deepReview = await deepContentReview(files, deepFileContents, kriteria, rowId, readableFiles);
              } catch (err) {
                if (err instanceof AiCostError) {
                  send("error", { message: `Kredit AI habis: ${err.message}. Silakan top-up akun Anthropic.` });
                  controller.close();
                  return;
                }
                throw err;
              }
              if (deepReview && deepReview.revisedScore > aiCheck.score) {
                send("log", { level: "info", message: `ID ${rowId}: skor direvisi ${aiCheck.score}% → ${deepReview.revisedScore}%` });
                aiCheck.score   = deepReview.revisedScore;
                aiCheck.verdict = deepReview.revisedVerdict || aiCheck.verdict;
              }
            }

            if (aiCheck.score < 40) exhausted = true;
          }

          // ── Layer 4 QC Sampling: Sonnet spot-check (independen dari skor) ──
          if (!deepReview && kriteria && shouldSampleForQC(heuristic, aiCheck, aiCheck.score)) {
            send("log", { level: "info", message: `ID ${rowId}: [QC] Sampling Sonnet...` });
            if (!readableFiles) readableFiles = files.filter((f) => isReadableMime(f.mimeType));
            if (!deepFileContents) {
              deepFileContents = await Promise.all(
                readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType, 15)),
              );
            }
            try {
              const qcReview = await deepContentReview(files, deepFileContents, kriteria, rowId, readableFiles);
              if (qcReview) {
                deepReview = { ...qcReview, _qcSampling: true };
                if (qcReview.inconsistencyFlag) {
                  send("log", { level: "warn", message: `ID ${rowId}: [QC] Inkonsistensi — ${qcReview.auditFinding || qcReview.alasan}` });
                }
                if (Math.abs(qcReview.revisedScore - aiCheck.score) > 15) {
                  send("log", { level: "info", message: `ID ${rowId}: [QC] Skor dikoreksi ${aiCheck.score}% → ${qcReview.revisedScore}%` });
                  aiCheck.score   = qcReview.revisedScore;
                  aiCheck.verdict = qcReview.revisedVerdict || aiCheck.verdict;
                }
              }
            } catch (err) {
              if (err instanceof AiCostError) {
                send("error", { message: `Kredit AI habis: ${err.message}. Silakan top-up akun Anthropic.` });
                controller.close();
                return;
              }
              throw err;
            }
          }
        }

        const verdict = calculateFinalVerdict(existCheck, aiCheck, exhausted);
        send("log", {
          level:   verdict.color === "HIJAU" ? "success" : verdict.color === "KUNING" ? "warn" : "error",
          message: `ID ${rowId}: ${verdict.status} (skor: ${aiCheck.score}%)`,
        });

        const reviuLines = [
          existCheck.detail,
          aiCheck.dokumenAda?.length    > 0 ? `Ada: ${aiCheck.dokumenAda.slice(0, 3).map((s) => s.substring(0, 70)).join(", ")}` : "",
          aiCheck.dokumenKurang?.length > 0 ? `Kurang: ${aiCheck.dokumenKurang.slice(0, 3).map((s) => s.substring(0, 70)).join(", ")}` : "",
          aiCheck.detail,
        ].filter(Boolean);
        if (deepReview) {
          const label = deepReview._qcSampling ? "[QC]" : "[Review PANRB]";
          reviuLines.push(`${label} ${deepReview.review || deepReview.alasan || ""}`);
          if (deepReview.inconsistencyFlag && deepReview.auditFinding) {
            reviuLines.push(`[Temuan] ${deepReview.auditFinding}`);
          }
        }

        const tglCek = new Date().toLocaleString("id-ID");
        const vrData = buildVisaRowData(rowId, bukti, linkDrive, fingerprint, verdict, reviuLines, tglCek, scoringDetailMap, jawabanUnit);

        // ── Tulis ke Visa review ──
        send("log", { level: "info", message: "Menyimpan hasil ke sheet 'Visa review'..." });
        try {
          if (existingEntry) {
            await writeVisaReviewRows(sheets, penilaianId, [{ rowNum: existingEntry.rowNum, rowData: vrData }], []);
          } else {
            await writeVisaReviewRows(sheets, penilaianId, [], [vrData]);
          }
          send("log", { level: "success", message: `ID ${rowId}: hasil tersimpan ke sheet ✓` });
        } catch (e) {
          send("log", { level: "warn", message: `Gagal simpan ke sheet: ${e.message}` });
        }

        // ── Update Ringkasan AI setelah setiap single check ──
        try {
          // Tambahkan/update entry di in-memory visaMap dengan verdict baru
          visaMap[String(rowId)] = {
            ...(existingEntry || {}),
            result: verdict.status,
            rowNum: existingEntry?.rowNum ?? (Object.keys(visaMap).length + 2),
          };
          // Bangun data scoring dari visaMap yang sudah diperbarui
          const resultsForScoring = Object.entries(visaMap)
            .filter(([, e]) => AI_PATTERN.test(e.result))
            .map(([id, e]) => {
              const metrics = buildMetricsForId(id, kriteriaList, jawabanUnitMap);
              return {
              id,
              verdict: {
                color: /^✅/u.test(e.result) ? "HIJAU"
                       : /^⚠️/u.test(e.result) ? "KUNING" : "MERAH",
              },
              jawaban_unit: jawabanUnitMap[id] ?? "",
              ...(metrics && { metrics }),
            };
            });
          const submission = await LkeSubmission.findById(submissionId).select("target total_data checked_count").lean();
          const target = submission?.target || "WBK";
          const nilaiLkeAi = calculateNilaiLkeAi(resultsForScoring, target, scoringDetailMap);
          await writeRingkasanAi(sheets, penilaianId, nilaiLkeAi, target);
          send("log", { level: "success", message: "Ringkasan AI diperbarui ✓" });

          // Update progress + nilai di MongoDB
          const newChecked = resultsForScoring.length;
          const totalData  = submission?.total_data || 0;
          const newPct     = totalData > 0 ? Math.round((newChecked / totalData) * 100) : 0;
          await LkeSubmission.findByIdAndUpdate(submissionId, {
            nilai_lke_ai:     nilaiLkeAi,
            checked_count:    newChecked,
            unchecked_count:  Math.max(0, totalData - newChecked),
            progress_percent: newPct,
            status:           newPct >= 100 ? "Selesai" : "Sedang Dicek",
            last_checked_at:  new Date(),
          });
        } catch (e) {
          send("log", { level: "warn", message: `Gagal update Ringkasan AI: ${e.message}` });
        }

        // ── Done ──
        send("done", {
          result: {
            id:           String(rowId),
            verdict:      verdict.status,
            verdictColor: verdict.color,
            reviu:        reviuLines.join("\n"),
            tglCek,
            status:       "checked",
          },
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
      "Content-Type":    "text/event-stream",
      "Cache-Control":   "no-cache",
      "Connection":      "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
