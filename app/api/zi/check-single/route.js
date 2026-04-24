export const maxDuration = 300;

import { google } from "googleapis";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";

import { COL, STANDAR, KOMPONEN_LABEL, ID_DETAIL_MAP } from "@/lib/zi/constants";
import { getGoogleAuth } from "@/lib/zi/google-auth";
import {
  extractSheetId, extractFolderId, computeFingerprint, detectDataStart,
} from "@/lib/zi/helpers";
import { readSheet } from "@/lib/zi/sheets";
import {
  ensureVisaReviewSheet, readVisaReviewMap, writeVisaReviewRows,
} from "@/lib/zi/visa-review";
import { listFilesRecursive, getFileContent } from "@/lib/zi/drive";
import { checkWithAI, deepContentReview, calculateFinalVerdict } from "@/lib/zi/ai-checker";
import { getAnswerWeight } from "@/lib/zi/scoring";

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

function buildVisaRowData(id, bukti, linkDrive, fingerprint, verdict, reviuLines, tglCek) {
  const detail  = ID_DETAIL_MAP[parseInt(id)];
  const weight  = getAnswerWeight(verdict.color, detail?.answer_type);
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

        if (!submissionId || !rowId || !sheetUrl) {
          throw new Error("submissionId, rowId, dan sheetUrl wajib diisi");
        }

        const penilaianId   = extractSheetId(sheetUrl);
        const penilaianName = sheetName?.trim() || "Jawaban";
        const standarId     = process.env.ZI_STANDARISASI_SHEET_ID;
        const standarName   = process.env.ZI_STANDARISASI_SHEET_NAME || "Standarisasi";

        if (!standarId) throw new Error("ZI_STANDARISASI_SHEET_ID belum dikonfigurasi di .env");

        // ── Init Google ──
        send("log", { level: "info", message: "Menginisialisasi koneksi Google..." });
        const auth   = getGoogleAuth();
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        // ── Baca sheet LKE — cari baris target ──
        send("log", { level: "info", message: `Membaca sheet "${penilaianName}"...` });
        const penilaianRows = await readSheet(auth, penilaianId, penilaianName);
        const dataStart     = detectDataStart(penilaianRows);

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

        if (!linkDrive.includes("drive.google")) {
          throw new Error(`ID ${rowId}: tidak memiliki link Google Drive`);
        }

        // ── Baca standar ──
        send("log", { level: "info", message: "Membaca standar dokumen..." });
        const standarRows         = await readSheet(auth, standarId, standarName);
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

        // ── Baca konten file ──
        let fileContents = [];
        let readableFiles = [];
        if (existCheck.exists) {
          readableFiles = files.filter((f) => isReadableMime(f.mimeType)).slice(0, 5);
          fileContents  = await Promise.all(
            readableFiles.map((f) => getFileContent(auth, f.id, f.mimeType)),
          );
        }

        // ── Analisis AI ──
        send("log", { level: "info", message: `ID ${rowId}: analisis AI...` });
        const aiCheck = await checkWithAI(files, fileContents, standar, rowId, readableFiles);

        // Deep content review jika skor rendah
        let deepReview = null;
        if (aiCheck.score < 60 && kriteria && existCheck.exists) {
          send("log", { level: "info", message: `ID ${rowId}: skor ${aiCheck.score}% rendah, review ulang dengan kriteria PANRB...` });
          const allReadable = files.filter((f) => isReadableMime(f.mimeType));
          let deepReadable = readableFiles;
          let deepContents = fileContents;
          if (readableFiles.length < allReadable.length) {
            deepReadable = allReadable.slice(0, 10);
            deepContents = await Promise.all(
              deepReadable.map((f) => getFileContent(auth, f.id, f.mimeType)),
            );
          }
          deepReview = await deepContentReview(files, deepContents, kriteria, rowId, deepReadable);
          if (deepReview && deepReview.revisedScore > aiCheck.score) {
            send("log", { level: "info", message: `ID ${rowId}: skor direvisi ${aiCheck.score}% → ${deepReview.revisedScore}%` });
            aiCheck.score   = deepReview.revisedScore;
            aiCheck.verdict = deepReview.revisedVerdict || aiCheck.verdict;
          }
        }

        const verdict = calculateFinalVerdict(existCheck, aiCheck);
        send("log", {
          level:   verdict.color === "HIJAU" ? "success" : verdict.color === "KUNING" ? "warn" : "error",
          message: `ID ${rowId}: ${verdict.status} (skor: ${aiCheck.score}%)`,
        });

        const reviuLines = [
          existCheck.detail,
          aiCheck.dokumenAda?.length    > 0 ? `Ada: ${aiCheck.dokumenAda.slice(0, 3).join(", ")}`     : "",
          aiCheck.dokumenKurang?.length > 0 ? `Kurang: ${aiCheck.dokumenKurang.slice(0, 3).join(", ")}` : "",
          aiCheck.detail,
        ].filter(Boolean);
        if (deepReview) {
          reviuLines.push(`[Review PANRB] ${deepReview.review || deepReview.alasan || ""}`);
        }

        const tglCek = new Date().toLocaleString("id-ID");
        const vrData = buildVisaRowData(rowId, bukti, linkDrive, fingerprint, verdict, reviuLines, tglCek);

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

        // ── Update MongoDB stats ──
        try {
          const submission = await LkeSubmission.findById(submissionId).lean();
          if (submission && !existingEntry) {
            // Hanya tambah checked_count jika ini baris baru (belum pernah dicek)
            const newChecked = Math.min(submission.total_data || 0, (submission.checked_count || 0) + 1);
            const newPct     = submission.total_data > 0
              ? Math.round((newChecked / submission.total_data) * 100)
              : 0;
            await LkeSubmission.findByIdAndUpdate(submissionId, {
              checked_count:    newChecked,
              unchecked_count:  submission.total_data - newChecked,
              progress_percent: newPct,
              status:           newPct >= 100 ? "Selesai" : "Sedang Dicek",
              last_checked_at:  new Date(),
            });
          }
        } catch (e) {
          send("log", { level: "warn", message: `Gagal update monitoring: ${e.message}` });
        }

        // ── Done ──
        send("done", {
          result: {
            id:           String(rowId),
            verdict:      verdict.status,
            verdictColor: verdict.color,
            reviu:        reviuLines.join(" | "),
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
