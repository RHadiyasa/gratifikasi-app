import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeSubmission from '@/modules/models/LkeSubmission'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

async function getRole(): Promise<string | null> {
  try {
    const token = (await cookies()).get('token')?.value
    if (!token) return null
    const payload: any = jwt.verify(token, process.env.TOKEN_SECRET!)
    return payload.role ?? null
  } catch {
    return null
  }
}

// PATCH /api/zi/submissions/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole()
  if (!role || !['admin', 'zi'].includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    await connect()
    const { id } = await params
    const body = await req.json()
    const allowed = ['status', 'catatan', 'pic_unit', 'eselon2', 'target', 'total_data', 'checked_count', 'unchecked_count', 'progress_percent', 'last_checked_at']
    const update: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    if (update.target && !['WBK', 'WBBM'].includes(update.target)) {
      return NextResponse.json({ error: 'Target harus WBK atau WBBM' }, { status: 400 })
    }
    if ('checked_count' in update && 'total_data' in update) {
      update.progress_percent = update.total_data > 0
        ? Math.round((update.checked_count / update.total_data) * 100)
        : 0
    }
    const submission = await LkeSubmission.findByIdAndUpdate(id, update, { new: true }).lean()
    if (!submission) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ submission })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/zi/submissions/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang dapat menghapus' }, { status: 403 })
  }
  try {
    await connect()
    const { id } = await params
    await LkeSubmission.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
