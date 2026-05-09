import LkeSubmission from '@/modules/models/LkeSubmission'
import LkeJawaban from '@/modules/models/LkeJawaban'
import LkeKriteria from '@/modules/models/LkeKriteria'
import { getGoogleAuth } from '@/lib/zi/google-auth'
import { extractSheetId, detectDataStart } from '@/lib/zi/helpers.js'
import { batchUpdateCells, readSheet } from '@/lib/zi/sheets.js'
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

export interface SheetItjenUpdateResult {
  sheetName: string
  dataStartRow: number
  updated: number
  updatedCells: number
  skipped: number
  validRows: number
  invalidRows: number
  unknownQuestionIds: number[]
  warnings: SheetSyncWarning[]
  columns: { jawaban: 'S'; catatan: 'V' }
  syncedAt: string
}

export interface SheetCompareMismatch {
  question_id: number
  rowNum: number
  pertanyaan: string
  differences: {
    source: 'unit' | 'tpiUnit' | 'tpiItjen'
    label: string
    column: 'K' | 'O' | 'S'
    app: string
    sheet: string
  }[]
}

export interface SheetCompareResult {
  sheetName: string
  dataStartRow: number
  comparedRows: number
  mismatchRows: number
  mismatchCells: number
  invalidRows: number
  unknownQuestionIds: number[]
  warnings: SheetSyncWarning[]
  columns: { unit: 'K'; tpiUnit: 'O'; tpiItjen: 'S' }
  mismatches: SheetCompareMismatch[]
  checkedAt: string
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

function normalizeDetailQuestion(value: unknown): string {
  return normalizeHeader(value).replace(/^[\s-]+/, '').trim()
}

function findMatchingJumlahChild(children: any[], questionText: string, fallbackIndex: number) {
  const label = normalizeDetailQuestion(questionText)
  if (label) {
    const matched = children.find((child) => normalizeDetailQuestion(child?.pertanyaan) === label)
    if (matched) return matched
  }
  return children[fallbackIndex]
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

function valuesDiffer(left: unknown, right: unknown): boolean {
  return String(left ?? '') !== String(right ?? '')
}

function sheetDisplayValuesDiffer(current: unknown, desiredDisplay: unknown): boolean {
  const desired = String(desiredDisplay ?? '')
  if (desired.endsWith('%')) {
    const currentNumeric = parseNumeric(current)
    const desiredNumeric = parseNumeric(desired)
    if (currentNumeric != null && desiredNumeric != null) {
      return round2(currentNumeric) !== round2(desiredNumeric)
    }
  }
  return valuesDiffer(current, desired)
}

function buildNonBlankSheetSet(existing: any, values: Record<string, any>) {
  const set: Record<string, any> = {}

  for (const field of SHEET_ANSWER_FIELDS) {
    if (!isBlank(values[field]) && valuesDiffer(existing?.[field], values[field])) {
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

function parseNumeric(value: unknown): number | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const normalized = raw
    .replace('%', '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function round2(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100
}

function evalTokensDetailed(tokens: any[], values: Record<number, number>) {
  if (!tokens?.length) return { value: 0, hasDivisionByZero: false }
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }
  const out: number[] = []
  const ops: string[] = []
  let hasDivisionByZero = false

  function applyOp(op: string) {
    const b = out.pop() ?? 0
    const a = out.pop() ?? 0
    if (op === '+') out.push(a + b)
    else if (op === '-') out.push(a - b)
    else if (op === '*') out.push(a * b)
    else if (op === '/') {
      if (b === 0) {
        hasDivisionByZero = true
        out.push(0)
      } else {
        out.push(a / b)
      }
    }
  }

  for (const token of tokens) {
    if (token.kind === 'operand') {
      out.push(values[token.ref] ?? 0)
    } else if (token.kind === 'op') {
      while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[token.op]) {
        applyOp(ops.pop()!)
      }
      ops.push(token.op)
    } else if (token.kind === 'open_paren') {
      ops.push('(')
    } else if (token.kind === 'close_paren') {
      while (ops.length && ops[ops.length - 1] !== '(') applyOp(ops.pop()!)
      ops.pop()
    }
  }
  while (ops.length) applyOp(ops.pop()!)
  return { value: out[0] ?? 0, hasDivisionByZero }
}

function evalTokens(tokens: any[], values: Record<number, number>) {
  return evalTokensDetailed(tokens, values).value
}

function getDecreaseFormulaRefs(tokens: any[] = []) {
  if (
    tokens.length === 7 &&
    tokens[0]?.kind === 'open_paren' &&
    tokens[1]?.kind === 'operand' &&
    tokens[2]?.kind === 'op' &&
    tokens[2]?.op === '-' &&
    tokens[3]?.kind === 'operand' &&
    tokens[4]?.kind === 'close_paren' &&
    tokens[5]?.kind === 'op' &&
    tokens[5]?.op === '/' &&
    tokens[6]?.kind === 'operand' &&
    Number(tokens[1]?.ref) === Number(tokens[6]?.ref)
  ) {
    return {
      previousRef: Number(tokens[1]?.ref),
      currentRef: Number(tokens[3]?.ref),
    }
  }

  return null
}

function computeSubItemValues(subItems: any[], jawabanById: Map<number, any>, field: string) {
  const byUrutan: Record<number, any> = {}
  for (const item of subItems) byUrutan[Number(item.urutan)] = item

  const visited = new Set<number>()
  const sorted: any[] = []
  function visit(urutan: number) {
    if (visited.has(urutan)) return
    visited.add(urutan)
    const item = byUrutan[urutan]
    if (item?.is_computed && item.formula_tokens?.length) {
      for (const token of item.formula_tokens) {
        if (token.kind === 'operand') visit(Number(token.ref))
      }
    }
    if (item) sorted.push(item)
  }
  for (const item of subItems) visit(Number(item.urutan))

  const values: Record<number, number> = {}
  for (const item of sorted) {
    if (item.is_computed && item.formula_tokens?.length) {
      values[Number(item.urutan)] = evalTokens(item.formula_tokens, values)
    } else {
      values[Number(item.urutan)] = parseNumeric(jawabanById.get(Number(item.question_id))?.[field]) ?? 0
    }
  }
  return values
}

function hasSubItemInput(subItems: any[], jawabanById: Map<number, any>, field: string) {
  return subItems.some((item) => !isBlank(jawabanById.get(Number(item.question_id))?.[field]))
}

function computePersenValue(kriteria: any, subItems: any[], jawabanById: Map<number, any>, field: string) {
  const direct = jawabanById.get(Number(kriteria.question_id))?.[field]
  if (!kriteria.formula_tokens?.length || !subItems.length || !hasSubItemInput(subItems, jawabanById, field)) {
    return parseNumeric(direct)
  }

  const values = computeSubItemValues(subItems, jawabanById, field)
  const min = kriteria.formula_min ?? 0
  const max = kriteria.formula_max ?? 100
  const result = evalTokensDetailed(kriteria.formula_tokens, values)
  if (result.hasDivisionByZero && kriteria.formula_zero_division_full_score) {
    const decreaseRefs = getDecreaseFormulaRefs(kriteria.formula_tokens)
    if (decreaseRefs) {
      const current = Number(values[decreaseRefs.currentRef] ?? 0)
      return current === 0 ? Math.min(max, Math.max(min, max)) : Math.min(max, Math.max(min, 0))
    }
    return Math.min(max, Math.max(min, max))
  }
  const raw = result.value * 100
  if (!Number.isFinite(raw)) return null
  return Math.min(max, Math.max(min, raw))
}

function formatSheetNumber(value: number) {
  return String(round2(value))
}

function getItjenSheetAnswer(kriteria: any, jawabanById: Map<number, any>, childrenByParent: Map<number, any[]>) {
  const qid = Number(kriteria.question_id)
  if (kriteria.answer_type === 'persen') {
    const persen = computePersenValue(kriteria, childrenByParent.get(qid) ?? [], jawabanById, 'jawaban_tpi_itjen')
    if (persen == null) return { display: '', value: '' }
    const rounded = round2(persen)
    return { display: `${rounded.toFixed(2)}%`, value: rounded / 100 }
  }

  if (kriteria.answer_type === 'jumlah' && kriteria.is_computed && kriteria.parent_question_id != null) {
    const siblings = childrenByParent.get(Number(kriteria.parent_question_id)) ?? []
    const values = computeSubItemValues(siblings, jawabanById, 'jawaban_tpi_itjen')
    const value = values[Number(kriteria.urutan)]
    if (!Number.isFinite(value)) return { display: '', value: '' }
    const display = formatSheetNumber(value)
    return { display, value: display }
  }

  const value = String(jawabanById.get(qid)?.jawaban_tpi_itjen ?? '')
  return { display: value, value }
}

function getSheetAnswerForField(
  kriteria: any,
  jawabanById: Map<number, any>,
  childrenByParent: Map<number, any[]>,
  field: string,
) {
  const qid = Number(kriteria.question_id)
  if (kriteria.answer_type === 'persen') {
    const persen = computePersenValue(kriteria, childrenByParent.get(qid) ?? [], jawabanById, field)
    return persen == null ? '' : `${round2(persen).toFixed(2)}%`
  }

  if (kriteria.answer_type === 'jumlah' && kriteria.is_computed && kriteria.parent_question_id != null) {
    const siblings = childrenByParent.get(Number(kriteria.parent_question_id)) ?? []
    const values = computeSubItemValues(siblings, jawabanById, field)
    const value = values[Number(kriteria.urutan)]
    return Number.isFinite(value) ? formatSheetNumber(value) : ''
  }

  return String(jawabanById.get(qid)?.[field] ?? '')
}

function normalizeComparableText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sheetValuesEqual(left: unknown, right: unknown): boolean {
  const leftText = normalizeComparableText(left)
  const rightText = normalizeComparableText(right)
  const leftNum = parseNumeric(leftText)
  const rightNum = parseNumeric(rightText)
  if (leftNum != null && rightNum != null) return round2(leftNum) === round2(rightNum)
  return leftText.toUpperCase() === rightText.toUpperCase()
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

function mapSheetRowsToCriteria(
  rows: any[][],
  dataStart: number,
  syncCols: ReturnType<typeof detectSheetSyncColumns>,
  criteriaMap: Map<number, any>,
  childrenByParent: Map<number, any[]>,
) {
  const seenSheetIds = new Set<string>()
  const seenTargetIds = new Set<number>()
  const unknownIds = new Set<number>()
  const warnings: SheetSyncWarning[] = []
  const mappedRows: { question_id: number; rowNum: number; row: any[]; sheet_question_id?: string }[] = []
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
    const isJumlahRow = isSheetJumlahRow(row, syncCols)
    const hasPayload = hasSheetAnswerPayload(row, syncCols)
    const hasMappableRow = !isBlank(answerTypeText) || isJumlahRow

    if (!hasMappableRow) {
      if (hasPayload) {
        warnings.push({
          rowNum,
          question_id: sheetQuestionId,
          message: `Baris ID ${sheetRowId} punya isi nilai/review tetapi tidak punya tipe jawaban, sehingga dianggap baris struktur dan dilewati`,
        })
      }
      continue
    }

    if (seenSheetIds.has(sheetRowId)) {
      warnings.push({ rowNum, question_id: sheetQuestionId, message: `ID ${sheetRowId} duplikat di sheet, baris ini dilewati` })
      continue
    }
    seenSheetIds.add(sheetRowId)

    const directCriteria = criteriaMap.get(sheetQuestionId)
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
      const mappedChild = findMatchingJumlahChild(children, questionText, currentDetailIndex)
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
      const mappedIndex = children.findIndex((child) => Number(child.question_id) === questionId)
      currentDetailIndex = mappedIndex >= 0
        ? Math.max(currentDetailIndex + 1, mappedIndex + 1)
        : currentDetailIndex + 1
    } else if (directCriteria && !hasSheetIdSuffix && isDetailKriteria(directCriteria)) {
      const parentQid = Number(directCriteria.parent_question_id)
      if (currentPersenParentQid !== parentQid) {
        warnings.push({
          rowNum,
          question_id: sheetQuestionId,
          message: `ID ${sheetRowId} adalah sub-detail parent ${parentQid}, tetapi baris sheet berada di luar blok parent tersebut; baris ini dilewati`,
        })
        continue
      }

      const siblings = childrenByParent.get(parentQid) ?? []
      const siblingIndex = siblings.findIndex((child) => Number(child.question_id) === sheetQuestionId)
      if (siblingIndex >= 0) currentDetailIndex = Math.max(currentDetailIndex, siblingIndex + 1)
    } else {
      unknownIds.add(sheetQuestionId)
      warnings.push({ rowNum, question_id: sheetQuestionId, message: `ID ${sheetRowId} tidak ada di master LkeKriteria` })
      continue
    }

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

    mappedRows.push({ question_id: questionId, rowNum, row, sheet_question_id: mappedFromSheetId })
  }

  return { mappedRows, invalidRows, unknownIds, warnings }
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

  const mapping = mapSheetRowsToCriteria(rows, dataStart, syncCols, criteriaMap, childrenByParent)
  const { mappedRows, invalidRows, unknownIds, warnings } = mapping
  const visaAiMap = await readVisaReviewAiMap(auth, spreadsheetId)
  const syncRows: { question_id: number; rowNum: number; values: Record<string, any>; sheet_question_id?: string }[] = []

  for (const { question_id: questionId, rowNum, row, sheet_question_id: mappedFromSheetId } of mappedRows) {
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
      const nonBlankSet = buildNonBlankSheetSet(existing, values)
      if (Object.keys(nonBlankSet).length === 0) continue

      ops.push({
        updateOne: {
          filter: { _id: existing._id },
          update: { $set: nonBlankSet },
        },
      })
      continue
    }

    const nonBlankSet = buildNonBlankSheetSet(null, values)
    if (Object.keys(nonBlankSet).length === 0) continue

    ops.push({
      updateOne: {
        filter: { submission_id: submissionId, question_id },
        update: {
          $setOnInsert: { submission_id: submissionId, question_id, ...nonBlankSet },
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

export async function updateItjenReviewToSheet(
  submissionId: string,
  options: Pick<SheetSyncOptions, 'sheetName'> = {},
): Promise<SheetItjenUpdateResult> {
  const sheetName = options.sheetName?.trim() || 'Jawaban'

  const submission = await LkeSubmission.findById(submissionId).lean() as any
  if (!submission) throw new Error('Submission tidak ditemukan')
  if (!submission.link) throw new Error('Submission ini tidak memiliki link Google Sheet')

  const kriteriaList = await LkeKriteria.find({ aktif: true }).lean() as any[]
  const criteriaMap = new Map<number, any>(kriteriaList.map((k) => [Number(k.question_id), k]))
  const childrenByParent = buildChildrenByParent(kriteriaList)

  const auth = getGoogleAuth()
  const spreadsheetId = extractSheetId(submission.link)
  const rows = await readSheet(auth, spreadsheetId, sheetName, 'A:V')
  const syncCols = detectSheetSyncColumns(rows)
  const dataStart = detectDataStart(rows)
  const dataStartRow = dataStart + 1
  const { mappedRows, invalidRows, unknownIds, warnings } = mapSheetRowsToCriteria(
    rows,
    dataStart,
    syncCols,
    criteriaMap,
    childrenByParent,
  )

  const minimumValidRows = Math.min(10, Math.max(1, Math.floor(criteriaMap.size * 0.1)))
  if (mappedRows.length < minimumValidRows) {
    throw new Error(`Format sheet mencurigakan: hanya ${mappedRows.length} ID yang cocok dengan master kriteria`)
  }

  const jawabanRows = await LkeJawaban.find({
    submission_id: submissionId,
    question_id: { $in: mappedRows.map((row) => row.question_id) },
  }).lean() as any[]
  const jawabanById = new Map<number, any>(jawabanRows.map((row) => [Number(row.question_id), row]))

  const updates: { row: number; col: number; value: string | number }[] = []
  const changedRows = new Set<number>()

  for (const mappedRow of mappedRows) {
    const kriteria = criteriaMap.get(mappedRow.question_id)
    if (!kriteria) continue

    const answer = getItjenSheetAnswer(kriteria, jawabanById, childrenByParent)
    const note = String(jawabanById.get(mappedRow.question_id)?.catatan_tpi_itjen ?? '')
    const currentAnswer = cell(mappedRow.row, COL.JAWABAN_TPI_ITJEN)
    const currentNote = cell(mappedRow.row, COL.CATATAN_TPI_ITJEN)

    if (sheetDisplayValuesDiffer(currentAnswer, answer.display)) {
      updates.push({ row: mappedRow.rowNum, col: COL.JAWABAN_TPI_ITJEN, value: answer.value })
      changedRows.add(mappedRow.rowNum)
    }
    if (valuesDiffer(currentNote, note)) {
      updates.push({ row: mappedRow.rowNum, col: COL.CATATAN_TPI_ITJEN, value: note })
      changedRows.add(mappedRow.rowNum)
    }
  }

  if (updates.length > 0) {
    await batchUpdateCells(auth, spreadsheetId, sheetName, updates)
  }

  const syncedAt = new Date()
  return {
    sheetName,
    dataStartRow,
    updated: changedRows.size,
    updatedCells: updates.length,
    skipped: Math.max(0, mappedRows.length - changedRows.size),
    validRows: mappedRows.length,
    invalidRows,
    unknownQuestionIds: Array.from(unknownIds).sort((a, b) => a - b),
    warnings,
    columns: { jawaban: 'S', catatan: 'V' },
    syncedAt: syncedAt.toISOString(),
  }
}

export async function compareAppAnswersWithSheet(
  submissionId: string,
  options: Pick<SheetSyncOptions, 'sheetName'> = {},
): Promise<SheetCompareResult> {
  const sheetName = options.sheetName?.trim() || 'Jawaban'

  const submission = await LkeSubmission.findById(submissionId).lean() as any
  if (!submission) throw new Error('Submission tidak ditemukan')
  if (!submission.link) throw new Error('Submission ini tidak memiliki link Google Sheet')

  const kriteriaList = await LkeKriteria.find({ aktif: true }).lean() as any[]
  const criteriaMap = new Map<number, any>(kriteriaList.map((k) => [Number(k.question_id), k]))
  const childrenByParent = buildChildrenByParent(kriteriaList)

  const auth = getGoogleAuth()
  const spreadsheetId = extractSheetId(submission.link)
  const rows = await readSheet(auth, spreadsheetId, sheetName, 'A:V')
  const syncCols = detectSheetSyncColumns(rows)
  const dataStart = detectDataStart(rows)
  const dataStartRow = dataStart + 1
  const { mappedRows, invalidRows, unknownIds, warnings } = mapSheetRowsToCriteria(
    rows,
    dataStart,
    syncCols,
    criteriaMap,
    childrenByParent,
  )

  const jawabanRows = await LkeJawaban.find({
    submission_id: submissionId,
    question_id: { $in: mappedRows.map((row) => row.question_id) },
  }).lean() as any[]
  const jawabanById = new Map<number, any>(jawabanRows.map((row) => [Number(row.question_id), row]))

  const sources = [
    { source: 'unit' as const, label: 'Unit', field: 'jawaban_unit', col: COL.JAWABAN_UNIT, column: 'K' as const },
    { source: 'tpiUnit' as const, label: 'TPI Unit', field: 'jawaban_tpi_unit', col: COL.JAWABAN_TPI_UNIT, column: 'O' as const },
    { source: 'tpiItjen' as const, label: 'TPI Itjen', field: 'jawaban_tpi_itjen', col: COL.JAWABAN_TPI_ITJEN, column: 'S' as const },
  ]
  const mismatches: SheetCompareMismatch[] = []

  for (const mappedRow of mappedRows) {
    const kriteria = criteriaMap.get(mappedRow.question_id)
    if (!kriteria) continue

    const differences: SheetCompareMismatch['differences'] = []
    for (const source of sources) {
      const appValue = getSheetAnswerForField(kriteria, jawabanById, childrenByParent, source.field)
      const sheetValue = cell(mappedRow.row, source.col)
      if (!sheetValuesEqual(appValue, sheetValue)) {
        differences.push({
          source: source.source,
          label: source.label,
          column: source.column,
          app: normalizeComparableText(appValue),
          sheet: normalizeComparableText(sheetValue),
        })
      }
    }

    if (differences.length > 0) {
      mismatches.push({
        question_id: mappedRow.question_id,
        rowNum: mappedRow.rowNum,
        pertanyaan: String(kriteria.pertanyaan ?? '').trim(),
        differences,
      })
    }
  }

  return {
    sheetName,
    dataStartRow,
    comparedRows: mappedRows.length,
    mismatchRows: mismatches.length,
    mismatchCells: mismatches.reduce((sum, row) => sum + row.differences.length, 0),
    invalidRows,
    unknownQuestionIds: Array.from(unknownIds).sort((a, b) => a - b),
    warnings,
    columns: { unit: 'K', tpiUnit: 'O', tpiItjen: 'S' },
    mismatches,
    checkedAt: new Date().toISOString(),
  }
}
