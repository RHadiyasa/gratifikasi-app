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

// PATCH /api/zi/kriteria/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole()
  if (!hasPermission(role, 'zi:kriteria:manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    await connect()
    const { id } = await params
    const body = await req.json()
    const allowed = ['parent_question_id', 'sub_komponen', 'urutan', 'pertanyaan', 'standar_dokumen', 'kriteria_panrb', 'bobot', 'answer_type', 'is_computed', 'formula_tokens', 'formula_min', 'formula_max', 'aktif']
    const update: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    const doc = await LkeKriteria.findByIdAndUpdate(id, update, { new: true }).lean()
    if (!doc) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ kriteria: doc })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/zi/kriteria/[id] — soft delete
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole()
  if (!hasPermission(role, 'zi:kriteria:manage')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    await connect()
    const { id } = await params
    const doc = await LkeKriteria.findByIdAndUpdate(id, { aktif: false }, { new: true }).lean()
    if (!doc) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
