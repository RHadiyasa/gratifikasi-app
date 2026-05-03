import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeSubmission from '@/modules/models/LkeSubmission'
import LkeKriteria from '@/modules/models/LkeKriteria'
import LkeSyncLog from '@/modules/models/LkeSyncLog'
import { parseRingkasanAI, syncFromVisaReview, readVisaReviewStats } from '@/lib/zi/sheetParser'
import { buildScoringDetailMap, isDetailKriteria } from '@/lib/zi/scoring'
import { TARGET_THRESHOLD } from '@/types/zi'
import { getSessionUser } from '@/lib/auth'
import { canAccessZiSubmission, hasPermission } from '@/lib/permissions'

async function getUserId(): Promise<string> {
  const user = await getSessionUser()
  return user?.id ?? 'anonymous'
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser({ includeProfile: true })
    if (!user || !hasPermission(user.role, 'zi:sync')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await connect()
    const { id } = await params

    const submission = (await LkeSubmission.findById(id)
      .lean()) as {
      eselon2?: string | null;
      assigned_unit_zi_id?: string | null;
    } & any | null
    if (!submission) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    if (!canAccessZiSubmission(user.role, user.unitKerja, submission, user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const nilai_sebelum = submission.nilai_lke_ai?.nilai_akhir ?? null

    // Set syncing
    await LkeSubmission.findByIdAndUpdate(id, { sync_status: 'syncing', sync_error: null })

    try {
      const threshold  = TARGET_THRESHOLD[submission.target as 'WBK' | 'WBBM']
      let ringkasan = null
      let vrStats   = { checked: 0, total: 0 }
      const kriteriaList = await LkeKriteria.find({ aktif: true }).lean() as any[]
      const primaryKriteria = kriteriaList.filter((k) => !isDetailKriteria(k))
      const scoringDetailMap = buildScoringDetailMap(primaryKriteria)
      const primaryIds = new Set(primaryKriteria.map((k) => Number(k.question_id)))

      // Coba baca Ringkasan AI sheet langsung (1 read)
      try {
        ringkasan = await parseRingkasanAI(submission.link)
      } catch { /* fallback di bawah */ }

      if (!ringkasan) {
        // Ringkasan AI belum ada → baca Visa Review SEKALI untuk stats + build ringkasan (1 read)
        try {
          const vr  = await syncFromVisaReview(submission.link, submission.target || 'WBK', scoringDetailMap)
          ringkasan = vr.ringkasan
          vrStats   = vr.stats
        } catch { /* lanjut ke sync progress saja */ }
      } else {
        // Ringkasan AI ada → tetap perlu stats dari Visa Review (1 read)
        try {
          vrStats = await readVisaReviewStats(submission.link, primaryIds)
        } catch { /* gunakan default 0 */ }
      }

      const checkedCount = vrStats.checked
      // total_data dari MongoDB (diisi saat submit atau lewat PATCH dari detail page)
      const totalData    = submission.total_data || 0
      const unchecked    = Math.max(0, totalData - checkedCount)
      const pct          = totalData > 0 ? Math.round((checkedCount / totalData) * 100) : 0
      // Status: "Sedang Dicek" jika ada yang sudah dicek, meski total belum diketahui
      const status       = checkedCount > 0 && pct >= 100 && totalData > 0
        ? 'Selesai'
        : checkedCount > 0
          ? 'Sedang Dicek'
          : 'Belum Dicek'

      // Jika belum ada data penilaian AI (belum dicek), sync progress saja
      if (!ringkasan) {
        const updated = await LkeSubmission.findByIdAndUpdate(id, {
          checked_count:    checkedCount,
          unchecked_count:  unchecked,
          progress_percent: pct,
          status,
          last_synced_at:   new Date(),
          sync_status:      'success',
          sync_error:       null,
        }, { new: true }).lean()

        await LkeSyncLog.create({
          submission_id:       id,
          triggered_by:        await getUserId(),
          status:              'success',
          nilai_akhir_sebelum: nilai_sebelum,
          nilai_akhir_sesudah: null,
          synced_at:           new Date(),
        })

        return NextResponse.json({ submission: updated })
      }

      ringkasan.target_tercapai = (ringkasan.nilai_akhir ?? 0) >= threshold

      const updated = await LkeSubmission.findByIdAndUpdate(
        id,
        {
          nilai_lke_ai:     ringkasan,
          checked_count:    checkedCount,
          unchecked_count:  unchecked,
          progress_percent: pct,
          status,
          last_synced_at:   new Date(),
          sync_status:      'success',
          sync_error:       null,
        },
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
