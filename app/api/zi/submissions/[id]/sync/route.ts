import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeSubmission from '@/modules/models/LkeSubmission'
import LkeSyncLog from '@/modules/models/LkeSyncLog'
import { parseRingkasanAI, buildRingkasanFromVisaReview } from '@/lib/zi/sheetParser'
import { TARGET_THRESHOLD } from '@/types/zi'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

async function getUserId(): Promise<string> {
  try {
    const token = (await cookies()).get('token')?.value
    if (!token) return 'anonymous'
    const payload: any = jwt.verify(token, process.env.TOKEN_SECRET!)
    return payload.id ?? 'anonymous'
  } catch {
    return 'anonymous'
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connect()
    const { id } = await params

    const submission = await LkeSubmission.findById(id)
    if (!submission) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

    const nilai_sebelum = submission.nilai_lke_ai?.nilai_akhir ?? null

    // Set syncing
    await LkeSubmission.findByIdAndUpdate(id, { sync_status: 'syncing', sync_error: null })

    try {
      const threshold  = TARGET_THRESHOLD[submission.target as 'WBK' | 'WBBM']
      let ringkasan = null
      try {
        ringkasan = await parseRingkasanAI(submission.link)
      } catch { /* fallback di bawah */ }

      // Fallback 1: bangun Ringkasan AI dari data Visa review
      if (!ringkasan) {
        try {
          ringkasan = await buildRingkasanFromVisaReview(submission.link, submission.target || 'WBK')
        } catch { /* lanjut ke fallback berikutnya */ }
      }

      if (!ringkasan) {
        const msg = 'Tidak dapat membaca data nilai dari sheet. Pastikan sheet LKE memiliki data penilaian.'
        await LkeSubmission.findByIdAndUpdate(id, {
          sync_status: 'error',
          sync_error:  msg,
        })
        return NextResponse.json({ error: msg }, { status: 404 })
      }

      ringkasan.target_tercapai = (ringkasan.nilai_akhir ?? 0) >= threshold

      const updated = await LkeSubmission.findByIdAndUpdate(
        id,
        { nilai_lke_ai: ringkasan, last_synced_at: new Date(), sync_status: 'success', sync_error: null },
        { new: true }
      ).lean()

      await LkeSyncLog.create({
        submission_id:       id,
        triggered_by:        await getUserId(),
        status:              'success',
        nilai_akhir_sebelum: nilai_sebelum,
        nilai_akhir_sesudah: ringkasan.nilai_akhir,
        synced_at:           new Date(),
      })

      return NextResponse.json({ submission: updated })
    } catch (err: any) {
      await LkeSubmission.findByIdAndUpdate(id, { sync_status: 'error', sync_error: err.message })
      await LkeSyncLog.create({
        submission_id:       id,
        triggered_by:        await getUserId(),
        status:              'error',
        nilai_akhir_sebelum: nilai_sebelum,
        nilai_akhir_sesudah: null,
        error_message:       err.message,
        synced_at:           new Date(),
      })
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
