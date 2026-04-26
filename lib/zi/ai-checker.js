import Anthropic from "@anthropic-ai/sdk";

// ── Cost error detection ─────────────────────────────────────────────────────

export class AiCostError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "AiCostError";
  }
}

function isCostError(err) {
  if (!err) return false;
  if (err.status === 402) return true;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("credit") ||
    msg.includes("balance") ||
    msg.includes("billing")
  );
}

// ── Content parts builder (PDF/gambar/teks) ──────────────────────────────────

const MAX_TOTAL_PDF_PAGES = 90;

function buildContentParts(fileContents, contentFiles) {
  const documentBlocks = [];
  const textSnippets = [];
  let totalPdfPages = 0;
  if (!fileContents) return { documentBlocks, textSnippets };

  for (let i = 0; i < fileContents.length; i++) {
    const c = fileContents[i];
    if (!c) continue;
    const name = contentFiles[i]?.path || contentFiles[i]?.name || `file_${i}`;

    if (typeof c === "object" && c.type === "document") {
      const pages = c.pageCount || 1;
      if (totalPdfPages + pages > MAX_TOTAL_PDF_PAGES) continue;
      totalPdfPages += pages;
      const truncInfo = c.totalPages ? ` — hal. 1-${pages} dari ${c.totalPages}` : "";
      documentBlocks.push(
        { type: "text", text: `[Dokumen: ${name}${truncInfo}]` },
        { type: "document", source: { type: "base64", media_type: c.mimeType, data: c.base64 } },
      );
    } else if (typeof c === "object" && c.type === "image") {
      documentBlocks.push(
        { type: "text", text: `[Gambar: ${name}]` },
        { type: "image", source: { type: "base64", media_type: c.mimeType, data: c.base64 } },
      );
    } else if (typeof c === "string") {
      textSnippets.push(`=== ${name} ===\n${c}`);
    }
  }
  return { documentBlocks, textSnippets };
}

// ── Layer 0: Regex Name Matching (tanpa AI) ──────────────────────────────────

const AMBIGUOUS_NAME_RE =
  /^(scan|img_|img\d|image|foto|photo|doc|document|untitled|file|gambar|picture|screenshot|new|copy|temp|tmp|lampiran)\d*/i;
const PURE_NUM_RE = /^\d{6,}[\s_-]?\d{0,6}$/;

function isAmbiguousFileName(name) {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  const base = name.slice(0, name.length - ext.length).trim();
  if (base.length < 4) return true;
  return AMBIGUOUS_NAME_RE.test(base) || PURE_NUM_RE.test(base);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
}

const STOPWORDS = new Set([
  "yang", "dengan", "untuk", "dalam", "pada", "dari", "kepada", "adalah",
  "serta", "atau", "juga", "sudah", "telah", "lebih", "setiap", "semua",
  "bagi", "maka", "seperti", "antara", "sebagai", "sesuai", "tahun",
  "setelah", "bukti", "data", "hasil", "laporan", "dokumen", "dokumn",
  "berisi", "meliputi", "terdiri", "mencakup",
]);

export function checkByName(files, standarText) {
  if (!files || files.length === 0) {
    return {
      skip: true,
      result: {
        score: 0,
        verdict: "Tidak Ada File",
        dokumenAda: [],
        dokumenKurang: [],
        detail: "Folder kosong, tidak ada dokumen",
        basedOn: "nama_file",
      },
    };
  }

  if (!standarText || standarText.trim().length < 10) return { skip: false };

  const segments = standarText
    .split(/[,;]|\n|\d+\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 200);

  if (segments.length < 2) return { skip: false };

  const docKeywords = segments
    .map((seg) => tokenize(seg).filter((w) => !STOPWORDS.has(w)))
    .filter((kws) => kws.length > 0);

  if (docKeywords.length === 0) return { skip: false };

  const hasNonAmbiguous = files.some((f) => !isAmbiguousFileName(f.name));
  if (!hasNonAmbiguous) return { skip: false };

  const allPathTokens = files.map((f) => tokenize(f.path || f.name));

  let matched = 0;
  const dokumenAda = [];
  const dokumenKurang = [];

  for (let i = 0; i < docKeywords.length; i++) {
    const kws = docKeywords[i];
    const isMatched = allPathTokens.some((pathTokens) =>
      kws.some((kw) => pathTokens.includes(kw)),
    );
    const label = segments[i].substring(0, 50);
    if (isMatched) { matched++; dokumenAda.push(label); }
    else { dokumenKurang.push(label); }
  }

  const coverage = matched / docKeywords.length;

  if (coverage >= 0.85) {
    const pct = Math.round(coverage * 100);
    const confLabel = pct === 100 ? "Tinggi" : pct >= 92 ? "Cukup Tinggi" : "Cukup";
    return {
      skip: true,
      result: {
        score: 82,
        verdict: "Sesuai",
        dokumenAda,
        dokumenKurang,
        detail: `Keyakinan: ${confLabel} (${pct}%)`,
        basedOn: "nama_file",
      },
    };
  }

  return { skip: false };
}

