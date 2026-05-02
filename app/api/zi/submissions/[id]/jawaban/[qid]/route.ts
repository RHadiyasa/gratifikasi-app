import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeJawaban from '@/modules/models/LkeJawaban'

// PATCH /api/zi/submissions/[id]/jawaban/[qid]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    await connect()
    const { id, qid } = await params
    const questionId = parseInt(qid)
    if (isNaN(questionId)) {
      return NextResponse.json({ error: 'question_id tidak valid' }, { status: 400 })
    }

    const body = await req.json()
    const allowedInput = [
      'jawaban_unit', 'narasi', 'bukti', 'link_drive',
      'jawaban_tpi_unit', 'catatan_tpi_unit',
      'jawaban_tpi_itjen', 'catatan_tpi_itjen',
    ]
    const allowedAi      = ['ai_result.supervisi']
    const update: Record<string, any> = {}

    for (const key of allowedInput) {
      if (key in body) update[key] = body[key]
    }
    // Support update supervisi saja (untuk human review)
    if (body.supervisi !== undefined) {
      update['ai_result.supervisi'] = body.supervisi
    }

    const doc = await LkeJawaban.findOneAndUpdate(
      { submission_id: id, question_id: questionId },
      { $set: update },
      { new: true, upsert: true }
    ).lean()

    return NextResponse.json({ jawaban: doc })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
