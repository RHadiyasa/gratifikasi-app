import Anthropic from "@anthropic-ai/sdk";

export async function checkWithAI(files, fileContents, standarText, id) {
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
  const hasContent = fileContents && fileContents.some(Boolean);
  const fileList = files
    .map((f) => `- ${f.name} (${f.mimeType || "unknown"})`)
    .join("\n");
  const contentSection = hasContent
    ? `\nSAMPEL ISI FILE:\n${fileContents
        .map((c, i) => (c ? `=== ${files[i]?.name} ===\n${c}` : null))
        .filter(Boolean)
        .join("\n\n")
        .substring(0, 3500)}`
    : "\n(Konten tidak dapat dibaca — nilai dari nama file saja.)";

  const prompt = `Kamu adalah validator dokumen Zona Integritas (ZI) WBK/WBBM Kementerian ESDM.

STANDAR DOKUMEN untuk ID ${id}:
${standarText}

DAFTAR FILE di folder Google Drive:
${fileList}
${contentSection}

INSTRUKSI:
- Nilai kesesuaian berdasarkan nama file dan isi (jika ada)
- Nama file relevan sudah merupakan bukti keberadaan dokumen
- Jika nama file mengandung kata kunci dari standar, anggap dokumen ADA
- Berikan skor realistis: jika file relevan ada, minimal 60

Jawab HANYA format JSON (tanpa markdown):
{"score":<0-100>,"verdict":"<Sesuai|Sebagian Sesuai|Tidak Sesuai>","dokumenAda":[],"dokumenKurang":[],"catatan":"<1 kalimat>","basedOn":"<nama_file|konten|keduanya>"}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
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
