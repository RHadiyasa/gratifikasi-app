import LkeSubmission from "@/modules/models/LkeSubmission";
import LkeJawaban from "@/modules/models/LkeJawaban";
import LkeKriteria from "@/modules/models/LkeKriteria";
import { getGoogleAuth } from "@/lib/zi/google-auth";
import { extractFolderId, computeFingerprint, delay, countStats } from "@/lib/zi/helpers.js";
import { listFilesRecursive, getFileContent } from "@/lib/zi/drive";
import {
  AiCostError, checkByName, auditFolderVsNarasi,
  checkWithAIContent, deepContentReview,
  shouldSampleForQC, calculateFinalVerdict,
} from "@/lib/zi/ai-checker";
import { buildScoringDetailMapWithConfig, calculateNilaiLkeAi } from "@/lib/zi/scoring";
import { getActiveScoringConfig } from "@/lib/zi/scoring-config";

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

function isDetailKriteria(kriteria) {
  return (
    kriteria?.answer_type === "jumlah" &&
    kriteria?.parent_question_id != null
  );
}

function buildSubItemContext(subItems = []) {
  const lines = subItems
    .map(({ kriteria, jawaban }, idx) => {
      const label = kriteria?.pertanyaan || `Detail ${idx + 1}`;
      const value = jawaban?.jawaban_unit || "-";
      const note = jawaban?.narasi ? `; keterangan: ${jawaban.narasi}` : "";
      return `${String.fromCharCode(65 + idx)}. ${label}: ${value}${note}`;
    })
    .filter(Boolean);

  return lines.length
    ? `Detail perhitungan yang menjadi bagian jawaban parent:\n${lines.join("\n")}`
    : "";
}

/**
 * Process a single LKE jawaban through the full AI pipeline.
 * App-mode equivalent of processItem() in check/route.js.
 * Returns { id, verdict, aiCheck, aiResultData } or null if skipped.
 */
