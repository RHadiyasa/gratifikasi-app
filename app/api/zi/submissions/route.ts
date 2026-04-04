import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeSubmission from '@/modules/models/LkeSubmission'
import { parseSheetLKE } from '@/lib/zi/sheetParser'
import { TARGET_THRESHOLD } from '@/types/zi'

function detectAbbrev(text: string): boolean {
  const words = text.split(/\s+/)
  return words.some((w) => (w.length > 1 && w === w.toUpperCase() && /^[A-Z]+$/.test(w)) || /\.\w/.test(w))
}

// GET /api/zi/submissions
export async function GET(req: Request) {
  try {
    await connect()
    const { searchParams } = new URL(req.url)
    const eselon1 = searchParams.get('eselon1')
    const status  = searchParams.get('status')
    const target  = searchParams.get('target')
    const search  = searchParams.get('search')

    const query: Record<string, any> = {}
    if (eselon1) query.eselon1 = eselon1
    if (status)  query.status  = status
    if (target)  query.target  = target
    if (search)  query.$or = [
      { eselon2:  { $regex: search, $options: 'i' } },
      { pic_unit: { $regex: search, $options: 'i' } },
    ]

    const submissions = await LkeSubmission.find(query).sort({ created_at: -1 }).lean()

    const total            = submissions.length
    const selesai          = submissions.filter((s) => s.status === 'Selesai').length
    const sedang           = submissions.filter((s) => s.status === 'Sedang Dicek').length
    const belum            = submissions.filter((s) => s.status === 'Belum Dicek').length
    const wbk_tercapai     = submissions.filter((s) => s.target === 'WBK'  && s.nilai_lke?.target_tercapai).length
    const wbbm_tercapai    = submissions.filter((s) => s.target === 'WBBM' && s.nilai_lke?.target_tercapai).length
    const withNilai        = submissions.filter((s) => s.nilai_lke?.nilai_akhir != null)
    const rata_nilai_akhir = withNilai.length
      ? withNilai.reduce((a, s) => a + (s.nilai_lke?.nilai_akhir ?? 0), 0) / withNilai.length
      : null

    return NextResponse.json({
      submissions,
      summary: { total, selesai, sedang, belum, wbk_tercapai, wbbm_tercapai, rata_nilai_akhir },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/zi/submissions
export async function POST(req: Request) {
  try {
    await connect()
    const body = await req.json()
    const { link, target, eselon1, eselon2, pic_unit, catatan } = body

    if (!link?.includes('docs.google.com/spreadsheets')) {
      return NextResponse.json({ error: 'Link harus berupa URL Google Sheets' }, { status: 400 })
    }
    if (!['WBK', 'WBBM'].includes(target)) {
      return NextResponse.json({ error: 'Target harus WBK atau WBBM' }, { status: 400 })
    }
    if (!eselon1 || !eselon2 || !pic_unit) {
      return NextResponse.json({ error: 'Eselon I, Eselon II, dan PIC wajib diisi' }, { status: 400 })
    }

    const abbrev_warning = detectAbbrev(eselon2)

    const submission = await LkeSubmission.create({ link, target, eselon1, eselon2, pic_unit, catatan: catatan || '' })

    // Parse sheet awal (non-blocking terhadap error)
    let nilai_lke = null
    let parse_error = null
    try {
      const parsed = await parseSheetLKE(link)
      const threshold = TARGET_THRESHOLD[target as 'WBK' | 'WBBM']
      parsed.target_tercapai = (parsed.nilai_akhir ?? 0) >= threshold
      nilai_lke = parsed

      await LkeSubmission.findByIdAndUpdate(submission._id, {
        nilai_lke:      parsed,
        last_synced_at: new Date(),
        sync_status:    'success',
      })
    } catch (e: any) {
      parse_error = e.message
      await LkeSubmission.findByIdAndUpdate(submission._id, {
        sync_status: 'error',
        sync_error:  e.message,
      })
    }

    const updated = await LkeSubmission.findById(submission._id).lean()
    return NextResponse.json({ submission: updated, abbrev_warning, parse_error }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