// ── Layer 1: AI nama file vs standar (Haiku) ─────────────────────────────────

const NAMES_STANDAR_SYSTEM =
  `Kamu adalah validator dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

INSTRUKSI:
- Nilai kesesuaian HANYA dari nama file dan path subfolder — JANGAN menunggu isi dokumen
- Daftar path mencakup seluruh subfolder (ditampilkan lengkap)
- Jika nama file mengandung kata kunci relevan dari standar, anggap dokumen ada
- Berikan skor realistis: jika file relevan ada, minimal 60

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","dokumenAda":[],"dokumenKurang":[],"catatan":"<1 kalimat>"}`;

export async function checkWithAINames(files, standarText, id) {
  if (!files || files.length === 0) {
    return {
      score: 0, verdict: "Tidak Ada File",
      dokumenAda: [], dokumenKurang: [],
      detail: "Tidak ada file di folder Drive", basedOn: "none",
    };
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fileList = files.map((f) => `- ${f.path || f.name}`).join("\n");
  const userText =
    `STANDAR DOKUMEN untuk ID ${id}:\n${standarText}\n\n` +
    `DAFTAR FILE (nama dan path folder, termasuk subfolder):\n${fileList}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: [{ type: "text", text: NAMES_STANDAR_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
    });
    const text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);
    return {
      score: result.score || 0,
      verdict: result.verdict || "Tidak diketahui",
      dokumenAda: result.dokumenAda || [],
      dokumenKurang: result.dokumenKurang || [],
      detail: result.catatan || "",
      basedOn: "nama_file",
    };
  } catch (err) {
    if (isCostError(err)) throw new AiCostError(err.message);
    const detail = err.status === 429 ? "Rate limit — Layer 1 dilewati" : `Gagal: ${err.message}`;
    return { score: 0, verdict: "Error AI", dokumenAda: [], dokumenKurang: [], detail, basedOn: "error" };
  }
}

// ── Layer 2: AI nama file vs PANRB (Haiku) ───────────────────────────────────

export async function checkWithAINamesPanrb(files, kriteria, id) {
  if (!files || files.length === 0) {
    return {
      score: 0, verdict: "Tidak Ada File",
      dokumenAda: [], dokumenKurang: [],
      detail: "Tidak ada file di folder Drive", basedOn: "none",
    };
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fileList = files.map((f) => `- ${f.path || f.name}`).join("\n");

  const reviewerSystem =
    `Kamu adalah validator dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

KRITERIA PENILAIAN PANRB:
${kriteria}

INSTRUKSI:
- Nilai kesesuaian HANYA dari nama file dan path subfolder — JANGAN menunggu isi dokumen
- Kriteria PANRB lebih fleksibel dari standarisasi — nilai apakah nama file mencerminkan upaya memenuhi kriteria
- Berikan skor yang mencerminkan usaha nyata dari nama dokumen

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","dokumenAda":[],"dokumenKurang":[],"catatan":"<1 kalimat>"}`;

  const userText =
    `ID ${id} — nilai dari nama file berdasarkan kriteria PANRB di atas.\n\n` +
    `DAFTAR FILE (nama dan path folder, termasuk subfolder):\n${fileList}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: [{ type: "text", text: reviewerSystem, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
    });
    const text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);
    return {
      score: result.score || 0,
      verdict: result.verdict || "Tidak diketahui",
      dokumenAda: result.dokumenAda || [],
      dokumenKurang: result.dokumenKurang || [],
      detail: result.catatan || "",
      basedOn: "nama_file_panrb",
    };
  } catch (err) {
    if (isCostError(err)) throw new AiCostError(err.message);
    const detail = err.status === 429 ? "Rate limit — Layer 2 dilewati" : `Gagal: ${err.message}`;
    return { score: 0, verdict: "Error AI", dokumenAda: [], dokumenKurang: [], detail, basedOn: "error" };
  }
}

// ── Layer 3a: Konten vs standar (Haiku + multimodal) ─────────────────────────

const CHECKER_SYSTEM =
  `Kamu adalah validator dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

INSTRUKSI:
- Daftar file sudah termasuk semua file di dalam subfolder (path lengkap ditampilkan)
- Nilai kesesuaian berdasarkan nama file, lokasi folder, dan isi dokumen (jika ada)
- File PDF dan gambar yang dilampirkan HARUS dibaca isinya secara detail
- Nama file relevan sudah merupakan bukti keberadaan dokumen
- Jika nama file mengandung kata kunci dari standar, anggap dokumen ADA
- Perhatikan juga isi/konten dokumen untuk menilai kesesuaian dengan standar
- Berikan skor realistis: jika file relevan ada, minimal 60

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","dokumenAda":[],"dokumenKurang":[],"catatan":"<1 kalimat>","basedOn":"<nama_file|konten|keduanya>"}`;

export async function checkWithAIContent(files, fileContents, standarText, id, readableFiles) {
  if (!files || files.length === 0) {
    return {
      score: 0, verdict: "Tidak Ada File",
      dokumenAda: [], dokumenKurang: [],
      detail: "Tidak ada file di folder Drive", basedOn: "none",
    };
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const contentFiles = readableFiles || files;
  const { documentBlocks, textSnippets } = buildContentParts(fileContents, contentFiles);

  const fileList = files.map((f) => `- ${f.path || f.name} (${f.mimeType || "unknown"})`).join("\n");

  let contentSection = "";
  if (textSnippets.length > 0) {
    contentSection += `\nSAMPEL ISI FILE (teks):\n${textSnippets.join("\n\n").substring(0, 6000)}`;
  }
  if (documentBlocks.length > 0) {
    const docCount = documentBlocks.filter((b) => b.type === "document" || b.type === "image").length;
    contentSection += `\n(${docCount} file PDF/gambar dilampirkan di atas — baca isinya untuk penilaian)`;
  }
  if (!contentSection) {
    contentSection = "\n(Konten tidak dapat dibaca — nilai dari nama file saja.)";
  }

  const userText =
    `STANDAR DOKUMEN untuk ID ${id}:\n${standarText}\n\n` +
    `DAFTAR FILE di folder Google Drive (termasuk subfolder, path ditampilkan):\n${fileList}` +
    contentSection;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: [{ type: "text", text: CHECKER_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [...documentBlocks, { type: "text", text: userText }] }],
    });
    const text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);
    return {
      score: result.score || 0,
      verdict: result.verdict || "Tidak diketahui",
      dokumenAda: result.dokumenAda || [],
      dokumenKurang: result.dokumenKurang || [],
      detail: result.catatan || "",
      basedOn: result.basedOn || "konten",
    };
  } catch (err) {
    if (isCostError(err)) throw new AiCostError(err.message);
    const detail = err.status === 429 ? "Rate limit — Layer 3a dilewati" : `Gagal: ${err.message}`;
    return { score: 0, verdict: "Error AI", dokumenAda: [], dokumenKurang: [], detail, basedOn: "error" };
  }
}

