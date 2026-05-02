import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeSubmission from '@/modules/models/LkeSubmission'
import { SheetSyncValidationError, syncSheetToLkeJawaban, type SheetSyncMode } from '@/lib/zi/sheet-sync'

function normalizeMode(value: unknown): SheetSyncMode {
  return value === 'overwrite' ? 'overwrite' : 'missing_only'
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connect()
  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    const mode = normalizeMode(body?.mode)
    const sheetName = typeof body?.sheetName === 'string' ? body.sheetName : undefined

    await LkeSubmission.findByIdAndUpdate(id, { sync_status: 'syncing', sync_error: null })
    const sync = await syncSheetToLkeJawaban(id, { mode, sheetName })

    return NextResponse.json({ sync })
  } catch (err: any) {
    const message = err?.message ?? 'Gagal sync Google Sheet'
    await LkeSubmission.findByIdAndUpdate(id, { sync_status: 'error', sync_error: message })

    if (err instanceof SheetSyncValidationError) {
      return NextResponse.json({ error: message, sync: err.result }, { status: 422 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
