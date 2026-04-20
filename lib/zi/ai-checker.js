import Anthropic from "@anthropic-ai/sdk";

/**
 * Pisahkan fileContents menjadi:
 *  - documentBlocks: content blocks untuk PDF/gambar (multimodal)
 *  - textSnippets:   potongan teks dari Google Docs / plain-text
 */
const MAX_TOTAL_PDF_PAGES = 90; // batas aman total halaman PDF per request (API limit 100)

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
      if (totalPdfPages + pages > MAX_TOTAL_PDF_PAGES) continue; // skip, kuota habis
      totalPdfPages += pages;

      const truncInfo = c.totalPages ? ` — hal. 1-${pages} dari ${c.totalPages}` : "";
      documentBlocks.push(
        { type: "text", text: `[Dokumen: ${name}${truncInfo}]` },
        {
          type: "document",
          source: { type: "base64", media_type: c.mimeType, data: c.base64 },
        },
      );
    } else if (typeof c === "object" && c.type === "image") {
      documentBlocks.push(
        { type: "text", text: `[Gambar: ${name}]` },
        {
          type: "image",
          source: { type: "base64", media_type: c.mimeType, data: c.base64 },
        },
      );
    } else if (typeof c === "string") {
      textSnippets.push(`=== ${name} ===\n${c}`);
    }
  }
  return { documentBlocks, textSnippets };
}

export async function checkWithAI(files, fileContents, standarText, id, readableFiles) {
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
  const contentFiles = readableFiles || files;
  const { documentBlocks, textSnippets } = buildContentParts(fileContents, contentFiles);

  const hasText = textSnippets.length > 0;
  const hasDocs = documentBlocks.length > 0;
  const hasContent = hasText || hasDocs;

  const fileList = files
    .map((f) => `- ${f.path || f.name} (${f.mimeType || "unknown"})`)
    .join("\n");

  let contentSection = "";
  if (hasText) {
    contentSection += `\nSAMPEL ISI FILE (teks):\n${textSnippets.join("\n\n").substring(0, 6000)}`;
  }
  if (hasDocs) {
    const docCount = documentBlocks.filter((b) => b.type === "document" || b.type === "image").length;
    contentSection += `\n(${docCount} file PDF/gambar dilampirkan di atas — baca isinya untuk penilaian)`;
  }
  if (!hasContent) {
    contentSection = "\n(Konten tidak dapat dibaca — nilai dari nama file saja.)";
  }

  const promptText = `Kamu adalah validator dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

STANDAR DOKUMEN untuk ID ${id}:
${standarText}

DAFTAR FILE di folder Google Drive (termasuk subfolder, path ditampilkan):
${fileList}
${contentSection}

INSTRUKSI:
- Daftar file sudah termasuk semua file di dalam subfolder (path lengkap ditampilkan)
- Nilai kesesuaian berdasarkan nama file, lokasi folder, dan isi dokumen (jika ada)
- File PDF dan gambar yang dilampirkan di atas HARUS dibaca isinya secara detail
- Nama file relevan sudah merupakan bukti keberadaan dokumen
- Jika nama file mengandung kata kunci dari standar, anggap dokumen ADA
- Perhatikan juga isi/konten dokumen untuk menilai kesesuaian dengan standar
- Berikan skor realistis: jika file relevan ada, minimal 60

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","dokumenAda":[],"dokumenKurang":[],"catatan":"<1 kalimat>","basedOn":"<nama_file|konten|keduanya>"}`;

  const messageContent = [...documentBlocks, { type: "text", text: promptText }];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: messageContent }],
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

export async function deepContentReview(files, fileContents, kriteria, id, readableFiles) {
  if (!fileContents || !fileContents.some(Boolean) || !kriteria) {
    return null;
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const contentFiles = readableFiles || files;
  const { documentBlocks, textSnippets } = buildContentParts(fileContents, contentFiles);

  const fileList = files
    .map((f) => `- ${f.path || f.name} (${f.mimeType || "unknown"})`)
    .join("\n");

  let contentSection = "";
  if (textSnippets.length > 0) {
    contentSection = `\nISI DOKUMEN (teks):\n${textSnippets.join("\n\n").substring(0, 8000)}`;
  }
  if (documentBlocks.length > 0) {
    const docCount = documentBlocks.filter((b) => b.type === "document" || b.type === "image").length;
    contentSection += `\n(${docCount} file PDF/gambar dilampirkan di atas — baca isinya secara detail)`;
  }

  const promptText = `Kamu adalah reviewer independen dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

Skor awal dari pengecekan standarisasi RENDAH untuk ID ${id}. Tugasmu adalah menilai ULANG secara independen berdasarkan KRITERIA PANRB dan ISI DOKUMEN yang sebenarnya.

KRITERIA PENILAIAN PANRB (Kolom I dari LKE):
${kriteria}

DAFTAR FILE di folder:
${fileList}
${contentSection}

INSTRUKSI:
- Abaikan standarisasi data dukung sebelumnya — nilai MURNI dari konten dokumen
- BACA ISI file PDF dan gambar yang dilampirkan di atas secara detail
- Periksa apakah isi dokumen memenuhi kriteria PANRB di atas
- Jika konten dokumen sebenarnya relevan dan memenuhi kriteria, naikkan skor
- Jika memang tidak memenuhi, konfirmasi skor rendah dan jelaskan alasannya
- Berikan review detail tentang kesesuaian konten dengan kriteria PANRB

Jawab HANYA format JSON (tanpa markdown):
{"revisedScore":<0-100>,"revisedVerdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","review":"<2-3 kalimat analisis independen berdasarkan konten dan kriteria PANRB>","kontenSesuai":<true/false>,"alasan":"<1 kalimat ringkas>"}`;

  const messageContent = [...documentBlocks, { type: "text", text: promptText }];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: messageContent }],
    });
    const text = response.content[0].text
      .trim()
      .replace(/```json|```/g, "")
      .trim();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function calculateFinalVerdict(existCheck, aiCheck) {
  if (!existCheck.exists)
    return { status: "\u274C Tidak Ada File", score: 0, color: "MERAH" };
  const score = aiCheck?.score || 0;
  if (score >= 70)
    return { status: "\u2705 Sesuai", score, color: "HIJAU" };
  if (score >= 40)
    return { status: "\u26A0\uFE0F Sebagian Sesuai", score, color: "KUNING" };
  return { status: "\u274C Tidak Sesuai", score, color: "MERAH" };
}
