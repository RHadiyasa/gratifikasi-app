import LkeSubmission from '@/modules/models/LkeSubmission'
import LkeJawaban from '@/modules/models/LkeJawaban'
import LkeKriteria from '@/modules/models/LkeKriteria'
import { getGoogleAuth } from '@/lib/zi/google-auth'
import { extractSheetId, detectDataStart } from '@/lib/zi/helpers.js'
import { readSheet } from '@/lib/zi/sheets.js'
import { COL, VR_COL, VR_SHEET } from '@/lib/zi/constants.js'

export type SheetSyncMode = 'missing_only' | 'overwrite'

export interface SheetSyncOptions {
  mode?: SheetSyncMode
  sheetName?: string
}

export interface SheetSyncWarning {
  rowNum?: number
  question_id?: number
  message: string
}

export interface SheetSyncResult {
  mode: SheetSyncMode
  sheetName: string
  dataStartRow: number
  imported: number
  updated: number
  skipped: number
  validRows: number
  invalidRows: number
  unknownQuestionIds: number[]
  warnings: SheetSyncWarning[]
  syncedAt: string
  totalData: number
  checkedCount: number
  uncheckedCount: number
}

const SHEET_SYNC_COL = {
  ID: COL.ID,
  PERTANYAAN: 7,
  ANSWER_TYPE: 10,
  LINK_DRIVE: COL.LINK,
  BUKTI: COL.BUKTI,
  NARASI: COL.NARASI,
  JAWABAN_UNIT: COL.JAWABAN_UNIT,
  JAWABAN_TPI_UNIT: COL.JAWABAN_TPI_UNIT,
  CATATAN_TPI_UNIT: COL.CATATAN_TPI_UNIT,
  JAWABAN_TPI_ITJEN: COL.JAWABAN_TPI_ITJEN,
  CATATAN_TPI_ITJEN: COL.CATATAN_TPI_ITJEN,
}

const SHEET_ANSWER_FIELDS = [
  'jawaban_unit',
  'narasi',
  'bukti',
  'link_drive',
  'jawaban_tpi_unit',
  'catatan_tpi_unit',
  'jawaban_tpi_itjen',
  'catatan_tpi_itjen',
] as const

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function findHeaderColumn(rows: any[][], patterns: RegExp[], fallback: number): number {
  const headerRows = rows.slice(0, Math.min(rows.length, 5))
  for (const row of headerRows) {
    for (let idx = 0; idx < row.length; idx++) {
      const header = normalizeHeader(row[idx])
      if (!header) continue
      if (patterns.some((pattern) => pattern.test(header))) return idx + 1
    }
  }
  return fallback
}

function detectSheetSyncColumns(rows: any[][]) {
  return {
    ID: findHeaderColumn(rows, [/^id$/], SHEET_SYNC_COL.ID),
    PERTANYAAN: findHeaderColumn(rows, [/^penilaian$/, /pertanyaan/], SHEET_SYNC_COL.PERTANYAAN),
    ANSWER_TYPE: findHeaderColumn(rows, [/pilihan jawaban/, /tipe jawaban/], SHEET_SYNC_COL.ANSWER_TYPE),
    JAWABAN_UNIT: findHeaderColumn(rows, [/jawaban unit/], SHEET_SYNC_COL.JAWABAN_UNIT),
    NARASI: findHeaderColumn(rows, [/catatan.*keterangan.*penjelasan/, /penjelasan.*unit/, /narasi/], SHEET_SYNC_COL.NARASI),
    BUKTI: findHeaderColumn(rows, [/daftar bukti dukung/, /bukti dukung.*unit/, /nama dokumen/, /bukti/], SHEET_SYNC_COL.BUKTI),
    LINK_DRIVE: findHeaderColumn(rows, [/tautan bukti dukung/, /link google drive/, /link drive/, /tautan/], SHEET_SYNC_COL.LINK_DRIVE),
    JAWABAN_TPI_UNIT: findHeaderColumn(rows, [/jawaban tpi unit/], SHEET_SYNC_COL.JAWABAN_TPI_UNIT),
    CATATAN_TPI_UNIT: findHeaderColumn(rows, [/catatan tpi unit/, /keterangan tpi unit/], SHEET_SYNC_COL.CATATAN_TPI_UNIT),
    JAWABAN_TPI_ITJEN: findHeaderColumn(rows, [/jawaban tpi.*(kesdm|itjen|kementerian)/, /jawaban.*(kesdm|itjen|kementerian)/], SHEET_SYNC_COL.JAWABAN_TPI_ITJEN),
    CATATAN_TPI_ITJEN: findHeaderColumn(rows, [/catatan tpi.*(kesdm|itjen|kementerian)/, /catatan.*(kesdm|itjen|kementerian)/, /keterangan.*(kesdm|itjen|kementerian)/], SHEET_SYNC_COL.CATATAN_TPI_ITJEN),
  }
}

