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

// ── Layer 0: Smart Heuristic ─────────────────────────────────────────────────

// Morphological normalization: strip common Indonesian suffixes
const MORPHO_SUFFIXES = ["kan", "an", "nya", "lah", "kah", "i"];

function normalizeMorphology(word) {
  for (const suffix of MORPHO_SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

// Synonym clusters for common ZI document types
const SYNONYM_CLUSTERS = [
  { cluster: "rapat", keywords: ["rapat", "meeting", "koordinasi", "notulen", "notulensi", "undangan", "hadir", "absensi"] },
  { cluster: "pakta_integritas", keywords: ["pakta", "integritas", "pernyataan", "komitmen"] },
  { cluster: "laporan", keywords: ["laporan", "report", "rekap", "rekapitulasi", "rangkuman", "ringkasan"] },
  { cluster: "sop", keywords: ["sop", "prosedur", "petunjuk", "manual", "pedoman", "tata", "cara"] },
  { cluster: "surat_keputusan", keywords: ["surat", "keputusan", "disposisi", "memo", "nota", "perintah"] },
  { cluster: "survey", keywords: ["survey", "survei", "kuesioner", "angket", "indeks", "persepsi"] },
  { cluster: "evaluasi", keywords: ["evaluasi", "penilaian", "audit", "review", "pemeriksaan", "monev"] },
  { cluster: "pelatihan", keywords: ["pelatihan", "training", "sosialisasi", "bimtek", "diklat", "workshop"] },
  { cluster: "pengaduan", keywords: ["pengaduan", "komplain", "layanan", "whistleblowing", "wbs"] },
  { cluster: "gratifikasi", keywords: ["gratifikasi", "suap", "korupsi", "lcpk"] },
];

const SYNONYM_MAP = new Map();
for (const { cluster, keywords } of SYNONYM_CLUSTERS) {
  for (const kw of keywords) SYNONYM_MAP.set(kw, cluster);
}

function findCluster(token) {
  const normalized = normalizeMorphology(token);
  return SYNONYM_MAP.get(token) || SYNONYM_MAP.get(normalized) || null;
}

const AMBIGUOUS_NAME_RE =
  /^(scan|img_|img\d|image|foto|photo|doc|document|untitled|file|gambar|picture|screenshot|new|copy|temp|tmp|lampiran|whatsapp|wa|draft|revisi)\d*/i;
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

// Weighted match: exact=1.0, normalized/morpho=0.85, synonym cluster=0.7, partial=0.4
function weightedMatch(docTokens, allPathTokens) {
  if (docTokens.length === 0) return 0;
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const kw of docTokens) {
    const kwNorm = normalizeMorphology(kw);
    const kwCluster = findCluster(kw);
    totalWeight += 1.0;

    let bestScore = 0;
    outer: for (const pathTokens of allPathTokens) {
      for (const pt of pathTokens) {
        const ptNorm = normalizeMorphology(pt);
        const ptCluster = findCluster(pt);

        if (pt === kw) { bestScore = 1.0; break outer; }
        if (ptNorm === kwNorm) { bestScore = Math.max(bestScore, 0.85); }
        else if (kwCluster && ptCluster && kwCluster === ptCluster) { bestScore = Math.max(bestScore, 0.7); }
        else if (pt.includes(kw) || kw.includes(pt) || ptNorm.includes(kwNorm) || kwNorm.includes(ptNorm)) {
          bestScore = Math.max(bestScore, 0.4);
        }
      }
    }
    matchedWeight += bestScore;
  }

  return totalWeight > 0 ? matchedWeight / totalWeight : 0;
}

// Penalty: generic/ambiguous files reduce the heuristic score (max -20 pts)
function computePenalty(files) {
  if (files.length === 0) return 0;
  const genericCount = files.filter((f) => isAmbiguousFileName(f.name)).length;
  return (genericCount / files.length) * 20;
}

/**
 * Layer 0 — Smart Heuristic.
 * Returns enriched output with heuristicScore, ambiguity, confidence for routing.
 * High confidence (≥85, not ambiguous) skips AI layers entirely.
 */
export function checkByName(files, standarText) {
  if (!files || files.length === 0) {
    return {
      skip: true,
      heuristicScore: 0,
      ambiguity: false,
      confidence: "low",
      matchedClusters: [],
      result: {
        score: 0,
        verdict: "Tidak Ada File",
        dokumenAda: [],
        dokumenKurang: [],
        detail: "Folder kosong, tidak ada dokumen",
        basedOn: "nama_file",
        confidence: "low",
      },
    };
  }

  if (!standarText || standarText.trim().length < 10) {
    return { skip: false, heuristicScore: 0, ambiguity: false, confidence: "low", matchedClusters: [] };
  }

  const segments = standarText
    .split(/[,;]|\n|\d+\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 200);

  if (segments.length < 2) {
    return { skip: false, heuristicScore: 0, ambiguity: false, confidence: "low", matchedClusters: [] };
  }

  const docKeywords = segments
    .map((seg) => tokenize(seg).filter((w) => !STOPWORDS.has(w)))
    .filter((kws) => kws.length > 0);

  if (docKeywords.length === 0) {
    return { skip: false, heuristicScore: 0, ambiguity: false, confidence: "low", matchedClusters: [] };
  }

  const hasNonAmbiguous = files.some((f) => !isAmbiguousFileName(f.name));
  if (!hasNonAmbiguous) {
    return { skip: false, heuristicScore: 0, ambiguity: true, confidence: "low", matchedClusters: [] };
  }

  const allPathTokens = files.map((f) => tokenize(f.path || f.name));
  const penalty = computePenalty(files);

  const segmentScores = [];
  const dokumenAda = [];
  const dokumenKurang = [];
  const matchedClusters = new Set();

  for (let i = 0; i < docKeywords.length; i++) {
    const kws = docKeywords[i];
    const segScore = weightedMatch(kws, allPathTokens);
    segmentScores.push(segScore);

    const label = segments[i].substring(0, 60);
    if (segScore >= 0.5) {
      dokumenAda.push(label);
      for (const kw of kws) {
        const cluster = findCluster(kw);
        if (cluster) matchedClusters.add(cluster);
      }
    } else {
      dokumenKurang.push(label);
    }
  }

  const avgCoverage = segmentScores.reduce((a, b) => a + b, 0) / segmentScores.length;
  const rawScore = Math.round(avgCoverage * 100);
  const heuristicScore = Math.max(0, Math.min(100, rawScore - Math.round(penalty)));

  // Ambiguity: high variance between segment scores, or mid-range average
  const variance = segmentScores.reduce((acc, s) => acc + Math.pow(s - avgCoverage, 2), 0) / segmentScores.length;
  const ambiguity = variance > 0.1 || (avgCoverage > 0.2 && avgCoverage < 0.5);

  let confidence;
  if (heuristicScore >= 85 && !ambiguity) confidence = "high";
  else if (heuristicScore >= 55) confidence = "medium";
  else confidence = "low";

  if (confidence === "high") {
    const pct = heuristicScore;
    const confLabel = pct === 100 ? "Tinggi" : pct >= 92 ? "Cukup Tinggi" : "Cukup";
    return {
      skip: true,
      heuristicScore,
      ambiguity,
      confidence,
      matchedClusters: Array.from(matchedClusters),
      result: {
        score: Math.max(78, heuristicScore),
        verdict: "Sesuai",
        dokumenAda,
        dokumenKurang,
        detail: `Keyakinan: ${confLabel} (${pct}%)`,
        basedOn: "nama_file",
        confidence,
      },
    };
  }

  return {
    skip: false,
    heuristicScore,
    ambiguity,
    confidence,
    matchedClusters: Array.from(matchedClusters),
    dokumenAda,
    dokumenKurang,
  };
}

// ── Layer 1: AI nama file vs standar (Haiku) ─────────────────────────────────

const NAMES_STANDAR_SYSTEM =
  `Kamu adalah validator dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

INSTRUKSI:
- Nilai kesesuaian HANYA dari nama file dan path subfolder — JANGAN menunggu isi dokumen
- Daftar path mencakup seluruh subfolder (ditampilkan lengkap)
- Jika nama file mengandung kata kunci relevan dari standar, anggap dokumen ada
- Berikan skor realistis: jika file relevan ada, minimal 60
- Sertakan tingkat keyakinan (confidence) penilaianmu: "high" jika yakin, "medium" jika cukup yakin, "low" jika tebakan

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"confidence":"<low|medium|high>","coverageScore":<0-100>,"verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","dokumenAda":[],"dokumenKurang":[],"catatan":"<1 kalimat>"}`;

export async function checkWithAINames(files, standarText, id) {
  if (!files || files.length === 0) {
    return {
      score: 0, confidence: "low", coverageScore: 0,
      verdict: "Tidak Ada File",
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
      confidence: result.confidence || "medium",
      coverageScore: result.coverageScore ?? result.score ?? 0,
      verdict: result.verdict || "Tidak diketahui",
      dokumenAda: result.dokumenAda || [],
      dokumenKurang: result.dokumenKurang || [],
      detail: result.catatan || "",
      basedOn: "nama_file",
    };
  } catch (err) {
    if (isCostError(err)) throw new AiCostError(err.message);
    const detail = err.status === 429 ? "Rate limit — Layer 1 dilewati" : `Gagal: ${err.message}`;
    return { score: 0, confidence: "low", coverageScore: 0, verdict: "Error AI", dokumenAda: [], dokumenKurang: [], detail, basedOn: "error" };
  }
}

// ── Layer 1b: AI nama file vs PANRB (Haiku) ──────────────────────────────────

export async function checkWithAINamesPanrb(files, kriteria, id) {
  if (!files || files.length === 0) {
    return {
      score: 0, confidence: "low", coverageScore: 0,
      verdict: "Tidak Ada File",
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
- Sertakan tingkat keyakinan (confidence): "high" jika yakin, "medium" jika cukup yakin, "low" jika tebakan

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"confidence":"<low|medium|high>","coverageScore":<0-100>,"verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","dokumenAda":[],"dokumenKurang":[],"catatan":"<1 kalimat>"}`;

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
      confidence: result.confidence || "medium",
      coverageScore: result.coverageScore ?? result.score ?? 0,
      verdict: result.verdict || "Tidak diketahui",
      dokumenAda: result.dokumenAda || [],
      dokumenKurang: result.dokumenKurang || [],
      detail: result.catatan || "",
      basedOn: "nama_file_panrb",
    };
  } catch (err) {
    if (isCostError(err)) throw new AiCostError(err.message);
    const detail = err.status === 429 ? "Rate limit — Layer 1b dilewati" : `Gagal: ${err.message}`;
    return { score: 0, confidence: "low", coverageScore: 0, verdict: "Error AI", dokumenAda: [], dokumenKurang: [], detail, basedOn: "error" };
  }
}

// ── Layer 3: Konten vs standar (Haiku + multimodal) ───────────────────────────

const CHECKER_SYSTEM =
  `Kamu adalah validator dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

INSTRUKSI:
- Daftar file sudah termasuk semua file di dalam subfolder (path lengkap ditampilkan)
- Nilai kesesuaian berdasarkan nama file, lokasi folder, dan isi dokumen (jika ada)
- File PDF dan gambar yang dilampirkan HARUS dibaca isinya secara detail
- Nama file relevan sudah merupakan bukti keberadaan dokumen
- Jika nama file mengandung kata kunci dari standar, anggap dokumen ADA
- Berikan skor realistis: jika file relevan ada, minimal 60

PENGECEKAN KUALITAS KONTEN:
- Periksa apakah ada placeholder belum diisi (mis: "[nama unit]", "____", "N/A" berulang, "xxx")
- Periksa apakah konten terlalu generik / tidak spesifik untuk unit kerja ini
- Jika dokumen adalah template kosong atau copy-paste generik tanpa adaptasi nyata, turunkan skor

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"confidence":"<low|medium|high>","verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","dokumenAda":[],"dokumenKurang":[],"catatan":"<1 kalimat>","basedOn":"<nama_file|konten|keduanya>","isTemplate":<true|false>,"hasGenericContent":<true|false>}`;

export async function checkWithAIContent(files, fileContents, standarText, id, readableFiles) {
  if (!files || files.length === 0) {
    return {
      score: 0, confidence: "low", verdict: "Tidak Ada File",
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
      max_tokens: 1200,
      system: [{ type: "text", text: CHECKER_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [...documentBlocks, { type: "text", text: userText }] }],
    });
    const text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);
    return {
      score: result.score || 0,
      confidence: result.confidence || "medium",
      verdict: result.verdict || "Tidak diketahui",
      dokumenAda: result.dokumenAda || [],
      dokumenKurang: result.dokumenKurang || [],
      detail: result.catatan || "",
      basedOn: result.basedOn || "konten",
      isTemplate: result.isTemplate || false,
      hasGenericContent: result.hasGenericContent || false,
    };
  } catch (err) {
    if (isCostError(err)) throw new AiCostError(err.message);
    const detail = err.status === 429 ? "Rate limit — Layer 3 dilewati" : `Gagal: ${err.message}`;
    return { score: 0, confidence: "low", verdict: "Error AI", dokumenAda: [], dokumenKurang: [], detail, basedOn: "error" };
  }
}

// ── Layer 1 (Auditor): Folder + Narasi vs PANRB (Haiku) ──────────────────────

const AUDITOR_SYSTEM =
  `Kamu adalah Auditor Internal Senior Pemerintah Indonesia yang berpengalaman dalam evaluasi Zona Integritas (ZI) menuju WBK/WBBM sesuai Pedoman PANRB.

PERAN & SIKAP AUDITOR:
- Berikan pendapat INDEPENDEN — tidak memihak unit kerja maupun evaluator
- Kritis namun adil — nilai apa adanya berdasarkan bukti, bukan formalitas
- Jangan mudah terpengaruh narasi yang "normatif" atau bombastis tanpa bukti dokumen nyata
- Fokus pada SUBSTANSI: apakah bukti benar-benar membuktikan pemenuhan kriteria?

LANGKAH ANALISIS:
1. Pahami KRITERIA PANRB — apa yang sesungguhnya dituntut?
2. Petakan STRUKTUR FOLDER & NAMA DOKUMEN — apa saja bukti yang tersedia?
3. Telaah NARASI UNIT KERJA — apa yang diklaim? Apakah klaim konsisten dengan dokumen yang ada?
4. Simpulkan: apakah kombinasi dokumen + narasi menjawab kriteria secara SUBSTANSIAL?

TANDA-TANDA DOKUMEN LEMAH (perlu dicatat):
- Nama file generik: scan001, foto, gambar, dokumen, untitled, img, photo
- Narasi panjang mengklaim "sudah dilaksanakan" namun tidak ada dokumen relevan di folder
- Folder ada tapi isinya tidak sesuai dengan kriteria
- Narasi bersifat copy-paste normatif tanpa adaptasi spesifik unit

SKALA PENILAIAN:
- 70–100 : Sesuai — dokumen dan narasi secara substansial menjawab kriteria PANRB
- 40–69  : Sebagian Sesuai — ada upaya nyata namun belum lengkap, atau ada kesenjangan antara klaim narasi dan bukti dokumen
- 0–39   : Tidak Sesuai — bukti tidak memadai, narasi tidak terbukti oleh dokumen, atau tidak relevan dengan kriteria

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","pendapat":"<2-3 kalimat pendapat auditor yang kritis dan substantif>","temuanKritis":"<temuan kritis jika ada, atau null jika tidak ada>","dokumenAda":["<nama/jenis dokumen yang ditemukan dan relevan>"],"dokumenKurang":["<dokumen yang seharusnya ada namun tidak ditemukan>"],"confidence":"<low|medium|high>"}`;

export async function auditFolderVsNarasi(files, narasi, kriteria, standar, id) {
  if (!files || files.length === 0) {
    return {
      score: 0,
      verdict: "Tidak Ada File",
      pendapat: "Folder kosong — tidak ada dokumen yang dapat dievaluasi oleh auditor.",
      temuanKritis: "Tidak ada file di folder Drive",
      dokumenAda: [],
      dokumenKurang: [],
      confidence: "high",
      detail: "Folder kosong, tidak ada dokumen",
      basedOn: "auditor",
    };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fileList = files.map((f) => `- ${f.path || f.name}`).join("\n");

  const parts = [
    `KRITERIA PANRB untuk ID ${id}:`,
    kriteria?.trim() || "(kriteria PANRB tidak tersedia — gunakan pengetahuanmu tentang standar ZI WBK/WBBM)",
  ];
  if (standar?.trim()) {
    parts.push("", "STANDAR DOKUMEN YANG DIHARAPKAN (referensi internal):", standar.trim());
  }
  parts.push(
    "",
    "STRUKTUR FOLDER & NAMA DOKUMEN (termasuk seluruh subfolder):",
    fileList,
    "",
    "NARASI UNIT KERJA (keterangan yang disampaikan unit):",
    narasi?.trim() || "(narasi tidak diisi oleh unit kerja)",
  );

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: [{ type: "text", text: AUDITOR_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [{ type: "text", text: parts.join("\n") }] }],
    });
    const text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);
    return {
      score: result.score ?? 0,
      verdict: result.verdict || "Tidak diketahui",
      pendapat: result.pendapat || "",
      temuanKritis: result.temuanKritis || null,
      dokumenAda: result.dokumenAda || [],
      dokumenKurang: result.dokumenKurang || [],
      confidence: result.confidence || "medium",
      detail: result.pendapat || "",
      basedOn: "auditor_narasi",
    };
  } catch (err) {
    if (isCostError(err)) throw new AiCostError(err.message);
    const detail = err.status === 429 ? "Rate limit — Auditor dilewati" : `Gagal: ${err.message}`;
    return {
      score: 0, confidence: "low", verdict: "Error AI",
      pendapat: detail, temuanKritis: null,
      dokumenAda: [], dokumenKurang: [],
      detail, basedOn: "error",
    };
  }
}

