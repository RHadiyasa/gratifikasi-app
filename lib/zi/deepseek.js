// Klien DeepSeek untuk penilaian teks LKE (OpenAI-compatible API).
// Semua layer AI checker memakai fungsi ini; input/output berupa teks + JSON.

const DEEPSEEK_URL   = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

export class DeepseekApiError extends Error {
  constructor(msg, status) {
    super(msg);
    this.name = "DeepseekApiError";
    this.status = status;
  }
}

/**
 * Kirim prompt ke DeepSeek dan kembalikan hasil parse JSON.
 * - `response_format: json_object` menjamin output JSON valid
 *   (prompt sistem harus menyebut kata "JSON" — semua prompt checker sudah memenuhinya)
 * - Error 402 (Insufficient Balance) dilempar dengan status agar
 *   isCostError() di ai-checker mendeteksinya sebagai kredit habis.
 */
export async function deepseekJson({ system, user, maxTokens = 1200 }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new DeepseekApiError("DEEPSEEK_API_KEY belum diset di environment", 401);

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    let msg = `DeepSeek HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error?.message || msg;
    } catch { /* body bukan JSON */ }
    throw new DeepseekApiError(msg, res.status);
  }

  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || "")
    .trim()
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(text);
}