export class SheetSyncValidationError extends Error {
  result: Partial<SheetSyncResult>

  constructor(message: string, result: Partial<SheetSyncResult>) {
    super(message)
    this.name = 'SheetSyncValidationError'
    this.result = result
  }
}

function cell(row: any[], col: number): string {
  return String(row[col - 1] ?? '').trim()
}

function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === ''
}

function hasAiResult(value: any): boolean {
  return Boolean(value?.color || value?.status || value?.verdict || value?.checked_at)
}

function hasSheetAnswerPayload(row: any[], syncCols: ReturnType<typeof detectSheetSyncColumns>): boolean {
  return [
    syncCols.JAWABAN_UNIT,
    syncCols.NARASI,
    syncCols.BUKTI,
    syncCols.LINK_DRIVE,
    syncCols.JAWABAN_TPI_UNIT,
    syncCols.CATATAN_TPI_UNIT,
    syncCols.JAWABAN_TPI_ITJEN,
    syncCols.CATATAN_TPI_ITJEN,
  ].some((col) => !isBlank(cell(row, col)))
}

function isSheetJumlahRow(row: any[], syncCols: ReturnType<typeof detectSheetSyncColumns>): boolean {
  const answerType = normalizeHeader(cell(row, syncCols.ANSWER_TYPE))
  const questionText = cell(row, syncCols.PERTANYAAN)
  return answerType.includes('jumlah') || /^-\s*/.test(questionText)
}

function buildChildrenByParent(kriteriaList: any[]) {
  const childrenByParent = new Map<number, any[]>()
  for (const kriteria of kriteriaList) {
    if (!isDetailKriteria(kriteria)) continue
    const parentQid = Number(kriteria.parent_question_id)
    if (!childrenByParent.has(parentQid)) childrenByParent.set(parentQid, [])
    childrenByParent.get(parentQid)!.push(kriteria)
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0))
  }

  return childrenByParent
}

function buildMissingOnlySet(existing: any, values: Record<string, any>) {
  const set: Record<string, any> = {}

  for (const field of SHEET_ANSWER_FIELDS) {
    if (isBlank(existing?.[field]) && !isBlank(values[field])) {
      set[field] = values[field]
    }
  }

  if (values.ai_result && !hasAiResult(existing?.ai_result)) {
    set.ai_result = values.ai_result
  }

  return set
}

function isDetailKriteria(kriteria: any) {
  return kriteria?.answer_type === 'jumlah' && kriteria?.parent_question_id != null
}

function detectVerdictColor(result: string): 'HIJAU' | 'KUNING' | 'MERAH' | null {
  if (!result) return null
  if (/^\u2705/u.test(result)) return 'HIJAU'
  if (/^\u26A0\uFE0F?/u.test(result)) return 'KUNING'
  if (/^\u274C/u.test(result) || /^\u2757/u.test(result)) return 'MERAH'

  const lower = result.toLowerCase()
  if (lower.includes('sebagian')) return 'KUNING'
  if (lower.includes('tidak sesuai') || lower.includes('url tidak valid')) return 'MERAH'
  if (lower.includes('sesuai')) return 'HIJAU'
  return null
}

