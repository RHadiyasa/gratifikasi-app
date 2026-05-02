import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeJawaban from '@/modules/models/LkeJawaban'
import LkeKriteria from '@/modules/models/LkeKriteria'
import LkeSubmission from '@/modules/models/LkeSubmission'
import { SheetSyncValidationError, syncSheetToLkeJawaban } from '@/lib/zi/sheet-sync'

// GET /api/zi/submissions/[id]/jawaban
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connect()
    const { id } = await params
    const submission = await LkeSubmission.findById(id).select('source link').lean() as any
    if (!submission) return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 })

    let sync = null
    const detailQuestionIds = await LkeKriteria.distinct('question_id', {
      aktif: true,
      answer_type: 'jumlah',
      parent_question_id: { $ne: null },
    })
    const hasDetailCriteria = detailQuestionIds.length > 0
    const detailCriteriaCount = detailQuestionIds.length
    const [jawabanCount, hasAnyUnitData, unitDetailAnswerCount, hasAnyTpiUnitData, tpiUnitDetailAnswerCount, hasAnyTpiItjenData, tpiItjenDetailAnswerCount] = await Promise.all([
      LkeJawaban.countDocuments({ submission_id: id }),
      LkeJawaban.exists({
        submission_id: id,
        $or: [
          { jawaban_unit: /\S/ },
          { narasi: /\S/ },
          { bukti: /\S/ },
          { link_drive: /\S/ },
        ],
      }),
      hasDetailCriteria
        ? LkeJawaban.countDocuments({
            submission_id: id,
            question_id: { $in: detailQuestionIds },
            jawaban_unit: /\S/,
          })
        : Promise.resolve(0),
      LkeJawaban.exists({
        submission_id: id,
        $or: [
          { jawaban_tpi_unit: /\S/ },
          { catatan_tpi_unit: /\S/ },
        ],
      }),
      hasDetailCriteria
        ? LkeJawaban.countDocuments({
            submission_id: id,
            question_id: { $in: detailQuestionIds },
            jawaban_tpi_unit: /\S/,
          })
        : Promise.resolve(0),
      LkeJawaban.exists({
        submission_id: id,
        $or: [
          { jawaban_tpi_itjen: /\S/ },
          { catatan_tpi_itjen: /\S/ },
        ],
      }),
      hasDetailCriteria
        ? LkeJawaban.countDocuments({
            submission_id: id,
            question_id: { $in: detailQuestionIds },
            jawaban_tpi_itjen: /\S/,
          })
        : Promise.resolve(0),
    ])
    const isSheetSource = submission.source !== 'app'
    const missingUnitDetailAnswers = hasDetailCriteria && unitDetailAnswerCount < detailCriteriaCount
    const missingTpiUnitDetailAnswers = hasDetailCriteria && tpiUnitDetailAnswerCount < detailCriteriaCount
    const missingTpiItjenDetailAnswers = hasDetailCriteria && tpiItjenDetailAnswerCount < detailCriteriaCount
    if (
      isSheetSource &&
      submission.link &&
      (
        jawabanCount === 0 ||
        !hasAnyUnitData ||
        missingUnitDetailAnswers ||
        !hasAnyTpiUnitData ||
        missingTpiUnitDetailAnswers ||
        !hasAnyTpiItjenData ||
        missingTpiItjenDetailAnswers
      )
    ) {
      sync = await syncSheetToLkeJawaban(id, { mode: 'missing_only' })
    }

    const [jawabanList, kriteriaList] = await Promise.all([
      LkeJawaban.find({ submission_id: id }).lean(),
      LkeKriteria.find({ aktif: true }).sort({ komponen: 1, urutan: 1 }).lean(),
    ])

    const jawabanMap = new Map(jawabanList.map((j) => [j.question_id, j]))

    const KOMPONEN_ORDER = ['mp', 'tt', 'sdm', 'ak', 'pw', 'pp', 'ipak', 'capaian_kinerja', 'prima']
    const grouped: Record<string, any[]> = {}
    for (const k of KOMPONEN_ORDER) grouped[k] = []

    for (const kriteria of kriteriaList) {
      const k = kriteria.komponen as string
      if (!grouped[k]) grouped[k] = []
      grouped[k].push({
        kriteria,
        jawaban: jawabanMap.get(kriteria.question_id) ?? null,
      })
    }

    return NextResponse.json({ jawaban: jawabanList, grouped, sync })
  } catch (err: any) {
    if (err instanceof SheetSyncValidationError) {
      return NextResponse.json({ error: err.message, sync: err.result }, { status: 422 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/zi/submissions/[id]/jawaban — batch upsert
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connect()
    const { id } = await params
    const body = await req.json()
    const items: {
      question_id:       number
      jawaban_unit?:     string
      narasi?:           string
      bukti?:            string
      link_drive?:       string
      jawaban_tpi_unit?: string
      catatan_tpi_unit?: string
      jawaban_tpi_itjen?:string
      catatan_tpi_itjen?:string
    }[] = body.jawaban ?? []

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'jawaban harus berupa array dan tidak boleh kosong' }, { status: 400 })
    }

    const ops = items.map((item) => ({
      updateOne: {
        filter: { submission_id: id, question_id: item.question_id },
        update: {
          $set: {
            jawaban_unit:      item.jawaban_unit      ?? '',
            narasi:            item.narasi            ?? '',
            bukti:             item.bukti             ?? '',
            link_drive:        item.link_drive        ?? '',
            jawaban_tpi_unit:  item.jawaban_tpi_unit  ?? '',
            catatan_tpi_unit:  item.catatan_tpi_unit  ?? '',
            jawaban_tpi_itjen: item.jawaban_tpi_itjen ?? '',
            catatan_tpi_itjen: item.catatan_tpi_itjen ?? '',
          },
          $setOnInsert: { submission_id: id, question_id: item.question_id },
        },
        upsert: true,
      },
    }))

    const result = await LkeJawaban.bulkWrite(ops)
    return NextResponse.json({
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