export async function processItemAppMode({ jawaban, kriteria, auth, send, tglCek, subItems = [] }) {
  const id           = String(jawaban.question_id);
  const subItemContext = buildSubItemContext(subItems);
  const parentValue = jawaban.jawaban_unit
    ? `Jawaban/nilai unit: ${jawaban.jawaban_unit}`
    : "";
  const narasi       = [jawaban.narasi || "", parentValue, subItemContext].filter(Boolean).join("\n\n");
  const bukti        = jawaban.bukti      || "";
  const linkDrive    = jawaban.link_drive || "";
  const standar      = kriteria?.standar_dokumen || "";
  const kriteriaText = kriteria?.kriteria_panrb  || "";

  if (!standar && !kriteriaText) {
    send("log", { level: "warn", message: `ID ${id}: tidak ada standar/kriteria, dilewati` });
    return null;
  }

  if (!linkDrive.includes("drive.google")) {
    send("log", { level: "error", message: `ID ${id}: tidak memiliki link Google Drive` });
    const verdict = { status: "❌ URL Tidak Valid", score: 0, color: "MERAH" };
    return {
      id, verdict,
      aiCheck:      { score: 0, verdict: "N/A", dokumenAda: [], dokumenKurang: [], detail: "URL Drive tidak valid" },
      aiResultData: { score: 0, verdict: "N/A", color: "MERAH", status: verdict.status, reviu: "URL Google Drive tidak valid", fingerprint: null, checked_at: new Date(), supervisi: "Sudah Dicek AI", dokumen_ada: [], dokumen_kurang: [] },
    };
  }

  const folderId = extractFolderId(linkDrive);
  if (!folderId) {
    send("log", { level: "error", message: `ID ${id}: URL Drive tidak valid` });
    const verdict = { status: "❌ URL Tidak Valid", score: 0, color: "MERAH" };
    return {
      id, verdict,
      aiCheck:      { score: 0, verdict: "N/A", dokumenAda: [], dokumenKurang: [], detail: "URL tidak valid" },
      aiResultData: { score: 0, verdict: "N/A", color: "MERAH", status: verdict.status, reviu: "URL Google Drive tidak dapat di-parse", fingerprint: null, checked_at: new Date(), supervisi: "Sudah Dicek AI", dokumen_ada: [], dokumen_kurang: [] },
    };
  }

  let files = [];
  try {
    files = await listFilesRecursive(auth, folderId);
    send("log", { level: "info", message: `ID ${id}: ${files.length} file ditemukan (termasuk subfolder)` });
  } catch (err) {
    send("log", { level: "error", message: `ID ${id}: gagal akses Drive — ${err.message}` });
  }

  const fingerprint = computeFingerprint(files);
  const existCheck  = {
    exists:    files.length > 0,
    fileCount: files.length,
    detail:    files.length > 0 ? `${files.length} file ditemukan` : "Folder kosong",
  };

  // ── Layer 0: Smart Heuristic ──
  const nameCheck = checkByName(files, standar);
  const heuristic = {
    heuristicScore: nameCheck.heuristicScore || 0,
    ambiguity:      nameCheck.ambiguity      || false,
    confidence:     nameCheck.confidence     || "low",
  };
  let aiCheck;
  let deepReview       = null;
  let exhausted        = false;
  let readableFiles    = null;
  let deepFileContents = null;

  if (nameCheck.skip) {
    send("log", { level: "info", message: `ID ${id}: Layer 0 — ${nameCheck.result.detail}` });
    aiCheck = nameCheck.result;
  } else {
    // ── Layer 1 (Auditor): Folder + Narasi vs PANRB ──
    send("log", { level: "info", message: `ID ${id}: Auditor — analisis folder, narasi, dan kriteria PANRB...` });
    aiCheck = await auditFolderVsNarasi(files, narasi, kriteriaText, standar, id);
    const temuanLog = aiCheck.temuanKritis ? ` ⚠️ ${aiCheck.temuanKritis}` : "";
    send("log", { level: "info", message: `ID ${id}: Auditor — skor ${aiCheck.score}% (${aiCheck.verdict})${temuanLog}` });

    if (aiCheck.score >= 70) {
      send("log", { level: "success", message: `ID ${id}: Auditor menyimpulkan Sesuai — pengecekan konten dilewati` });
    } else if (aiCheck.score >= 40) {
      send("log", { level: "info", message: `ID ${id}: Sebagian sesuai — lanjut ke pengecekan isi dokumen...` });

      readableFiles = files.filter((f) => isReadableMime(f.mimeType));
      const fileContents = await Promise.all(
        readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType, 3)),
      );
      const contentCheck = await checkWithAIContent(files, fileContents, standar, id, readableFiles);
      if (contentCheck.score > aiCheck.score) aiCheck = contentCheck;
      send("log", { level: "info", message: `ID ${id}: Layer 3 — skor ${aiCheck.score}%${contentCheck.isTemplate ? " ⚠️ template terdeteksi" : ""}` });

      if (aiCheck.score < 40 && kriteriaText) {
        send("log", { level: "info", message: `ID ${id}: Layer 4 rescue — deep review vs PANRB...` });
        deepFileContents = await Promise.all(
          readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType, 15)),
        );
        deepReview = await deepContentReview(files, deepFileContents, kriteriaText, id, readableFiles);
        if (deepReview && deepReview.revisedScore > aiCheck.score) {
          send("log", { level: "info", message: `ID ${id}: skor direvisi ${aiCheck.score}% → ${deepReview.revisedScore}%` });
          aiCheck.score   = deepReview.revisedScore;
          aiCheck.verdict = deepReview.revisedVerdict || aiCheck.verdict;
        }
      }
      if (aiCheck.score < 40) exhausted = true;
    } else {
      send("log", { level: "warn", message: `ID ${id}: Auditor menyimpulkan Tidak Sesuai (skor ${aiCheck.score}%) — pengecekan konten tidak diperlukan` });
    }

    // ── QC Sampling ──
    if (!deepReview && kriteriaText && shouldSampleForQC(heuristic, aiCheck, aiCheck.score)) {
      send("log", { level: "info", message: `ID ${id}: [QC] Sampling Sonnet...` });
      if (!readableFiles) readableFiles = files.filter((f) => isReadableMime(f.mimeType));
      if (!deepFileContents) {
        deepFileContents = await Promise.all(
          readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType, 15)),
        );
      }
      const qcReview = await deepContentReview(files, deepFileContents, kriteriaText, id, readableFiles);
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
    level:   verdict.color === "HIJAU" ? "success" : verdict.color === "KUNING" ? "warn" : "error",
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

  const aiResultData = {
    score:          aiCheck.score  ?? 0,
    verdict:        aiCheck.verdict || verdict.status,
    color:          verdict.color,
    status:         verdict.status,
    reviu:          reviuLines.join("\n"),
    pendapat:       aiCheck.pendapat      || aiCheck.detail || null,
    temuan_kritis:  aiCheck.temuanKritis  || null,
    dokumen_ada:    aiCheck.dokumenAda    || [],
    dokumen_kurang: aiCheck.dokumenKurang || [],
    fingerprint,
    checked_at:     new Date(),
    based_on:       aiCheck.basedOn || null,
    supervisi:      "Sudah Dicek AI",
  };

  return { id, verdict, aiCheck, aiResultData };
}

