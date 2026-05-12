import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeKriteria from '@/modules/models/LkeKriteria'
import LkeJawaban from '@/modules/models/LkeJawaban'
import LkeSubmission from '@/modules/models/LkeSubmission'
import { getSessionUser } from '@/lib/auth'
import { canAccessZiSubmission, hasPermission } from '@/lib/permissions'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  const user = await getSessionUser({ includeProfile: true })
  if (!user || !hasPermission(user.role, 'zi:review-tpi-kesdm')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  await connect()
  const { id, qid } = await params
  const questionId = parseInt(qid)

  if (isNaN(questionId)) {
    return NextResponse.json({ error: 'question_id tidak valid' }, { status: 400 })
  }

  const submission = (await LkeSubmission.findById(id)
    .select('eselon2 assigned_unit_zi_id')
    .lean()) as { eselon2?: string | null; assigned_unit_zi_id?: string | null } | null

  if (!submission) {
    return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 })
  }
  if (!canAccessZiSubmission(user.role, user.unitKerja, submission, user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [kriteria, jawaban] = await Promise.all([
    LkeKriteria.findOne({ question_id: questionId }).lean() as Promise<{
      pertanyaan?: string
      kriteria_panrb?: string
      standar_dokumen?: string
    } | null>,
    LkeJawaban.findOne({ submission_id: id, question_id: questionId }).lean() as Promise<{
      narasi?: string
      bukti?: string
      link_drive?: string
    } | null>,
  ])

  if (!kriteria) {
    return NextResponse.json({ error: 'Kriteria tidak ditemukan' }, { status: 404 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const systemPrompt = `Anda adalah reviewer dokumen Zona Integritas (ZI) dari Inspektorat Jenderal Kementerian ESDM yang berpengalaman. Tugas Anda adalah memberikan catatan visa (komentar reviu) yang profesional untuk setiap kriteria Lembar Kerja Evaluasi (LKE).

Prinsip penulisan catatan visa:
- Gunakan bahasa formal pemerintahan yang lugas dan padat
- Sebutkan secara eksplisit dokumen/bukti yang sudah ada dan yang masih kurang
- Rujuk pada standar dokumen yang dipersyaratkan
- Berikan penilaian yang objektif berdasarkan narasi dan bukti yang diberikan unit
- Hindari pernyataan ambigu — setiap kalimat harus jelas maknanya
- Jika bukti atau narasi tidak ada, nyatakan secara eksplisit bahwa unit belum menyampaikan`

  const userPrompt = `Buat catatan visa untuk kriteria LKE berikut:

**Pertanyaan LKE:**
${kriteria.pertanyaan || '(tidak tersedia)'}

**Kriteria PANRB:**
${kriteria.kriteria_panrb || '(tidak tersedia)'}

**Standarisasi Dokumen yang Diperlukan:**
${kriteria.standar_dokumen || '(tidak tersedia)'}

**Narasi yang Diberikan Unit:**
${jawaban?.narasi?.trim() || '(unit tidak memberikan narasi)'}

**Bukti/Data Dukung yang Dilampirkan Unit:**
${jawaban?.bukti?.trim() || '(unit tidak melampirkan bukti)'}

Tulis catatan visa dalam 2–4 kalimat yang mencakup:
1. Ringkasan singkat kondisi pemenuhan berdasarkan narasi/bukti yang ada
2. Dokumen apa yang sudah sesuai standar (jika ada)
3. Dokumen/informasi yang masih perlu dilengkapi (jika ada)
4. Rekomendasi atau catatan penting untuk unit

Berikan HANYA teks catatan visa tanpa judul, label, atau penjelasan tambahan.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const komentar = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  return NextResponse.json({ komentar })
}