function parseCheckedAt(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function buildAiResult(row: any[]) {
  const result = cell(row, VR_COL.RESULT)
  const color = detectVerdictColor(result)
  if (!color) return null

  return {
    color,
    status: result || null,
    verdict: result || null,
    reviu: cell(row, VR_COL.REVIU) || null,
    fingerprint: cell(row, VR_COL.FINGERPRINT) || null,
    checked_at: parseCheckedAt(cell(row, VR_COL.TGL_CEK)),
    supervisi: cell(row, VR_COL.SUPERVISI) || 'Sudah Dicek AI',
  }
}

async function readVisaReviewAiMap(auth: any, spreadsheetId: string) {
  const map = new Map<number, any>()
  try {
    const rows = await readSheet(auth, spreadsheetId, VR_SHEET, 'A:K')
    for (let i = 1; i < rows.length; i++) {
      const id = Number(cell(rows[i], VR_COL.ID))
      if (!Number.isFinite(id)) continue
      const aiResult = buildAiResult(rows[i])
      if (aiResult) map.set(id, aiResult)
    }
  } catch {
    // Visa review is optional for sheet import. Missing sheet should not block answer sync.
  }
  return map
}

function buildValidationShell(mode: SheetSyncMode, sheetName: string, dataStartRow = 0): Partial<SheetSyncResult> {
  return {
    mode,
    sheetName,
    dataStartRow,
    imported: 0,
    updated: 0,
    skipped: 0,
    validRows: 0,
    invalidRows: 0,
    unknownQuestionIds: [],
    warnings: [],
    syncedAt: new Date().toISOString(),
    totalData: 0,
    checkedCount: 0,
    uncheckedCount: 0,
  }
}

export async function syncSheetToLkeJawaban(
  submissionId: string,
  options: SheetSyncOptions = {},
): Promise<SheetSyncResult> {
  const mode: SheetSyncMode = options.mode === 'overwrite' ? 'overwrite' : 'missing_only'
  const sheetName = options.sheetName?.trim() || 'Jawaban'

  const submission = await LkeSubmission.findById(submissionId).lean() as any
  if (!submission) throw new Error('Submission tidak ditemukan')
  if (!submission.link) throw new Error('Submission ini tidak memiliki link Google Sheet')

  const kriteriaList = await LkeKriteria.find({ aktif: true }).lean() as any[]
  const criteriaMap = new Map<number, any>(kriteriaList.map((k) => [Number(k.question_id), k]))
  const childrenByParent = buildChildrenByParent(kriteriaList)
  const primaryIds = new Set(
    kriteriaList
      .filter((k) => !isDetailKriteria(k))
      .map((k) => Number(k.question_id)),
  )
  const totalData = primaryIds.size

  const auth = getGoogleAuth()
  const spreadsheetId = extractSheetId(submission.link)
  const rows = await readSheet(auth, spreadsheetId, sheetName, 'A:V')
  const syncCols = detectSheetSyncColumns(rows)
  const dataStart = detectDataStart(rows)
  const dataStartRow = dataStart + 1
  const resultShell = buildValidationShell(mode, sheetName, dataStartRow)
  resultShell.totalData = totalData

  const visaAiMap = await readVisaReviewAiMap(auth, spreadsheetId)
  const seenSheetIds = new Set<string>()
  const seenTargetIds = new Set<number>()
  const unknownIds = new Set<number>()
  const warnings: SheetSyncWarning[] = []
  const syncRows: { question_id: number; rowNum: number; values: Record<string, any>; sheet_question_id?: string }[] = []
  let invalidRows = 0
  let currentPersenParentQid: number | null = null
  let currentDetailIndex = 0

  for (let idx = dataStart; idx < rows.length; idx++) {
    const row = rows[idx]
    const rowNum = idx + 1
    const rawId = cell(row, syncCols.ID)

    if (!rawId) continue
    const idMatch = rawId.match(/^(\d+)(?:-[A-Za-z]+)?$/)
    if (!idMatch || Number(idMatch[1]) > 9999) {
      invalidRows++
      warnings.push({ rowNum, message: `Baris ${rowNum}: question_id tidak valid (${rawId})` })
      continue
    }

    const sheetRowId = rawId.toUpperCase()
    const sheetQuestionId = Number(idMatch[1])
    const hasSheetIdSuffix = sheetRowId.includes('-')
    const questionText = cell(row, syncCols.PERTANYAAN)
    const answerTypeText = cell(row, syncCols.ANSWER_TYPE)
    const hasPayload = hasSheetAnswerPayload(row, syncCols)
    const hasMeaningfulRow = hasPayload || !isBlank(questionText) || !isBlank(answerTypeText)

    // Banyak template LKE memiliki baris struktur bernomor (contoh ID 2-5, 122-124)
    // tanpa pertanyaan/jawaban. Jangan sampai baris ini membuat jawaban kosong untuk
    // sub-detail internal aplikasi yang kebetulan memakai ID kecil.
    if (!hasMeaningfulRow) continue

    if (seenSheetIds.has(sheetRowId)) {
      warnings.push({ rowNum, question_id: sheetQuestionId, message: `ID ${sheetRowId} duplikat di sheet, baris ini dilewati` })
      continue
    }
    seenSheetIds.add(sheetRowId)

    const directCriteria = criteriaMap.get(sheetQuestionId)
    const isJumlahRow = isSheetJumlahRow(row, syncCols)
    let questionId = sheetQuestionId
    let mappedFromSheetId: string | undefined

    if (directCriteria && !hasSheetIdSuffix && !isDetailKriteria(directCriteria)) {
      const children = childrenByParent.get(sheetQuestionId) ?? []
      currentPersenParentQid = directCriteria.answer_type === 'persen' && children.length > 0
        ? sheetQuestionId
        : null
      currentDetailIndex = 0
    } else if (currentPersenParentQid != null && isJumlahRow) {
      const children = childrenByParent.get(currentPersenParentQid) ?? []
      const mappedChild = children[currentDetailIndex]
      if (!mappedChild) {
        warnings.push({
          rowNum,
          question_id: sheetQuestionId,
          message: `Baris jumlah ID ${sheetRowId} tidak punya pasangan sub-detail di parent ID ${currentPersenParentQid}`,
        })
        continue
      }

      questionId = Number(mappedChild.question_id)
      mappedFromSheetId = sheetRowId
      currentDetailIndex++
    } else if (directCriteria && !hasSheetIdSuffix && isDetailKriteria(directCriteria)) {
      const parentQid = Number(directCriteria.parent_question_id)
      if (currentPersenParentQid === parentQid) {
        const siblings = childrenByParent.get(parentQid) ?? []
        const siblingIndex = siblings.findIndex((child) => Number(child.question_id) === sheetQuestionId)
        if (siblingIndex >= 0) currentDetailIndex = Math.max(currentDetailIndex, siblingIndex + 1)
      }
    } else {
      unknownIds.add(sheetQuestionId)
      warnings.push({ rowNum, question_id: sheetQuestionId, message: `ID ${sheetRowId} tidak ada di master LkeKriteria` })
      continue
    }

    const linkDrive = cell(row, syncCols.LINK_DRIVE)
    if (linkDrive && !linkDrive.includes('drive.google')) {
      warnings.push({ rowNum, question_id: questionId, message: `Kolom link ID ${questionId} tidak terlihat seperti link Google Drive` })
    }

    const values: Record<string, any> = {
      jawaban_unit: cell(row, syncCols.JAWABAN_UNIT),
      narasi: cell(row, syncCols.NARASI),
      bukti: cell(row, syncCols.BUKTI),
      link_drive: linkDrive,
      jawaban_tpi_unit: cell(row, syncCols.JAWABAN_TPI_UNIT),
      catatan_tpi_unit: cell(row, syncCols.CATATAN_TPI_UNIT),
      jawaban_tpi_itjen: cell(row, syncCols.JAWABAN_TPI_ITJEN),
      catatan_tpi_itjen: cell(row, syncCols.CATATAN_TPI_ITJEN),
    }

    const aiResult = visaAiMap.get(questionId)
    if (aiResult) values.ai_result = aiResult

    if (seenTargetIds.has(questionId)) {
      warnings.push({
        rowNum,
        question_id: questionId,
        message: mappedFromSheetId
          ? `Baris sheet ID ${mappedFromSheetId} memetakan ke ID ${questionId} yang sudah diproses, baris ini dilewati`
          : `ID ${questionId} duplikat setelah mapping, baris ini dilewati`,
      })
      continue
    }
    seenTargetIds.add(questionId)

    syncRows.push({ question_id: questionId, rowNum, values, sheet_question_id: mappedFromSheetId })
  }

  const minimumValidRows = Math.min(10, Math.max(1, Math.floor(criteriaMap.size * 0.1)))
  if (syncRows.length < minimumValidRows) {
    throw new SheetSyncValidationError(
      `Format sheet mencurigakan: hanya ${syncRows.length} ID yang cocok dengan master kriteria`,
      {
        ...resultShell,
        validRows: syncRows.length,
        invalidRows,
        unknownQuestionIds: Array.from(unknownIds).sort((a, b) => a - b),
        warnings,
      },
    )
  }

  const existingMap = new Map<number, any>()
  if (mode === 'missing_only' && syncRows.length > 0) {
    const existingRows = await LkeJawaban.find({
      submission_id: submissionId,
      question_id: { $in: syncRows.map((row) => row.question_id) },
    }).lean() as any[]
    for (const row of existingRows) existingMap.set(Number(row.question_id), row)
  }

  const ops: any[] = []
  for (const { question_id, values } of syncRows) {
    if (mode === 'overwrite') {
      ops.push({
        updateOne: {
          filter: { submission_id: submissionId, question_id },
          update: {
            $set: values,
            $setOnInsert: { submission_id: submissionId, question_id },
          },
          upsert: true,
        },
      })
      continue
    }

    const existing = existingMap.get(question_id)
    if (existing) {
      const missingSet = buildMissingOnlySet(existing, values)
      if (Object.keys(missingSet).length === 0) continue

      ops.push({
        updateOne: {
          filter: { _id: existing._id },
          update: { $set: missingSet },
        },
      })
      continue
    }

    ops.push({
      updateOne: {
        filter: { submission_id: submissionId, question_id },
        update: {
          $setOnInsert: { submission_id: submissionId, question_id, ...values },
        },
        upsert: true,
      },
    })
  }

  const bulkResult = ops.length > 0 ? await LkeJawaban.bulkWrite(ops) : null
  const imported = bulkResult?.upsertedCount ?? 0
  const updated = bulkResult?.modifiedCount ?? 0
  const skipped = mode === 'missing_only'
    ? Math.max(0, syncRows.length - imported - updated)
    : 0

  const checkedCount = await LkeJawaban.countDocuments({
    submission_id: submissionId,
    question_id: { $in: Array.from(primaryIds) },
    'ai_result.color': { $exists: true, $ne: null },
  })
  const uncheckedCount = Math.max(0, totalData - checkedCount)
  const progressPercent = totalData > 0 ? Math.round((checkedCount / totalData) * 100) : 0
  const syncedAt = new Date()

  await LkeSubmission.findByIdAndUpdate(submissionId, {
    total_data: totalData,
    checked_count: checkedCount,
    unchecked_count: uncheckedCount,
    progress_percent: progressPercent,
    last_synced_at: syncedAt,
    sync_status: 'success',
    sync_error: null,
  })

  return {
    mode,
    sheetName,
    dataStartRow,
    imported,
    updated,
    skipped,
    validRows: syncRows.length,
    invalidRows,
    unknownQuestionIds: Array.from(unknownIds).sort((a, b) => a - b),
    warnings,
    syncedAt: syncedAt.toISOString(),
    totalData,
    checkedCount,
    uncheckedCount,
  }
}