// ── Layer 3b: Konten vs PANRB (Sonnet + prompt caching) ──────────────────────

export async function deepContentReview(files, fileContents, kriteria, id, readableFiles) {
  if (!fileContents || !fileContents.some(Boolean) || !kriteria) return null;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const contentFiles = readableFiles || files;
  const { documentBlocks, textSnippets } = buildContentParts(fileContents, contentFiles);

  const fileList = files.map((f) => `- ${f.path || f.name} (${f.mimeType || "unknown"})`).join("\n");

  let contentSection = "";
  if (textSnippets.length > 0) {
    contentSection = `\nISI DOKUMEN (teks):\n${textSnippets.join("\n\n").substring(0, 8000)}`;
  }
  if (documentBlocks.length > 0) {
    const docCount = documentBlocks.filter((b) => b.type === "document" || b.type === "image").length;
    contentSection += `\n(${docCount} file PDF/gambar dilampirkan di atas — baca isinya secara detail)`;
  }

  const reviewerSystem =
    `Kamu adalah reviewer independen dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

Skor awal dari pengecekan standarisasi RENDAH. Tugasmu adalah menilai ULANG secara independen berdasarkan KRITERIA PANRB dan ISI DOKUMEN yang sebenarnya.

KRITERIA PENILAIAN PANRB:
${kriteria}

INSTRUKSI:
- Abaikan standarisasi data dukung sebelumnya — nilai MURNI dari konten dokumen
- BACA ISI file PDF dan gambar yang dilampirkan secara detail
- Periksa apakah isi dokumen memenuhi kriteria PANRB di atas
- Jika konten dokumen sebenarnya relevan dan memenuhi kriteria, naikkan skor
- Jika memang tidak memenuhi, konfirmasi skor rendah dan jelaskan alasannya

Jawab HANYA format JSON (tanpa markdown):
{"revisedScore":<0-100>,"revisedVerdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","review":"<2-3 kalimat analisis independen berdasarkan konten dan kriteria PANRB>","kontenSesuai":<true/false>,"alasan":"<1 kalimat ringkas>"}`;

  const userText =
    `ID ${id} — review berdasarkan kriteria di atas.\n\nDAFTAR FILE:\n${fileList}` + contentSection;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: [{ type: "text", text: reviewerSystem, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [...documentBlocks, { type: "text", text: userText }] }],
    });
    const text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (err) {
    if (isCostError(err)) throw new AiCostError(err.message);
    return null;
  }
}

// ── Final Verdict ─────────────────────────────────────────────────────────────

export function calculateFinalVerdict(existCheck, aiCheck, exhausted = false) {
  if (!existCheck.exists)
    return { status: "❌ Tidak Ada File", score: 0, color: "MERAH" };
  const score = aiCheck?.score || 0;
  if (score >= 70)
    return { status: "✅ Sesuai", score, color: "HIJAU" };
  if (score >= 40)
    return { status: "⚠️ Sebagian Sesuai", score, color: "KUNING" };
  if (exhausted)
    return { status: "❗ Perlu Cek Manual", score, color: "MERAH" };
  return { status: "❌ Tidak Sesuai", score, color: "MERAH" };
}