/**
 * Handle bulk AI check for a source='app' submission.
 * Called from check/route.js when submission.source === 'app'.
 * SSE event format is identical to sheet mode.
 */
export async function handleAppModeCheck({ submissionId, submission, dataLimit, send }) {
  const auth = getGoogleAuth();
  await auth.getClient();

  const kriteriaList = await LkeKriteria.find({ aktif: true }).lean();
  const kriteriaMap  = Object.fromEntries(kriteriaList.map((k) => [k.question_id, k]));
  const primaryKriteria = kriteriaList.filter((k) => !isDetailKriteria(k));
  const primaryIds = new Set(primaryKriteria.map((k) => k.question_id));
  const scoringConfig = await getActiveScoringConfig();
  const scoringDetailMap = buildScoringDetailMapWithConfig(kriteriaList, scoringConfig);
  const totalData = primaryKriteria.length;

  const allJawaban = await LkeJawaban.find({ submission_id: submissionId }).lean();
  const jawabanMap = new Map(allJawaban.map((j) => [j.question_id, j]));
  const primaryJawaban = allJawaban.filter((j) => primaryIds.has(j.question_id));
  const validJawaban = primaryJawaban.filter((j) => j.link_drive?.includes("drive.google"));
  const childrenByParent = new Map();
  for (const k of kriteriaList) {
    if (!isDetailKriteria(k)) continue;
    const childJawaban = jawabanMap.get(k.question_id) || null;
    if (!childrenByParent.has(k.parent_question_id)) childrenByParent.set(k.parent_question_id, []);
    childrenByParent.get(k.parent_question_id).push({ kriteria: k, jawaban: childJawaban });
  }
  for (const items of childrenByParent.values()) {
    items.sort((a, b) => (a.kriteria?.urutan ?? 0) - (b.kriteria?.urutan ?? 0));
  }

  const toProcess = validJawaban.filter((j) => {
    if (!j.ai_result?.color) return true;
    if (j.ai_result?.supervisi === "Revisi") return true;
    return false;
  });

  const rowsToProcess = dataLimit > 0 ? toProcess.slice(0, dataLimit) : toProcess;
  const total = rowsToProcess.length;

  send("log", { level: "info", message: `App mode: ${totalData} indikator utama, ${validJawaban.length} punya link Drive, ${total} akan dicek` });
  send("total", { total, revisiCount: 0, linkChangedCount: 0, fingerprintChangedCount: 0 });

  await LkeSubmission.findByIdAndUpdate(submissionId, {
    total_data:       totalData,
    status:           "Sedang Dicek",
    last_checked_at:  new Date(),
  });

  const results         = [];
  const BATCH_SIZE      = 5;
  let savedCount        = 0;
  let pendingUpdates    = [];
  const tglCek          = new Date().toLocaleString("id-ID");

  async function flushBatch() {
    if (pendingUpdates.length === 0) return;
    await LkeJawaban.bulkWrite(
      pendingUpdates.map(({ jawaban_id, aiResultData }) => ({
        updateOne: {
          filter: { _id: jawaban_id },
          update: { $set: { ai_result: aiResultData } },
        },
      }))
    );
    savedCount += pendingUpdates.length;
    pendingUpdates = [];
    send("batch_saved", { savedCount });
  }

  for (let idx = 0; idx < rowsToProcess.length; idx++) {
    const jawaban  = rowsToProcess[idx];
    const kriteria = kriteriaMap[jawaban.question_id];
    const id       = String(jawaban.question_id);
    const bukti    = jawaban.bukti || "";

    send("progress", {
      current: idx + 1, total, id,
      message: `ID ${id} — ${bukti.substring(0, 50)}${bukti.length > 50 ? "…" : ""}`,
    });

    let processed;
    try {
      processed = await processItemAppMode({
        jawaban,
        kriteria,
        auth,
        send,
        tglCek,
        subItems: childrenByParent.get(jawaban.question_id) || [],
      });
    } catch (err) {
      if (err instanceof AiCostError) {
        send("log", { level: "error", message: `Kredit AI habis: ${err.message}` });
        send("error", { message: `Kredit habis. Proses dihentikan pada ID ${id}.` });
        await flushBatch();
        break;
      }
      throw err;
    }
    if (!processed) continue;

    results.push(processed);
    if (processed.aiResultData) {
      pendingUpdates.push({ jawaban_id: jawaban._id, aiResultData: processed.aiResultData });
    }

    if (pendingUpdates.length >= BATCH_SIZE) {
      send("log", { level: "info", message: `Menyimpan batch ke database... (${savedCount + pendingUpdates.length} tersimpan)` });
      await flushBatch();
    }

    await delay(600);
  }

  await flushBatch();

  // Hitung nilai LKE dari semua jawaban yang sudah dicek
  const allChecked = await LkeJawaban.find({
    submission_id:    submissionId,
    question_id:      { $in: Array.from(primaryIds) },
    "ai_result.color": { $exists: true, $ne: null },
  }).lean();

  const resultsForScoring = allChecked.map((j) => {
    const children = childrenByParent.get(j.question_id) || [];
    const metrics = {};
    for (const { kriteria: ck, jawaban: cj } of children) {
      if (
        cj?.jawaban_unit === undefined ||
        cj?.jawaban_unit === null ||
        String(cj.jawaban_unit).trim() === ""
      ) continue;
      const val = Number(cj.jawaban_unit);
      if (!isNaN(val)) {
        metrics[`qid_${ck.question_id}`] = val;
        const key = String(ck.sub_komponen || "").trim();
        if (key) metrics[key] = val;
      }
    }
    return {
      id:           String(j.question_id),
      verdict:      { color: j.ai_result.color },
      jawaban_unit: j.jawaban_unit,
      ...(Object.keys(metrics).length > 0 && { metrics }),
    };
  });

  const target     = submission?.target || "WBK";
  const nilaiLkeAi = calculateNilaiLkeAi(resultsForScoring, target, scoringDetailMap);

  const checkedCount = allChecked.length;
  const progressPct  = totalData > 0 ? Math.round((checkedCount / totalData) * 100) : 0;

  await LkeSubmission.findByIdAndUpdate(submissionId, {
    nilai_lke_ai:     nilaiLkeAi,
    total_data:       totalData,
    checked_count:    checkedCount,
    unchecked_count:  Math.max(0, totalData - checkedCount),
    progress_percent: progressPct,
    status:           progressPct >= 100 ? "Selesai" : "Sedang Dicek",
    last_checked_at:  new Date(),
  });

  send("log", { level: "success", message: `Nilai LKE diperbarui: ${nilaiLkeAi.nilai_akhir ?? "—"} (${target})` });

  const stats = countStats(results);
  send("done", { summary: { total: results.length, ...stats } });
}

