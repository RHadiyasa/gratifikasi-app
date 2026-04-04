import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeSubmission from '@/modules/models/LkeSubmission'

export async function GET(req: Request) {
  try {
    await connect()
    const { searchParams } = new URL(req.url)
    const idsParam = searchParams.get('ids') || ''
    const ids = idsParam.split(',').filter(Boolean).slice(0, 4)

    if (ids.length === 0) return NextResponse.json({ error: 'Minimal 1 ID' }, { status: 400 })

    const submissions = await LkeSubmission.find({ _id: { $in: ids } }).lean()
    return NextResponse.json({ submissions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
