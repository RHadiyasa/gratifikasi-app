import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { connect } from '@/config/dbconfig'
import LkeKriteria from '@/modules/models/LkeKriteria'
import { hasPermission } from '@/lib/permissions'

async function getRole(): Promise<string | null> {
  try {
    const token = (await cookies()).get('token')?.value
    if (!token) return null
    const payload: any = jwt.verify(token, process.env.TOKEN_SECRET!)
    return payload.role ?? null
  } catch { return null }
}

// GET /api/zi/kriteria?komponen=mp&aktif=true
export async function GET(req: Request) {
  try {
    await connect()
    const { searchParams } = new URL(req.url)
    const komponen = searchParams.get('komponen')
    const aktif    = searchParams.get('aktif')

    const parentQid = searchParams.get('parent_question_id')

    const query: Record<string, any> = {}
    if (komponen) query.komponen = komponen
    if (aktif !== null) query.aktif = aktif !== 'false'
    if (parentQid !== null) query.parent_question_id = parseInt(parentQid)

    const kriteria = await LkeKriteria
      .find(query)
      .sort({ komponen: 1, urutan: 1 })
      .lean()

    const KOMPONEN_ORDER = ['mp', 'tt', 'sdm', 'ak', 'pw', 'pp', 'ipak', 'capaian_kinerja', 'prima']
    const grouped: Record<string, any[]> = {}
    for (const k of KOMPONEN_ORDER) grouped[k] = []
    for (const item of kriteria) {
      const k = item.komponen as string
      if (!grouped[k]) grouped[k] = []
      grouped[k].push(item)
    }

    return NextResponse.json({ kriteria, grouped })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/zi/kriteria
export async function POST(req: Request) {
  const role = await getRole()
  if (!hasPermission(role, 'zi:kriteria:manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    await connect()
    const body = await req.json()
    const {
      question_id, parent_question_id, komponen, seksi, sub_komponen, urutan,
      pertanyaan, standar_dokumen, kriteria_panrb, bobot, answer_type,
      is_computed, formula_tokens, formula_min, formula_max,
      formula_zero_division_full_score,
    } = body

    if (!komponen || bobot == null || !answer_type) {
      return NextResponse.json({ error: 'komponen, bobot, answer_type wajib diisi' }, { status: 400 })
    }

    // Auto-assign question_id jika tidak disertakan (sub-item jumlah)
    let resolvedQid = question_id ? Number(question_id) : null
    if (!resolvedQid) {
      const maxDoc = await LkeKriteria.findOne().sort({ question_id: -1 }).select('question_id').lean() as any
      resolvedQid = (maxDoc?.question_id ?? 0) + 1
    }

    const doc = await LkeKriteria.create({
      question_id:        resolvedQid,
      parent_question_id: parent_question_id ?? null,
      komponen,
      seksi:          seksi || 'pemenuhan',
      sub_komponen:   sub_komponen || '',
      urutan:         urutan ?? 0,
      pertanyaan:     pertanyaan || '',
      standar_dokumen: standar_dokumen || '',
      kriteria_panrb:  kriteria_panrb || '',
      bobot,
      answer_type,
      is_computed:    is_computed ?? false,
      formula_tokens: formula_tokens ?? null,
      formula_min:    formula_min ?? 0,
      formula_max:    formula_max ?? 100,
      formula_zero_division_full_score: formula_zero_division_full_score ?? false,
    })
    return NextResponse.json({ kriteria: doc }, { status: 201 })
  } catch (err: any) {
    if (err.code === 11000) return NextResponse.json({ error: 'question_id sudah ada' }, { status: 409 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