// ── Layer 4: Sonnet Deep Review (rescue + QC sampling) ───────────────────────

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

Tugasmu adalah menilai ULANG secara independen berdasarkan KRITERIA PANRB dan ISI DOKUMEN yang sebenarnya.

KRITERIA PENILAIAN PANRB:
${kriteria}

INSTRUKSI:
- Abaikan skor sebelumnya — nilai MURNI dari konten dokumen dan kriteria PANRB di atas
- BACA ISI file PDF dan gambar yang dilampirkan secara detail
- Jika konten dokumen relevan dan memenuhi kriteria, berikan skor yang sesuai
- Jika memang tidak memenuhi, konfirmasi dengan alasan yang jelas
- Deteksi: apakah dokumen template kosong, placeholder belum diisi, atau copy-paste tanpa adaptasi?
- Tandai inconsistencyFlag jika ada konflik signifikan antara nama file dan isi dokumen

Jawab HANYA format JSON (tanpa markdown):
{"revisedScore":<0-100>,"revisedVerdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","review":"<2-3 kalimat analisis independen>","kontenSesuai":<true|false>,"alasan":"<1 kalimat ringkas>","auditFinding":"<temuan penting, atau null jika tidak ada>","inconsistencyFlag":<true|false>}`;

  const userText =
    `ID ${id} — review berdasarkan kriteria di atas.\n\nDAFTAR FILE:\n${fileList}` + contentSection;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
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

// ── Confidence Routing ────────────────────────────────────────────────────────

/**
 * Decides whether to proceed to content check (Layer 3) based on tiered thresholds.
 * Balances cost vs coverage: only escalates when there's a real reason to.
 *
 * @param {{ heuristicScore: number, ambiguity: boolean }} heuristic
 * @param {{ score: number, confidence: string }} aiCheck
 * @param {{ exists: boolean }} existCheck
 * @param {number} bobot - Document weight (>1.0 = high priority)
 */
export function confidenceRouting(heuristic, aiCheck, existCheck, bobot = 0) {
  if (!existCheck.exists) {
    return { needsContentCheck: false, reason: "no_files" };
  }

  const score = aiCheck.score || 0;
  const aiConf = aiCheck.confidence || "medium";
  const isAmbiguous = heuristic?.ambiguity || false;
  const isHighPriority = bobot > 1.0;

  // Clear enough: skip content check entirely
  if (score >= 80 && aiConf === "high" && !isAmbiguous) {
    return { needsContentCheck: false, reason: "high_confidence_final" };
  }

  // Score too low: always check content
  if (score < 40) {
    return { needsContentCheck: true, reason: "low_score" };
  }

  // Mid score (40–65) on a high-priority document: check content
  if (score < 65 && isHighPriority) {
    return { needsContentCheck: true, reason: "priority_doc" };
  }

  // Score 65–80 but ambiguous file names: check content
  if (score < 80 && isAmbiguous) {
    return { needsContentCheck: true, reason: "ambiguous" };
  }

  return { needsContentCheck: false, reason: "sufficient_confidence" };
}

// ── QC Sampling ───────────────────────────────────────────────────────────────

/**
 * Determines if this item should be QC-sampled via Sonnet.
 * Only triggers on concrete low-confidence signals — no random baseline.
 */
export function shouldSampleForQC(heuristic, aiCheck, finalScore) {
  // High score tapi AI sendiri tidak yakin → risiko false positive
  if (finalScore >= 70 && aiCheck.confidence === "low") return true;

  // Heuristic dan AI berbeda jauh → salah satu kemungkinan keliru
  const hScore = heuristic?.heuristicScore || 0;
  if (Math.abs(hScore - finalScore) > 35) return true;

  // Terdeteksi template atau konten generik dari Layer 3
  if (aiCheck.isTemplate || aiCheck.hasGenericContent) return true;

  return false;
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