/**
 * Handle single-row AI check for source='app' submission.
 * Called from check-single/route.js when submission.source === 'app'.
 */
export async function handleSingleAppModeCheck({ submissionId, questionId, send }) {
  const auth = getGoogleAuth();
  await auth.getClient();

  const numericQuestionId = Number(questionId);
  const [jawaban, kriteria, submission, kriteriaList] = await Promise.all([
    LkeJawaban.findOne({ submission_id: submissionId, question_id: numericQuestionId }).lean(),
    LkeKriteria.findOne({ question_id: numericQuestionId, aktif: true }).lean(),
    LkeSubmission.findById(submissionId).select("target total_data").lean(),
    LkeKriteria.find({ aktif: true }).lean(),
  ]);

  if (!jawaban) throw new Error(`Jawaban untuk ID ${questionId} tidak ditemukan. Isi dahulu di halaman Input.`);
  if (!kriteria) throw new Error(`Kriteria ID ${questionId} tidak ditemukan atau tidak aktif.`);
  if (isDetailKriteria(kriteria)) {
    throw new Error(`ID ${questionId} adalah detil indikator. Pemeriksaan dilakukan melalui parent ID ${kriteria.parent_question_id}.`);
  }
  if (!jawaban.link_drive?.includes("drive.google")) throw new Error(`ID ${questionId}: tidak memiliki link Google Drive`);

  const primaryKriteria = kriteriaList.filter((k) => !isDetailKriteria(k));
  const primaryIds = new Set(primaryKriteria.map((k) => k.question_id));
  const scoringConfig = await getActiveScoringConfig();
  const scoringDetailMap = buildScoringDetailMapWithConfig(kriteriaList, scoringConfig);
  const childCriteria = kriteriaList
    .filter((k) => isDetailKriteria(k) && k.parent_question_id === numericQuestionId)
    .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  const childAnswers = childCriteria.length
    ? await LkeJawaban.find({
        submission_id: submissionId,
        question_id: { $in: childCriteria.map((k) => k.question_id) },
      }).lean()
    : [];
  const childAnswerMap = new Map(childAnswers.map((j) => [j.question_id, j]));
  const subItems = childCriteria.map((child) => ({
    kriteria: child,
    jawaban: childAnswerMap.get(child.question_id) || null,
  }));

  const tglCek   = new Date().toLocaleString("id-ID");
  const processed = await processItemAppMode({ jawaban, kriteria, auth, send, tglCek, subItems });
  if (!processed) throw new Error(`ID ${questionId}: tidak dapat diproses`);

  // Simpan hasil ke LkeJawaban
  await LkeJawaban.findOneAndUpdate(
    { submission_id: submissionId, question_id: numericQuestionId },
    { $set: { ai_result: processed.aiResultData } },
  );

  // Update nilai LKE
  const allChecked = await LkeJawaban.find({
    submission_id:    submissionId,
    question_id:      { $in: Array.from(primaryIds) },
    "ai_result.color": { $exists: true, $ne: null },
  }).lean();

  const target     = submission?.target || "WBK";
  const nilaiLkeAi = calculateNilaiLkeAi(
    allChecked.map((j) => {
      const children = childrenByParent.get(j.question_id) || [];
      const metrics = {};
      for (const { kriteria: ck, jawaban: cj } of children) {
        if (
          cj?.jawaban_unit === undefined ||
          cj?.jawaban_unit === null ||
          String(cj.jawaban_unit).trim() === ""
        ) continue;
        const val = Number(cj.jawaban_unit);
        if (isNaN(val)) continue;
        metrics[`qid_${ck.question_id}`] = val;
        const key = String(ck.sub_komponen || "").trim();
        if (key) metrics[key] = val;
      }

      return {
        id: String(j.question_id),
        verdict: { color: j.ai_result.color },
        jawaban_unit: j.jawaban_unit,
        ...(Object.keys(metrics).length > 0 && { metrics }),
      };
    }),
    target,
    scoringDetailMap,
  );

  const totalData    = primaryKriteria.length || submission?.total_data || allChecked.length;
  const checkedCount = allChecked.length;
  const progressPercent = totalData > 0 ? Math.round((checkedCount / totalData) * 100) : 0;
  await LkeSubmission.findByIdAndUpdate(submissionId, {
    nilai_lke_ai:     nilaiLkeAi,
    total_data:       totalData,
    checked_count:    checkedCount,
    unchecked_count:  Math.max(0, totalData - checkedCount),
    progress_percent: progressPercent,
    status:           progressPercent >= 100 ? "Selesai" : "Sedang Dicek",
    last_checked_at:  new Date(),
  });

  send("log", { level: "success", message: `Ringkasan nilai diperbarui ✓` });

  const { verdict, aiCheck } = processed;
  const reviu = processed.aiResultData?.reviu || "";
  send("done", {
    result: {
      id:           String(questionId),
      verdict:      verdict.status,
      verdictColor: verdict.color,
      reviu,
      tglCek,
      status:       "checked",
    },
  });
}
