'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { hasPermission } from '@/lib/permissions'
import {
  ArrowLeft, Save, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ChevronDown, ChevronUp, ChevronRight, RefreshCw, ExternalLink,
} from 'lucide-react'
import type { LkeJawaban, LkeKriteria, FormulaToken } from '@/types/zi'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GroupedEntry {
  kriteria: LkeKriteria
  jawaban:  LkeJawaban | null
}

interface SeksiGroup {
  seksi:       'pemenuhan' | 'reform' | 'hasil'
  label:       string
  subKomponen: Record<string, GroupedEntry[]>
}

interface GroupedKomponen {
  key:         string
  komponen:    string
  label:       string
  seksiGroups: SeksiGroup[]
  total:       number
  filled:      number
  minId:       number
}

interface SheetSyncSummary {
  mode:               'missing_only' | 'overwrite'
  imported:           number
  updated:            number
  skipped:            number
  validRows:          number
  invalidRows:        number
  unknownQuestionIds: number[]
  warnings:           { message: string }[]
  syncedAt:           string
  totalData:          number
  checkedCount:       number
  uncheckedCount:     number
}

type LocalJawaban = {
  jawaban_unit:      string
  narasi:            string
  bukti:             string
  link_drive:        string
  jawaban_tpi_unit:  string
  catatan_tpi_unit:  string
  jawaban_tpi_itjen: string
  catatan_tpi_itjen: string
}

type PersenValueField = 'jawaban_unit' | 'jawaban_tpi_unit' | 'jawaban_tpi_itjen'
type DetailNoteField = 'narasi' | 'catatan_tpi_unit' | 'catatan_tpi_itjen'
type RecapSource = 'unit' | 'tpiUnit' | 'tpiItjen' | 'final'
type TargetValue = 'WBK' | 'WBBM'

interface RecapRow {
  key:        string
  label:      string
  bobot:      number
  pemenuhan:  number
  reform:     number
  nilai:      number
  persen:     number
  status:     'OK' | 'Tidak Lulus'
}

interface RecapHasilRow {
  key:    string
  label:  string
  bobot:  number
  nilai:  number
  persen: number
  status: 'OK' | 'Tidak Lulus'
}

interface RecapTotal {
  nilai:      number
  persen:     number
  status:     'OK' | 'Tidak Lulus'
  pemenuhan?: number
  reform?:    number
}

interface RecapVersion {
  source:          RecapSource
  label:           string
  tone:            string
  pengungkitRows:  RecapRow[]
  pengungkitTotal: RecapTotal
  hasilRows:       RecapHasilRow[]
  hasilTotal:      RecapTotal
  nilaiAkhir:      number
  targetTercapai:  boolean
}

interface RecapBundle {
  target:    TargetValue
  threshold: number
  unit:      RecapVersion
  tpiUnit:   RecapVersion
  tpiItjen:  RecapVersion
  final:     RecapVersion
}

// ── Constants ──────────────────────────────────────────────────────────────────

const KOMPONEN_ORDER = ['mp','tt','sdm','ak','pw','pp','ipak','capaian_kinerja','prima']
const SEKSI_ORDER: ('pemenuhan' | 'reform' | 'hasil')[] = ['pemenuhan', 'reform', 'hasil']
const SEKSI_LABEL: Record<string, string> = {
  pemenuhan: 'Pengungkit - Pemenuhan',
  reform:    'Pengungkit - Reform',
  hasil:     'Hasil',
}
const KOMPONEN_LABEL: Record<string, string> = {
  mp:              'Manajemen Perubahan',
  tt:              'Penataan Tatalaksana',
  sdm:             'Penataan SDM',
  ak:              'Penguatan Akuntabilitas',
  pw:              'Penguatan Pengawasan',
  pp:              'Peningkatan Pelayanan',
  ipak:            'Nilai Survey Persepsi Korupsi (IPAK)',
  capaian_kinerja: 'Capaian Kinerja Lebih Baik',
  prima:           'Nilai Persepsi Kualitas Pelayanan (IPKP)',
}

const ANSWER_OPTIONS: Partial<Record<LkeKriteria['answer_type'], { value: string; label: string }[]>> = {
  ya_tidak: [
    { value: 'Ya',    label: 'Ya' },
    { value: 'Tidak', label: 'Tidak' },
  ],
  abc: [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
  ],
  abcd: [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
  ],
  abcde: [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
    { value: 'E', label: 'E' },
  ],
  // persen dan jumlah: tidak punya pilihan tetap — pakai input numerik
}

const AI_COLOR_CLS: Record<string, string> = {
  HIJAU:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  KUNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  MERAH:  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

const PERSEN_VALUE_FIELDS: PersenValueField[] = ['jawaban_unit', 'jawaban_tpi_unit', 'jawaban_tpi_itjen']

const SOURCE_VALUE_FIELD: Record<Exclude<RecapSource, 'final'>, PersenValueField> = {
  unit:      'jawaban_unit',
  tpiUnit:   'jawaban_tpi_unit',
  tpiItjen:  'jawaban_tpi_itjen',
}

const SOURCE_LABEL: Record<RecapSource, string> = {
  unit:     'Unit',
  tpiUnit:  'TPI Unit',
  tpiItjen: 'TPI Itjen',
  final:    'Final',
}

const SOURCE_TONE: Record<RecapSource, string> = {
  unit:     'border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/20 dark:text-blue-200',
  tpiUnit:  'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200',
  tpiItjen: 'border-violet-200 bg-violet-50/70 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/20 dark:text-violet-200',
  final:    'border-slate-300 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-100 dark:text-slate-950',
}

const TARGET_THRESHOLD: Record<TargetValue, number> = {
  WBK:  60,
  WBBM: 75,
}

const RECAP_PASSING_PERCENT = 60
const MAX_PEMENUHAN = 30
const MAX_REFORM = 30
const MAX_PENGUNGKIT = 60
const MAX_HASIL = 40

const RECAP_MAX_BOBOT: Record<LkeKriteria['komponen'], number> = {
  mp:              8,
  tt:              7,
  sdm:             10,
  ak:              10,
  pw:              15,
  pp:              10,
  ipak:            17.5,
  capaian_kinerja: 5,
  prima:           17.5,
}

const PENGUNGKIT_KEYS: LkeKriteria['komponen'][] = ['mp', 'tt', 'sdm', 'ak', 'pw', 'pp']
const HASIL_KEYS: LkeKriteria['komponen'][] = ['ipak', 'capaian_kinerja', 'prima']
const REFORM_ID_MIN = 123
const REFORM_ID_MAX = 194

const defaultLocal = (): LocalJawaban => ({
  jawaban_unit:      '',
  narasi:            '',
  bukti:             '',
  link_drive:        '',
  jawaban_tpi_unit:  '',
  catatan_tpi_unit:  '',
  jawaban_tpi_itjen: '',
  catatan_tpi_itjen: '',
})

function isDetailKriteria(kriteria: LkeKriteria) {
  return kriteria.answer_type === 'jumlah' && kriteria.parent_question_id != null
}

function getEffectiveSeksi(kriteria: LkeKriteria): 'pemenuhan' | 'reform' | 'hasil' {
  if (HASIL_KEYS.includes(kriteria.komponen)) return 'hasil'
  const sectionQuestionId = kriteria.parent_question_id ?? kriteria.question_id
  if (sectionQuestionId >= REFORM_ID_MIN && sectionQuestionId <= REFORM_ID_MAX) return 'reform'
  if (kriteria.seksi === 'reform') return 'reform'
  if (kriteria.seksi === 'hasil') return 'hasil'
  return 'pemenuhan'
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Belum pernah sync'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('id-ID')
}

function hasText(value?: string | null) {
  return String(value ?? '').trim() !== ''
}

function getVisaJawaban(aiResult?: LkeJawaban['ai_result'] | null) {
  if (!aiResult?.color && !aiResult?.status && !aiResult?.verdict) return 'Belum ada jawaban Visa'
  if (aiResult?.color === 'HIJAU') return 'Sesuai'
  if (aiResult?.color === 'KUNING') return 'Sebagian Sesuai'
  if (aiResult?.color === 'MERAH') return 'Tidak Sesuai'
  return aiResult.status || aiResult.verdict || 'Belum ada jawaban Visa'
}

function getVisaCatatan(aiResult?: LkeJawaban['ai_result'] | null) {
  return aiResult?.reviu || aiResult?.pendapat || aiResult?.verdict || aiResult?.status || ''
}

function getReviewStatus(localValues: LocalJawaban, jumlahSubItems?: JumlahSubItem[]) {
  const unitFilled =
    hasText(localValues.jawaban_unit) ||
    hasText(localValues.narasi) ||
    hasText(localValues.bukti) ||
    hasText(localValues.link_drive) ||
    jumlahSubItems?.some((s) => hasText(s.localValues.jawaban_unit) || hasText(s.localValues.narasi))

  const tpiUnitFilled =
    hasText(localValues.jawaban_tpi_unit) ||
    hasText(localValues.catatan_tpi_unit) ||
    jumlahSubItems?.some((s) => hasText(s.localValues.jawaban_tpi_unit) || hasText(s.localValues.catatan_tpi_unit))

  const tpiItjenFilled =
    hasText(localValues.jawaban_tpi_itjen) ||
    hasText(localValues.catatan_tpi_itjen) ||
    jumlahSubItems?.some((s) => hasText(s.localValues.jawaban_tpi_itjen) || hasText(s.localValues.catatan_tpi_itjen))

  if (tpiItjenFilled) {
    return {
      label: 'Sudah review Itjen',
      card:  'border-violet-300/70 bg-violet-50/20 dark:border-violet-800/60 dark:bg-violet-950/10',
      badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    }
  }
  if (tpiUnitFilled) {
    return {
      label: 'Sudah review TPI Unit',
      card:  'border-amber-300/70 bg-amber-50/20 dark:border-amber-800/60 dark:bg-amber-950/10',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    }
  }
  if (unitFilled) {
    return {
      label: 'Baru pengisian unit',
      card:  'border-blue-300/70 bg-blue-50/20 dark:border-blue-800/60 dark:bg-blue-950/10',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    }
  }
  return {
    label: 'Belum diisi',
    card:  'border-default-200 bg-content1',
    badge: 'bg-default-100 text-default-500',
  }
}

// ── AnswerSelect ───────────────────────────────────────────────────────────────

function AnswerSelect({
  answerType, value, onChange, disabled, computedPersen,
}: {
  answerType:     LkeKriteria['answer_type']
  value:          string
  onChange:       (v: string) => void
  disabled?:      boolean
  computedPersen?: number | null
}) {
  // Tipe jumlah: input angka (count)
  if (answerType === 'jumlah') {
    return (
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="0"
        className="w-full px-2 py-1.5 text-xs rounded border border-default-200 bg-content1 focus:outline-none focus:border-primary disabled:opacity-50"
      />
    )
  }

  if (answerType === 'nilai_04') {
    return (
      <input
        type="number"
        min="0"
        max="4"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="0.00 - 4.00"
        className="w-full px-2 py-1.5 text-xs rounded border border-default-200 bg-content1 focus:outline-none focus:border-primary disabled:opacity-50"
      />
    )
  }

  // Tipe persen: tampilkan kalkulasi otomatis dari sub-item jumlah jika tersedia,
  // atau input manual jika tidak ada sub-item
  if (answerType === 'persen') {
    if (computedPersen != null) {
      return (
        <div className="w-full px-2 py-1.5 text-xs rounded border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-blue-900/20 font-mono font-semibold text-blue-700 dark:text-blue-300">
          {computedPersen.toFixed(2)}%
          <span className="ml-1 text-[9px] font-normal text-blue-500">auto</span>
        </div>
      )
    }
    return (
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="0.00"
        className="w-full px-2 py-1.5 text-xs rounded border border-default-200 bg-content1 focus:outline-none focus:border-primary disabled:opacity-50"
      />
    )
  }

  const options = ANSWER_OPTIONS[answerType]
  if (!options?.length) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Nilai..."
        className="w-full px-2 py-1.5 text-xs rounded border border-default-200 bg-content1 focus:outline-none focus:border-primary disabled:opacity-50"
      />
    )
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-2 py-1.5 text-xs rounded border border-default-200 bg-content1 focus:outline-none focus:border-primary disabled:opacity-50"
    >
      <option value="">— pilih —</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ── JawabanCard ────────────────────────────────────────────────────────────────

interface JumlahSubItem {
  entry:       GroupedEntry
  localValues: LocalJawaban
  saving:      boolean
}

type DetailTone = 'blue' | 'amber' | 'violet'

const DETAIL_TONE_CLS: Record<DetailTone, {
  wrap: string
  title: string
  row: string
  badge: string
  input: string
  textarea: string
  computed: string
  spinner: string
  footer: string
  formula: string
  result: string
  auto: string
}> = {
  blue: {
    wrap:     'border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20',
    title:    'text-blue-600 dark:text-blue-400',
    row:      'border-blue-100 dark:border-blue-900/40 bg-white/70 dark:bg-content1/50',
    badge:    'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    input:    'border-blue-200 dark:border-blue-700/40 bg-white dark:bg-content1 focus:border-blue-400',
    textarea: 'border-blue-200 dark:border-blue-700/40 bg-white dark:bg-content1 focus:border-blue-400',
    computed: 'border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    spinner:  'text-blue-400',
    footer:   'border-blue-100 dark:border-blue-900/40',
    formula:  'text-blue-600 dark:text-blue-400',
    result:   'border-blue-300 dark:border-blue-600 bg-white dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    auto:     'text-blue-400',
  },
  amber: {
    wrap:     'border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20',
    title:    'text-amber-600 dark:text-amber-400',
    row:      'border-amber-100 dark:border-amber-900/40 bg-white/70 dark:bg-content1/50',
    badge:    'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    input:    'border-amber-200 dark:border-amber-700/40 bg-white dark:bg-content1 focus:border-amber-400',
    textarea: 'border-amber-200 dark:border-amber-700/40 bg-white dark:bg-content1 focus:border-amber-400',
    computed: 'border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    spinner:  'text-amber-400',
    footer:   'border-amber-100 dark:border-amber-900/40',
    formula:  'text-amber-600 dark:text-amber-400',
    result:   'border-amber-300 dark:border-amber-600 bg-white dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    auto:     'text-amber-400',
  },
  violet: {
    wrap:     'border-violet-100 dark:border-violet-900/40 bg-violet-50/40 dark:bg-violet-950/20',
    title:    'text-violet-600 dark:text-violet-400',
    row:      'border-violet-100 dark:border-violet-900/40 bg-white/70 dark:bg-content1/50',
    badge:    'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
    input:    'border-violet-200 dark:border-violet-700/40 bg-white dark:bg-content1 focus:border-violet-400',
    textarea: 'border-violet-200 dark:border-violet-700/40 bg-white dark:bg-content1 focus:border-violet-400',
    computed: 'border-violet-200 dark:border-violet-700/40 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300',
    spinner:  'text-violet-400',
    footer:   'border-violet-100 dark:border-violet-900/40',
    formula:  'text-violet-600 dark:text-violet-400',
    result:   'border-violet-300 dark:border-violet-600 bg-white dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    auto:     'text-violet-400',
  },
}

function PersenDetailBlock({
  title,
  tone,
  parentKriteria,
  jumlahSubItems,
  valueField,
  noteField,
  computedPersen,
  onChange,
  disabled,
}: {
  title:          string
  tone:           DetailTone
  parentKriteria: LkeKriteria
  jumlahSubItems: JumlahSubItem[]
  valueField:     PersenValueField
  noteField:      DetailNoteField
  computedPersen: number | null
  onChange:       (qid: number, field: keyof LocalJawaban, value: string) => void
  disabled?:      boolean
}) {
  if (jumlahSubItems.length === 0) return null

  const toneCls = DETAIL_TONE_CLS[tone]
  const subKriterias = jumlahSubItems.map((si) => si.entry.kriteria)
  const subLocalData = Object.fromEntries(
    jumlahSubItems.map((si) => [si.entry.kriteria.question_id, si.localValues])
  ) as Record<number, LocalJawaban>
  const subValues = computeSubItemValues(subKriterias, subLocalData, valueField)

  return (
    <div className={`mb-3 space-y-1.5 rounded-lg border px-3 py-2.5 ${toneCls.wrap}`}>
      <p className={`text-[10px] font-semibold mb-2 uppercase tracking-wide ${toneCls.title}`}>
        {title}
      </p>
      {jumlahSubItems.map(({ entry: je, localValues: jlv, saving: js }, idx) => {
        const jqid      = je.kriteria.question_id
        const letter    = String.fromCharCode(65 + idx)
        const isComputed = je.kriteria.is_computed && je.kriteria.formula_tokens?.length
        const computedVal = isComputed ? subValues[je.kriteria.urutan] : null

        return (
          <div
            key={jqid}
            className={`grid grid-cols-1 gap-2 rounded-lg border p-2 sm:grid-cols-[auto_5.5rem_minmax(0,1fr)] lg:grid-cols-[auto_5.5rem_minmax(0,1fr)_minmax(18rem,26rem)] sm:items-start ${toneCls.row}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold shrink-0 ${toneCls.badge}`}>
              {letter}
            </span>
            <div className="w-full">
              {isComputed ? (
                <div className={`px-2 py-1.5 text-xs rounded border font-mono text-center ${toneCls.computed}`}>
                  {computedVal?.toFixed(2) ?? '--'}
                  {js && <Loader2 size={9} className="inline ml-1 animate-spin" />}
                </div>
              ) : (
                <div className="relative">
                  {js && <Loader2 size={9} className={`absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin ${toneCls.spinner}`} />}
                  <input
                    type="number"
                    min="0"
                    value={jlv[valueField]}
                    onChange={(e) => onChange(jqid, valueField, e.target.value)}
                    disabled={disabled}
                    placeholder="0"
                    className={`w-full px-2 py-1.5 text-xs rounded border focus:outline-none ${toneCls.input}`}
                  />
                </div>
              )}
            </div>
            <p className="text-[11px] text-default-700 leading-relaxed break-words">
              {je.kriteria.pertanyaan || ('Sub-item ' + (idx + 1))}
              {isComputed && (
                <span className={`ml-1 text-[8px] italic ${toneCls.auto}`}>auto</span>
              )}
            </p>
            {!isComputed && (
              <textarea
                value={jlv[noteField]}
                onChange={(e) => onChange(jqid, noteField, e.target.value)}
                disabled={disabled}
                placeholder="Keterangan detail perhitungan (opsional)"
                rows={2}
                className={`w-full min-h-[42px] px-2 py-1.5 text-[10px] leading-relaxed rounded border focus:outline-none text-default-600 resize-y sm:col-start-3 lg:col-start-auto ${toneCls.textarea}`}
              />
            )}
          </div>
        )
      })}
      {computedPersen != null && (
        <div className={`flex items-center justify-end gap-2 pt-2 mt-1 border-t ${toneCls.footer}`}>
          <span className={`text-[10px] font-mono ${toneCls.formula}`}>
            {formatFormulaTokens(parentKriteria.formula_tokens)}
          </span>
          <div className={`px-3 py-1 rounded border font-mono font-bold text-sm ${toneCls.result}`}>
            {computedPersen.toFixed(2)}%
            <span className={`ml-1 text-[9px] font-normal ${toneCls.auto}`}>auto</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface JawabanCardProps {
  entry:          GroupedEntry
  onChange:       (qid: number, field: keyof LocalJawaban, value: string) => void
  onSave:         (ids: number[]) => void
  localValues:    LocalJawaban
  saving:         boolean
  computedPersen: number | null
  computedTpiUnitPersen: number | null
  computedTpiItjenPersen: number | null
  jumlahSubItems?: JumlahSubItem[]
  hasPending?:    boolean
  canEditUnit:    boolean
  canEditTpiUnit: boolean
  canEditTpiItjen:boolean
  canOpenDriveLink: boolean
}

function JawabanCard({
  entry,
  onChange,
  onSave,
  localValues,
  saving,
  computedPersen,
  computedTpiUnitPersen,
  computedTpiItjenPersen,
  jumlahSubItems,
  hasPending,
  canEditUnit,
  canEditTpiUnit,
  canEditTpiItjen,
  canOpenDriveLink,
}: JawabanCardProps) {
  const { kriteria, jawaban } = entry
  const qid       = kriteria.question_id
  const aiResult  = jawaban?.ai_result
  const [cardOpen,     setCardOpen]     = useState(true)
  const [tpiUnitOpen,  setTpiUnitOpen]  = useState(false)
  const [tpiItjenOpen, setTpiItjenOpen] = useState(false)
  const relatedIds = [qid, ...(jumlahSubItems?.map((s) => s.entry.kriteria.question_id) ?? [])]
  const reviewStatus = getReviewStatus(localValues, jumlahSubItems)
  const canSave = canEditUnit || canEditTpiUnit || canEditTpiItjen

  const hasTpiUnit  = !!(
    localValues.jawaban_tpi_unit ||
    localValues.catatan_tpi_unit ||
    jumlahSubItems?.some((s) => s.localValues.jawaban_tpi_unit || s.localValues.catatan_tpi_unit)
  )
  const hasTpiItjen = !!(
    localValues.jawaban_tpi_itjen ||
    localValues.catatan_tpi_itjen ||
    jumlahSubItems?.some((s) => s.localValues.jawaban_tpi_itjen || s.localValues.catatan_tpi_itjen)
  )

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${reviewStatus.card}`}>
      {/* Header: ID + pertanyaan + status */}
      <div className="flex items-start gap-3 px-4 py-3 bg-default-50/50 border-b border-default-100">
        <span className="font-mono text-xs text-default-400 shrink-0 mt-0.5 w-7 text-right">{qid}</span>
        <p className="flex-1 text-xs text-default-700 leading-relaxed">{kriteria.pertanyaan || '—'}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${reviewStatus.badge}`}>
            {reviewStatus.label}
          </span>
          {saving && <Loader2 size={11} className="animate-spin text-default-400" />}
          {hasPending && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
              Belum disimpan
            </span>
          )}
          {canSave && (
            <button
              type="button"
              onClick={() => onSave(relatedIds)}
              disabled={saving}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
              Simpan
            </button>
          )}
          {aiResult?.color && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${AI_COLOR_CLS[aiResult.color]}`}>
              AI: {aiResult.color === 'HIJAU' ? '✓ Sesuai' : aiResult.color === 'KUNING' ? '~ Sebagian' : '✗ Tidak'}
            </span>
          )}
          <span className="text-[10px] text-default-400 bg-default-100 px-1.5 py-0.5 rounded">
            {kriteria.answer_type?.replace('_', '/')}
          </span>
          <button
            type="button"
            onClick={() => setCardOpen((v) => !v)}
            className="p-1 rounded text-default-400 hover:bg-default-100 hover:text-default-600"
            aria-label={cardOpen ? 'Ciutkan data' : 'Buka data'}
          >
            {cardOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {cardOpen && (
      <div className="divide-y divide-default-100">

        {/* ── Seksi 1: Pengisian Unit ── */}
        <div className="px-4 py-3 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Pengisian Unit
          </p>
          {/* ── Sub-item Jumlah (inline, hanya untuk persen yang punya jumlah children) ── */}
          {jumlahSubItems && jumlahSubItems.length > 0 && (
            <PersenDetailBlock
              title="Detail Perhitungan"
              tone="blue"
              parentKriteria={kriteria}
              jumlahSubItems={jumlahSubItems}
              valueField="jawaban_unit"
              noteField="narasi"
              computedPersen={computedPersen}
              onChange={onChange}
              disabled={!canEditUnit}
            />
          )}

          <div className="grid grid-cols-12 gap-2">
            {/* Jawaban Mandiri — untuk persen dengan jumlah sub-items, tampilkan computed result */}
            <div className="col-span-2">
              <span className="block text-[10px] text-default-500 mb-1">
                {kriteria.answer_type === 'jumlah' ? 'Jumlah' : 'Jawaban Mandiri'}
              </span>
              <AnswerSelect
                answerType={kriteria.answer_type}
                value={localValues.jawaban_unit}
                onChange={(v) => onChange(qid, 'jawaban_unit', v)}
                computedPersen={computedPersen}
                disabled={!canEditUnit}
              />
            </div>
            {/* Narasi */}
            <div className="col-span-4">
              <span className="block text-[10px] text-default-500 mb-1">
                {kriteria.answer_type === 'jumlah' ? 'Keterangan tambahan (opsional)' : 'Narasi / Penjelasan'}
              </span>
              <textarea
                aria-label={kriteria.answer_type === 'jumlah' ? 'Keterangan tambahan unit' : 'Narasi atau penjelasan unit'}
                value={localValues.narasi}
                onChange={(e) => onChange(qid, 'narasi', e.target.value)}
                disabled={!canEditUnit}
                placeholder="Uraian singkat kondisi unit..."
                rows={2}
                className="w-full px-2 py-1.5 text-xs rounded border border-default-200 bg-content1 focus:outline-none focus:border-primary resize-y"
              />
            </div>
            {/* Bukti */}
            <div className="col-span-3">
              <span className="block text-[10px] text-default-500 mb-1">Nama Dokumen / Bukti</span>
              <textarea
                aria-label="Nama dokumen atau bukti"
                value={localValues.bukti}
                onChange={(e) => onChange(qid, 'bukti', e.target.value)}
                disabled={!canEditUnit}
                placeholder="Nama file atau dokumen..."
                rows={2}
                className="w-full px-2 py-1.5 text-xs rounded border border-default-200 bg-content1 focus:outline-none focus:border-primary resize-y"
              />
            </div>
            {/* Link Drive */}
            <div className="col-span-3">
              <span className="block text-[10px] text-default-500 mb-1">Link Google Drive</span>
              <input
                aria-label="Link Google Drive"
                value={localValues.link_drive}
                onChange={(e) => onChange(qid, 'link_drive', e.target.value)}
                disabled={!canEditUnit}
                placeholder="https://drive.google.com/..."
                className="w-full px-2 py-1.5 text-xs rounded border border-default-200 bg-content1 focus:outline-none focus:border-primary"
              />
              {canOpenDriveLink && (
                <button
                  type="button"
                  onClick={() => window.open(localValues.link_drive, '_blank', 'noopener,noreferrer')}
                  disabled={!localValues.link_drive?.trim()}
                  className="mt-2 inline-flex items-center gap-1 rounded border border-blue-200 px-2 py-1 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-700/40 dark:text-blue-300 dark:hover:bg-blue-950/20"
                >
                  <ExternalLink size={10} />
                  Buka Link Drive Unit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Seksi 2: Review TPI Unit ── */}
        <div>
          <button
            onClick={() => setTpiUnitOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors text-left"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              Review TPI Unit
              {hasTpiUnit && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </span>
            {tpiUnitOpen
              ? <ChevronUp size={11} className="text-default-400" />
              : <ChevronDown size={11} className="text-default-400" />}
          </button>
          {tpiUnitOpen && (
            <div className="px-4 pb-3 space-y-3">
              {jumlahSubItems && jumlahSubItems.length > 0 && (
                <PersenDetailBlock
                  title="Detail Perhitungan TPI Unit"
                  tone="amber"
                  parentKriteria={kriteria}
                  jumlahSubItems={jumlahSubItems}
                  valueField="jawaban_tpi_unit"
                  noteField="catatan_tpi_unit"
                  computedPersen={computedTpiUnitPersen}
                  onChange={onChange}
                  disabled={!canEditTpiUnit}
                />
              )}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-2">
                  <span className="block text-[10px] text-default-500 mb-1">Jawaban TPI Unit</span>
                   <AnswerSelect
                     answerType={kriteria.answer_type}
                     value={localValues.jawaban_tpi_unit}
                     onChange={(v) => onChange(qid, 'jawaban_tpi_unit', v)}
                     computedPersen={computedTpiUnitPersen}
                     disabled={!canEditTpiUnit}
                   />
                </div>
                <div className="col-span-10">
                  <span className="block text-[10px] text-default-500 mb-1">Catatan TPI Unit</span>
                  <textarea
                    aria-label="Catatan TPI Unit"
                     value={localValues.catatan_tpi_unit}
                     onChange={(e) => onChange(qid, 'catatan_tpi_unit', e.target.value)}
                     disabled={!canEditTpiUnit}
                     placeholder="Catatan hasil review TPI dari Unit..."
                    rows={2}
                    className="w-full px-2 py-1.5 text-xs rounded border border-amber-200 dark:border-amber-700/40 bg-content1 focus:outline-none focus:border-amber-400 resize-y"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Seksi 3: Review TPI Itjen KESDM ── */}
        <div>
          <button
            onClick={() => setTpiItjenOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors text-left"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
              Review TPI Itjen KESDM
              {hasTpiItjen && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
            </span>
            {tpiItjenOpen
              ? <ChevronUp size={11} className="text-default-400" />
              : <ChevronDown size={11} className="text-default-400" />}
          </button>
          {tpiItjenOpen && (
            <div className="px-4 pb-3 space-y-3">
              {jumlahSubItems && jumlahSubItems.length > 0 && (
                <PersenDetailBlock
                  title="Detail Perhitungan TPI Itjen KESDM"
                  tone="violet"
                  parentKriteria={kriteria}
                  jumlahSubItems={jumlahSubItems}
                  valueField="jawaban_tpi_itjen"
                  noteField="catatan_tpi_itjen"
                  computedPersen={computedTpiItjenPersen}
                  onChange={onChange}
                  disabled={!canEditTpiItjen}
                />
              )}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-3 dark:border-violet-800/50 dark:bg-violet-950/10">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                    Review TPI Itjen
                  </p>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-4">
                      <span className="block text-[10px] text-default-500 mb-1">Jawaban TPI Itjen</span>
                        <AnswerSelect
                          answerType={kriteria.answer_type}
                          value={localValues.jawaban_tpi_itjen}
                          onChange={(v) => onChange(qid, 'jawaban_tpi_itjen', v)}
                          computedPersen={computedTpiItjenPersen}
                          disabled={!canEditTpiItjen}
                        />
                    </div>
                    <div className="col-span-12 sm:col-span-8">
                      <span className="block text-[10px] text-default-500 mb-1">Catatan TPI Itjen</span>
                      <textarea
                        aria-label="Catatan TPI Itjen"
                        value={localValues.catatan_tpi_itjen}
                        onChange={(e) => onChange(qid, 'catatan_tpi_itjen', e.target.value)}
                        disabled={!canEditTpiItjen}
                        placeholder="Catatan hasil review TPI Itjen KESDM..."
                        rows={4}
                        className="w-full px-2 py-1.5 text-xs rounded border border-violet-200 dark:border-violet-700/40 bg-content1 focus:outline-none focus:border-violet-400 resize-y"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-800/50 dark:bg-blue-950/10">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Review Visa
                  </p>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-4">
                      <span className="block text-[10px] text-default-500 mb-1">Jawaban Visa</span>
                      <div className="min-h-[32px] rounded border border-blue-200 bg-white px-2 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/20 dark:text-blue-200">
                        {getVisaJawaban(aiResult)}
                      </div>
                    </div>
                    <div className="col-span-12 sm:col-span-8">
                      <span className="block text-[10px] text-default-500 mb-1">Catatan Visa</span>
                      <div className="min-h-[78px] whitespace-pre-wrap rounded border border-blue-200 bg-white px-2 py-1.5 text-xs leading-relaxed text-default-700 dark:border-blue-800/50 dark:bg-blue-950/20">
                        {getVisaCatatan(aiResult) || 'Belum ada catatan Visa.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// Evaluate an infix formula_tokens expression using the shunting-yard algorithm.
// Supports full PEMDAS including parentheses.
function evalTokens(tokens: FormulaToken[], values: Record<number, number>): number {
  if (!tokens.length) return 0
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }
  const out: number[] = []
  const ops: string[] = []

  function applyOp(op: string) {
    const b = out.pop() ?? 0
    const a = out.pop() ?? 0
    if (op === '+') out.push(a + b)
    else if (op === '-') out.push(a - b)
    else if (op === '*') out.push(a * b)
    else if (op === '/') out.push(b === 0 ? 0 : a / b)
  }

  for (const t of tokens) {
    if (t.kind === 'operand') {
      out.push(values[t.ref!] ?? 0)
    } else if (t.kind === 'op') {
      while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[t.op!])
        applyOp(ops.pop()!)
      ops.push(t.op!)
    } else if (t.kind === 'open_paren') {
      ops.push('(')
    } else if (t.kind === 'close_paren') {
      while (ops.length && ops[ops.length - 1] !== '(') applyOp(ops.pop()!)
      ops.pop()
    }
  }
  while (ops.length) applyOp(ops.pop()!)
  return out[0] ?? 0
}

function formatFormulaTokens(tokens: FormulaToken[] | null) {
  if (!tokens?.length) return 'Formula belum dikonfigurasi'
  const parts = tokens.map((t) => {
    if (t.kind === 'operand') return String.fromCharCode(64 + (t.ref ?? 0))
    if (t.kind === 'op') return t.op ?? '?'
    if (t.kind === 'open_paren') return '('
    if (t.kind === 'close_paren') return ')'
    return '?'
  })
  return `= ${parts.join(' ')} * 100`
}

// Compute values for ALL sub-items in topological order (computed ones depend on others).
// Returns urutan→value map including computed values.
function computeSubItemValues(
  subItems: LkeKriteria[],
  localData: Record<number, LocalJawaban>,
  valueField: PersenValueField = 'jawaban_unit',
): Record<number, number> {
  // Map urutan → question_id and formula_tokens
  const byUrutan: Record<number, LkeKriteria> = {}
  for (const s of subItems) byUrutan[s.urutan] = s

  // Topological sort (DFS)
  const visited = new Set<number>()
  const sorted: LkeKriteria[] = []
  function visit(urutan: number) {
    if (visited.has(urutan)) return
    visited.add(urutan)
    const item = byUrutan[urutan]
    if (item?.is_computed && item.formula_tokens?.length) {
      for (const t of item.formula_tokens) if (t.kind === 'operand') visit(t.ref!)
    }
    if (item) sorted.push(item)
  }
  for (const s of subItems) visit(s.urutan)

  const values: Record<number, number> = {}
  for (const item of sorted) {
    if (item.is_computed && item.formula_tokens?.length) {
      values[item.urutan] = evalTokens(item.formula_tokens, values)
    } else {
      values[item.urutan] = parseFloat(localData[item.question_id]?.[valueField] || '0') || 0
    }
  }
  return values
}

// Compute the final persen value using the parent's formula_tokens and sub-item values.
// Returns null if formula is empty or result is invalid.
function computePersenValue(
  parentKriteria: LkeKriteria,
  subItems: LkeKriteria[],
  localData: Record<number, LocalJawaban>,
  valueField: PersenValueField = 'jawaban_unit',
): number | null {
  const tokens = parentKriteria.formula_tokens
  if (!tokens?.length || !subItems.length) return null
  const hasSubItemInput = subItems.some((item) => {
    const value = localData[item.question_id]?.[valueField]
    return value != null && String(value).trim() !== ''
  })
  if (!hasSubItemInput) return null
  const values = computeSubItemValues(subItems, localData, valueField)
  const raw = evalTokens(tokens, values) * 100
  if (!isFinite(raw)) return null
  const min = parentKriteria.formula_min ?? 0
  const max = parentKriteria.formula_max ?? 100
  return Math.min(max, Math.max(min, raw))
}

function r2(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100
}

function formatScore(value: number) {
  return r2(value).toFixed(2)
}

function getStatusByPercent(persen: number): 'OK' | 'Tidak Lulus' {
  return persen >= RECAP_PASSING_PERCENT ? 'OK' : 'Tidak Lulus'
}

function parseNumericAnswer(value?: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const normalized = raw
    .replace('%', '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  if (!normalized) return null
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

function getAnswerRatio(answerType: LkeKriteria['answer_type'], value?: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const upper = raw.toUpperCase()

  if (answerType === 'ya_tidak') {
    if (upper === 'YA' || upper === 'YES') return 1
    if (upper === 'TIDAK' || upper === 'NO') return 0
    return null
  }

  if (answerType === 'abc') {
    if (upper === 'A') return 1
    if (upper === 'B') return 0.5
    if (upper === 'C') return 0
    return null
  }

  if (answerType === 'abcd') {
    if (upper === 'A') return 1
    if (upper === 'B') return 0.67
    if (upper === 'C') return 0.33
    if (upper === 'D') return 0
    return null
  }

  if (answerType === 'abcde') {
    if (upper === 'A') return 1
    if (upper === 'B') return 0.75
    if (upper === 'C') return 0.5
    if (upper === 'D') return 0.25
    if (upper === 'E') return 0
    return null
  }

  if (answerType === 'persen') {
    const numeric = parseNumericAnswer(raw)
    if (numeric === null) return null
    return Math.max(0, Math.min(100, numeric)) / 100
  }

  if (answerType === 'nilai_04') {
    const numeric = parseNumericAnswer(raw)
    if (numeric === null) return null
    return Math.max(0, Math.min(4, numeric)) / 4
  }

  return null
}

function getFieldHasValue(
  qid: number,
  field: PersenValueField,
  localData: Record<number, LocalJawaban>,
  subItems: LkeKriteria[],
) {
  return (
    hasText(localData[qid]?.[field]) ||
    subItems.some((item) => hasText(localData[item.question_id]?.[field]))
  )
}

function getRecapValueField(
  kriteria: LkeKriteria,
  source: RecapSource,
  localData: Record<number, LocalJawaban>,
  subItems: LkeKriteria[],
): PersenValueField {
  if (source !== 'final') return SOURCE_VALUE_FIELD[source]

  const qid = kriteria.question_id
  if (getFieldHasValue(qid, 'jawaban_tpi_itjen', localData, subItems)) return 'jawaban_tpi_itjen'
  if (getFieldHasValue(qid, 'jawaban_tpi_unit', localData, subItems)) return 'jawaban_tpi_unit'
  return 'jawaban_unit'
}

function getEntryScore(
  kriteria: LkeKriteria,
  source: RecapSource,
  localData: Record<number, LocalJawaban>,
  subItems: LkeKriteria[],
) {
  const field = getRecapValueField(kriteria, source, localData, subItems)
  const computedPersen = kriteria.answer_type === 'persen' && subItems.length > 0
    ? computePersenValue(kriteria, subItems, localData, field)
    : null
  const answerValue = computedPersen != null
    ? String(computedPersen)
    : localData[kriteria.question_id]?.[field]
  const ratio = getAnswerRatio(kriteria.answer_type, answerValue)
  if (ratio === null) return 0
  return ratio * (Number(kriteria.bobot) || 0)
}

function flattenMainEntries(grouped: GroupedKomponen[]) {
  const entries: GroupedEntry[] = []
  const seen = new Set<number>()

  for (const group of grouped) {
    for (const section of group.seksiGroups) {
      for (const subEntries of Object.values(section.subKomponen)) {
        for (const entry of subEntries) {
          const qid = entry.kriteria.question_id
          if (seen.has(qid) || isDetailKriteria(entry.kriteria)) continue
          seen.add(qid)
          entries.push(entry)
        }
      }
    }
  }

  return entries
}

function buildRecapVersion(
  source: RecapSource,
  grouped: GroupedKomponen[],
  localData: Record<number, LocalJawaban>,
  subItemsMap: Record<number, LkeKriteria[]>,
  target: TargetValue,
): RecapVersion {
  const pengungkitAccum = Object.fromEntries(
    PENGUNGKIT_KEYS.map((key) => [key, { pemenuhan: 0, reform: 0 }])
  ) as Record<LkeKriteria['komponen'], { pemenuhan: number; reform: number }>
  const hasilAccum = Object.fromEntries(
    HASIL_KEYS.map((key) => [key, 0])
  ) as Record<LkeKriteria['komponen'], number>

  for (const entry of flattenMainEntries(grouped)) {
    const kriteria = entry.kriteria
    const score = getEntryScore(kriteria, source, localData, subItemsMap[kriteria.question_id] ?? [])

    if (PENGUNGKIT_KEYS.includes(kriteria.komponen)) {
      const bucket = pengungkitAccum[kriteria.komponen]
      if (getEffectiveSeksi(kriteria) === 'reform') bucket.reform += score
      else bucket.pemenuhan += score
      continue
    }

    if (HASIL_KEYS.includes(kriteria.komponen)) {
      hasilAccum[kriteria.komponen] += score
    }
  }

  const pengungkitRows: RecapRow[] = PENGUNGKIT_KEYS.map((key, index) => {
    const acc = pengungkitAccum[key] ?? { pemenuhan: 0, reform: 0 }
    const nilai = r2(acc.pemenuhan + acc.reform)
    const bobot = RECAP_MAX_BOBOT[key]
    const persen = bobot > 0 ? r2((nilai / bobot) * 100) : 0
    return {
      key,
      label:     `${index + 1}. ${KOMPONEN_LABEL[key] ?? key}`,
      bobot,
      pemenuhan: r2(acc.pemenuhan),
      reform:    r2(acc.reform),
      nilai,
      persen,
      status:    getStatusByPercent(persen),
    }
  })

  const hasilRows: RecapHasilRow[] = HASIL_KEYS.map((key) => {
    const nilai = r2(hasilAccum[key] ?? 0)
    const bobot = RECAP_MAX_BOBOT[key]
    const persen = bobot > 0 ? r2((nilai / bobot) * 100) : 0
    return {
      key,
      label:  KOMPONEN_LABEL[key] ?? key,
      bobot,
      nilai,
      persen,
      status: getStatusByPercent(persen),
    }
  })

  const pemenuhanNilai = r2(pengungkitRows.reduce((acc, row) => acc + row.pemenuhan, 0))
  const reformNilai = r2(pengungkitRows.reduce((acc, row) => acc + row.reform, 0))
  const pengungkitNilai = r2(pemenuhanNilai + reformNilai)
  const pengungkitPersen = r2((pengungkitNilai / MAX_PENGUNGKIT) * 100)
  const hasilNilai = r2(hasilRows.reduce((acc, row) => acc + row.nilai, 0))
  const hasilPersen = r2((hasilNilai / MAX_HASIL) * 100)
  const nilaiAkhir = r2(pengungkitNilai + hasilNilai)
  const threshold = TARGET_THRESHOLD[target]

  return {
    source,
    label: SOURCE_LABEL[source],
    tone: SOURCE_TONE[source],
    pengungkitRows,
    pengungkitTotal: {
      nilai:      pengungkitNilai,
      persen:     pengungkitPersen,
      status:     getStatusByPercent(pengungkitPersen),
      pemenuhan:  pemenuhanNilai,
      reform:     reformNilai,
    },
    hasilRows,
    hasilTotal: {
      nilai:  hasilNilai,
      persen: hasilPersen,
      status: getStatusByPercent(hasilPersen),
    },
    nilaiAkhir,
    targetTercapai: nilaiAkhir >= threshold,
  }
}

function buildRecapBundle(
  grouped: GroupedKomponen[],
  localData: Record<number, LocalJawaban>,
  subItemsMap: Record<number, LkeKriteria[]>,
  target: TargetValue,
): RecapBundle {
  return {
    target,
    threshold: TARGET_THRESHOLD[target],
    unit:     buildRecapVersion('unit', grouped, localData, subItemsMap, target),
    tpiUnit:  buildRecapVersion('tpiUnit', grouped, localData, subItemsMap, target),
    tpiItjen: buildRecapVersion('tpiItjen', grouped, localData, subItemsMap, target),
    final:    buildRecapVersion('final', grouped, localData, subItemsMap, target),
  }
}

function RecapMiniCard({ version }: { version: RecapVersion }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${version.tone}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">{version.label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-xl font-black tabular-nums">{formatScore(version.nilaiAkhir)}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          version.targetTercapai
            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
        }`}>
          {version.targetTercapai ? 'Lulus' : 'Belum'}
        </span>
      </div>
    </div>
  )
}

function RecapStatusBadge({ status }: { status: 'OK' | 'Tidak Lulus' }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
      status === 'OK'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
    }`}>
      {status}
    </span>
  )
}

function RecapSidebar({ bundle }: { bundle: RecapBundle }) {
  const final = bundle.final
  const versions = [bundle.unit, bundle.tpiUnit, bundle.tpiItjen]

  return (
    <aside className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto rounded-2xl border border-default-200 bg-content1 shadow-sm">
      <div className="border-b border-default-100 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Rekapitulasi</p>
        <h2 className="mt-1 text-lg font-black text-default-900">Realtime LKE</h2>
        <p className="mt-1 text-xs leading-relaxed text-default-500">
          Tersedia 3 versi nilai: Unit, TPI Unit, dan TPI Itjen. Rekap final memakai prioritas Itjen, lalu TPI Unit, lalu Unit.
        </p>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
          {versions.map((version) => (
            <RecapMiniCard key={version.source} version={version} />
          ))}
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white dark:bg-slate-100 dark:text-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Nilai Final Dipakai</p>
              <p className="mt-1 text-3xl font-black tabular-nums">{formatScore(final.nilaiAkhir)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Target {bundle.target}</p>
              <p className="text-sm font-black">Min {bundle.threshold}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15 dark:bg-slate-900/15">
            <div
              className={`h-full rounded-full transition-all ${final.targetTercapai ? 'bg-green-400' : 'bg-rose-400'}`}
              style={{ width: `${Math.min(100, Math.max(0, final.nilaiAkhir))}%` }}
            />
          </div>
          <p className={`mt-2 text-sm font-bold ${final.targetTercapai ? 'text-green-300 dark:text-green-700' : 'text-rose-300 dark:text-rose-700'}`}>
            {final.targetTercapai ? 'Lulus target' : 'Belum lulus target'}
          </p>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wide text-default-700">A. Pengungkit</h3>
            <RecapStatusBadge status={final.pengungkitTotal.status} />
          </div>
          <div className="overflow-hidden rounded-xl border border-default-200">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-default-50 text-[10px] uppercase tracking-wide text-default-500">
                <tr>
                  <th className="px-2 py-2">Area</th>
                  <th className="px-2 py-2 text-right">Bobot</th>
                  <th className="px-2 py-2 text-right">Nilai</th>
                  <th className="px-2 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {final.pengungkitRows.map((row) => (
                  <tr key={row.key} className={row.status === 'OK' ? 'bg-green-50/30 dark:bg-green-950/10' : 'bg-rose-50/20 dark:bg-rose-950/10'}>
                    <td className="px-2 py-2 align-top">
                      <p className="font-semibold text-default-700">{row.label}</p>
                      <p className="mt-1 text-[10px] text-default-400">
                        Pemenuhan {formatScore(row.pemenuhan)} | Reform {formatScore(row.reform)}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatScore(row.bobot)}</td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{formatScore(row.nilai)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatScore(row.persen)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 text-default-900 dark:bg-slate-900 dark:text-slate-100">
                <tr>
                  <td className="px-2 py-2">
                    <p className="font-black">Total Pengungkit</p>
                    <p className="mt-1 text-[10px] font-medium text-default-500 dark:text-slate-300">
                      Pemenuhan {formatScore(final.pengungkitTotal.pemenuhan ?? 0)} / {formatScore(MAX_PEMENUHAN)} | Reform {formatScore(final.pengungkitTotal.reform ?? 0)} / {formatScore(MAX_REFORM)}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-right font-black tabular-nums">{formatScore(MAX_PENGUNGKIT)}</td>
                  <td className="px-2 py-2 text-right font-black tabular-nums">{formatScore(final.pengungkitTotal.nilai)}</td>
                  <td className="px-2 py-2 text-right font-black tabular-nums">{formatScore(final.pengungkitTotal.persen)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wide text-default-700">B. Hasil</h3>
            <RecapStatusBadge status={final.hasilTotal.status} />
          </div>
          <div className="overflow-hidden rounded-xl border border-default-200">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-default-50 text-[10px] uppercase tracking-wide text-default-500">
                <tr>
                  <th className="px-2 py-2">Area</th>
                  <th className="px-2 py-2 text-right">Bobot</th>
                  <th className="px-2 py-2 text-right">Nilai</th>
                  <th className="px-2 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {final.hasilRows.map((row) => (
                  <tr key={row.key} className={row.status === 'OK' ? 'bg-green-50/30 dark:bg-green-950/10' : 'bg-rose-50/20 dark:bg-rose-950/10'}>
                    <td className="px-2 py-2 font-semibold text-default-700">{row.label}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatScore(row.bobot)}</td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{formatScore(row.nilai)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatScore(row.persen)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 text-default-900 dark:bg-slate-900 dark:text-slate-100">
                <tr>
                  <td className="px-2 py-2 font-black">Total Hasil</td>
                  <td className="px-2 py-2 text-right font-black tabular-nums">{formatScore(MAX_HASIL)}</td>
                  <td className="px-2 py-2 text-right font-black tabular-nums">{formatScore(final.hasilTotal.nilai)}</td>
                  <td className="px-2 py-2 text-right font-black tabular-nums">{formatScore(final.hasilTotal.persen)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </aside>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function InputJawabanPage() {
  const { id: submissionId } = useParams<{ id: string }>()
  const router = useRouter()
  const role = useAuthStore((s) => s.role)
  const canEditUnit = hasPermission(role, 'zi:fill-unit')
  const canEditTpiUnit = hasPermission(role, 'zi:review-tpi-unit')
  const canEditTpiItjen = hasPermission(role, 'zi:review-tpi-kesdm')
  const canOpenDriveLink =
    hasPermission(role, 'zi:review-tpi-unit') ||
    hasPermission(role, 'zi:review-tpi-kesdm') ||
    hasPermission(role, 'zi:manage')
  const canEditAnything = canEditUnit || canEditTpiUnit || canEditTpiItjen
  const canSyncSheet = hasPermission(role, 'zi:sync')

  const [grouped, setGrouped]             = useState<GroupedKomponen[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [expanded, setExpanded]           = useState<Set<string>>(new Set(KOMPONEN_ORDER))
  const [localData, setLocalData]         = useState<Record<number, LocalJawaban>>({})
  const [pendingSave, setPendingSave]     = useState<Set<number>>(new Set())
  const [savingIds, setSavingIds]         = useState<Set<number>>(new Set())
  const [batchSaving, setBatchSaving]     = useState(false)
  const [batchSuccess, setBatchSuccess]   = useState(false)
  const [submissionName, setSubmissionName] = useState('')
  const [submissionSource, setSubmissionSource] = useState<'sheet' | 'app'>('app')
  const [submissionTarget, setSubmissionTarget] = useState<TargetValue>('WBK')
  const [lastSyncedAt, setLastSyncedAt]   = useState<string | null>(null)
  const [syncInfo, setSyncInfo]           = useState<SheetSyncSummary | null>(null)
  const [syncError, setSyncError]         = useState<string | null>(null)
  const [syncingMode, setSyncingMode]     = useState<'missing_only' | 'overwrite' | null>(null)
  const [searchId, setSearchId]           = useState('')
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  // persenQid → sorted LkeKriteria[] for sub-items
  const persenSubItemsMap = useRef<Record<number, LkeKriteria[]>>({})
  // persenQid → parent LkeKriteria (for formula_tokens)
  const persenKriteriaMap = useRef<Record<number, LkeKriteria>>({})
  // jumlahQid → persenQid
  const jumlahParentMap   = useRef<Record<number, number>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [jawabanRes, subRes] = await Promise.all([
        axios.get(`/api/zi/submissions/${submissionId}/jawaban`),
        axios.get(`/api/zi/submissions/${submissionId}`),
      ])

      const submission = subRes.data.submission
      const autoSync = jawabanRes.data.sync as SheetSyncSummary | null
      const normalizedSource: 'sheet' | 'app' = submission?.source === 'app' ? 'app' : 'sheet'
      setSubmissionName(submission?.eselon2 ?? '')
      setSubmissionSource(normalizedSource)
      setSubmissionTarget(submission?.target === 'WBBM' ? 'WBBM' : 'WBK')
      setLastSyncedAt(autoSync?.syncedAt ?? submission?.last_synced_at ?? null)
      if (autoSync) {
        setSyncInfo(autoSync)
        setSyncError(null)
      }

      const groupedData: GroupedKomponen[] = []
      const initialLocal: Record<number, LocalJawaban> = {}
      const newSubItemsMap: Record<number, LkeKriteria[]> = {}
      const newKriteriaMap: Record<number, LkeKriteria>   = {}
      const newJumlahMap:   Record<number, number>        = {}

      for (const komp of KOMPONEN_ORDER) {
        const entries: GroupedEntry[] = jawabanRes.data.grouped?.[komp] ?? []
        if (entries.length === 0) continue

        // Sort entries by question_id
        const sortedEntries = [...entries].sort(
          (a, b) => a.kriteria.question_id - b.kriteria.question_id
        )

        // Group by effective section. The imported legacy master can still mark
        // reform/hasil rows as pemenuhan, so ID and component rules are the UI truth here.
        const seksiMap: Record<string, Record<string, GroupedEntry[]>> = {}
        for (const entry of sortedEntries) {
          const seksi  = getEffectiveSeksi(entry.kriteria)
          const subKey = entry.kriteria?.sub_komponen || 'Lainnya'
          if (!seksiMap[seksi])         seksiMap[seksi] = {}
          if (!seksiMap[seksi][subKey]) seksiMap[seksi][subKey] = []
          seksiMap[seksi][subKey].push(entry)

          const qid = entry.kriteria.question_id
          const j   = entry.jawaban
          initialLocal[qid] = {
            jawaban_unit:      j?.jawaban_unit      ?? '',
            narasi:            j?.narasi            ?? '',
            bukti:             j?.bukti             ?? '',
            link_drive:        j?.link_drive        ?? '',
            jawaban_tpi_unit:  j?.jawaban_tpi_unit  ?? '',
            catatan_tpi_unit:  j?.catatan_tpi_unit  ?? '',
            jawaban_tpi_itjen: j?.jawaban_tpi_itjen ?? '',
            catatan_tpi_itjen: j?.catatan_tpi_itjen ?? '',
          }
        }

        // Build persen ↔ jumlah maps using parent_question_id (explicit linking)
        for (const entry of sortedEntries) {
          const k = entry.kriteria
          if (k.answer_type === 'jumlah' && k.parent_question_id != null) {
            const pqid = k.parent_question_id
            if (!newSubItemsMap[pqid]) newSubItemsMap[pqid] = []
            newSubItemsMap[pqid].push(k)
            newJumlahMap[k.question_id] = pqid
          }
          if (k.answer_type === 'persen') {
            newKriteriaMap[k.question_id] = k
          }
        }
        // Sort sub-items by urutan
        for (const pqid of Object.keys(newSubItemsMap)) {
          newSubItemsMap[+pqid].sort((a, b) => a.urutan - b.urutan)
        }

        for (const seksi of SEKSI_ORDER) {
          const subKomponen = seksiMap[seksi]
          if (!subKomponen) continue

          const sectionEntries = Object.values(subKomponen).flat()
          const mainEntries = sectionEntries.filter((e) => !isDetailKriteria(e.kriteria))
          if (mainEntries.length === 0) continue

          const filled = mainEntries.filter((e) => {
            const parentFilled =
              e.jawaban?.jawaban_unit || e.jawaban?.narasi || e.jawaban?.bukti || e.jawaban?.link_drive
            if (parentFilled) return true

            const childItems = newSubItemsMap[e.kriteria.question_id] ?? []
            return childItems.some((child) => {
              const childLocal = initialLocal[child.question_id]
              return childLocal?.jawaban_unit || childLocal?.narasi || childLocal?.bukti || childLocal?.link_drive
            })
          }).length

          const minId = Math.min(...mainEntries.map((e) => e.kriteria.question_id))
          groupedData.push({
            key:         `${seksi}:${komp}`,
            komponen:    komp,
            label:       `${SEKSI_LABEL[seksi]} - ${KOMPONEN_LABEL[komp] ?? komp}`,
            seksiGroups: [{ seksi, label: SEKSI_LABEL[seksi], subKomponen }],
            total:       mainEntries.length,
            filled,
            minId,
          })
        }
      }

      groupedData.sort((a, b) => a.minId - b.minId)

      persenSubItemsMap.current = newSubItemsMap
      persenKriteriaMap.current = newKriteriaMap
      jumlahParentMap.current   = newJumlahMap

      // Pre-compute persen values from initial jumlah data
      for (const [pqidStr, subItems] of Object.entries(newSubItemsMap)) {
        const pqid   = parseInt(pqidStr)
        const parent = newKriteriaMap[pqid]
        if (!parent) continue
        let parentLocal = initialLocal[pqid] ?? defaultLocal()
        for (const valueField of PERSEN_VALUE_FIELDS) {
          const persen = computePersenValue(parent, subItems, initialLocal, valueField)
          if (persen != null) {
            parentLocal = { ...parentLocal, [valueField]: persen.toFixed(2) }
          }
        }
        initialLocal[pqid] = parentLocal
      }

      setGrouped(groupedData)
      setExpanded(new Set(groupedData.map((g) => g.key)))
      setLocalData(initialLocal)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err.message ?? 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => { fetchData() }, [fetchData])

  function debouncedSave(qid: number, patch: Partial<LocalJawaban>) {
    clearTimeout(debounceTimers.current[qid])
    debounceTimers.current[qid] = setTimeout(async () => {
      setSavingIds((prev) => new Set(prev).add(qid))
      try {
        await axios.patch(`/api/zi/submissions/${submissionId}/jawaban/${qid}`, patch)
        setPendingSave((prev) => { const s = new Set(prev); s.delete(qid); return s })
      } catch { /* silent, batch save covers */ }
      finally {
        setSavingIds((prev) => { const s = new Set(prev); s.delete(qid); return s })
      }
    }, 500)
  }

  function handleChange(qid: number, field: keyof LocalJawaban, value: string) {
    // Compute the new entry for this qid using latest localData from render scope
    const updatedEntry = { ...localData[qid], [field]: value }

    // Jika nilai jumlah berubah, hitung ulang persen parent untuk sumber jawaban yang sama.
    let persenUpdate: { qid: number; field: PersenValueField; value: string } | null = null
    if (PERSEN_VALUE_FIELDS.includes(field as PersenValueField)) {
      const valueField = field as PersenValueField
      const persenQid = jumlahParentMap.current[qid]
      if (persenQid != null) {
        const parent   = persenKriteriaMap.current[persenQid]
        const subItems = persenSubItemsMap.current[persenQid] ?? []
        if (parent) {
          const mergedData = { ...localData, [qid]: updatedEntry }
          const persen     = computePersenValue(parent, subItems, mergedData, valueField)
          if (persen != null) persenUpdate = { qid: persenQid, field: valueField, value: persen.toFixed(2) }
        }
      }
    }

    setLocalData((prev) => {
      const next = { ...prev, [qid]: updatedEntry }
      if (persenUpdate) {
        next[persenUpdate.qid] = {
          ...next[persenUpdate.qid],
          [persenUpdate.field]: persenUpdate.value,
        }
      }
      return next
    })

    setPendingSave((prev) => new Set(prev).add(qid))
    debouncedSave(qid, { [field]: value })

    if (persenUpdate) {
      setPendingSave((prev) => new Set(prev).add(persenUpdate!.qid))
      debouncedSave(persenUpdate.qid, { [persenUpdate.field]: persenUpdate.value })
    }
  }

  async function handleSavePerData(ids: number[]) {
    const uniqueIds = Array.from(new Set(ids))
    uniqueIds.forEach((id) => clearTimeout(debounceTimers.current[id]))
    setSavingIds((prev) => {
      const s = new Set(prev)
      uniqueIds.forEach((id) => s.add(id))
      return s
    })
    try {
      const jawaban = uniqueIds.map((qid) => ({
        question_id: qid,
        ...(localData[qid] ?? defaultLocal()),
      }))
      await axios.put(`/api/zi/submissions/${submissionId}/jawaban`, { jawaban })
      setPendingSave((prev) => {
        const s = new Set(prev)
        uniqueIds.forEach((id) => s.delete(id))
        return s
      })
      setBatchSuccess(true)
      setTimeout(() => setBatchSuccess(false), 3000)
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Gagal menyimpan data ini.')
    } finally {
      setSavingIds((prev) => {
        const s = new Set(prev)
        uniqueIds.forEach((id) => s.delete(id))
        return s
      })
    }
  }

  async function handleBatchSave() {
    setBatchSaving(true)
    setBatchSuccess(false)
    try {
      const jawaban = Object.entries(localData).map(([qid, vals]) => ({
        question_id: parseInt(qid),
        ...vals,
      }))
      await axios.put(`/api/zi/submissions/${submissionId}/jawaban`, { jawaban })
      setPendingSave(new Set())
      setBatchSuccess(true)
      setTimeout(() => setBatchSuccess(false), 3000)
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Gagal menyimpan.')
    } finally {
      setBatchSaving(false)
    }
  }

  async function handleSheetSync(mode: 'missing_only' | 'overwrite') {
    if (mode === 'overwrite') {
      const ok = confirm(
        'Sync overwrite akan menimpa data jawaban di aplikasi dengan data dari Google Sheet. Lanjutkan?'
      )
      if (!ok) return
    }

    setSyncingMode(mode)
    setSyncError(null)
    try {
      const res = await axios.post(`/api/zi/submissions/${submissionId}/sync-sheet`, { mode })
      const sync = res.data.sync as SheetSyncSummary
      setSyncInfo(sync)
      setLastSyncedAt(sync.syncedAt)
      await fetchData()
    } catch (err: any) {
      const sync = err?.response?.data?.sync as SheetSyncSummary | undefined
      if (sync) setSyncInfo(sync)
      setSyncError(err?.response?.data?.error ?? 'Gagal sync Google Sheet.')
    } finally {
      setSyncingMode(null)
    }
  }

  function toggleKomponen(komp: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(komp)) next.delete(komp)
      else next.add(komp)
      return next
    })
  }

  const totalFilled = grouped.reduce((acc, g) => acc + g.filled, 0)
  const totalItems  = grouped.reduce((acc, g) => acc + g.total, 0)
  const normalizedSearchId = searchId.trim()
  const recapBundle = useMemo(
    () => buildRecapBundle(grouped, localData, persenSubItemsMap.current, submissionTarget),
    [grouped, localData, submissionTarget],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-2 text-default-400 text-sm">
        <Loader2 size={16} className="animate-spin" />
        Memuat data jawaban...
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <XCircle size={32} className="text-rose-500 mx-auto mb-3" />
        <p className="text-rose-600 text-sm">{error}</p>
        <button onClick={fetchData} className="mt-4 text-sm text-primary hover:underline">Coba lagi</button>
      </div>
    )
  }

  return (
    <div className="max-w-[96rem] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push(`/zona-integritas/lke-checker/${submissionId}`)}
          className="p-1.5 rounded-lg hover:bg-default-100 text-default-500 mt-0.5 shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">Input LKE</h1>
          <p className="text-sm text-default-400 mt-0.5">{submissionName}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {pendingSave.size > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {pendingSave.size} perubahan belum tersimpan
            </span>
          )}
          {batchSuccess && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 size={12} /> Tersimpan
            </span>
          )}
          <button
            onClick={handleBatchSave}
            disabled={batchSaving || !canEditAnything}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {batchSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Simpan Semua
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-default-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-blue-500" />
          Pengisian Unit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-amber-500" />
          Review TPI Unit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-violet-500" />
          Review TPI Itjen KESDM
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-green-500" />
          Hasil AI Check
        </span>
      </div>

      {submissionSource === 'sheet' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20 px-3 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Data Google Sheet
              </p>
              <p className="text-xs text-blue-600/80 dark:text-blue-300/80 mt-0.5">
                Terakhir sync: {formatDateTime(lastSyncedAt)}
                {syncInfo ? ` | ${syncInfo.validRows} baris valid, ${syncInfo.imported} baru, ${syncInfo.updated} update, ${syncInfo.skipped} dilewati` : ''}
              </p>
              {(syncInfo?.unknownQuestionIds?.length ?? 0) > 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                  Warning: {syncInfo?.unknownQuestionIds?.length ?? 0} ID tidak ada di master kriteria.
                </p>
              )}
              {syncError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-1">{syncError}</p>
              )}
            </div>
            {canSyncSheet && (
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSheetSync('missing_only')}
                  disabled={!!syncingMode}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-blue-300 bg-white text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:bg-blue-950/20 dark:text-blue-200"
                >
                  {syncingMode === 'missing_only' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Sync dari Sheet
                </button>
                <button
                  type="button"
                  onClick={() => handleSheetSync('overwrite')}
                  disabled={!!syncingMode}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-200"
                >
                  {syncingMode === 'overwrite' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Timpa dari Sheet
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-default-200 bg-content1 px-3 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <label htmlFor="search-id" className="text-xs font-medium text-default-600 md:min-w-28">
            Cari ID Pertanyaan
          </label>
          <input
            id="search-id"
            type="text"
            inputMode="numeric"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Contoh: 125"
            className="w-full md:max-w-xs px-3 py-2 text-sm rounded-lg border border-default-200 bg-content1 focus:outline-none focus:border-primary"
          />
          {normalizedSearchId && (
            <button
              type="button"
              onClick={() => setSearchId('')}
              className="text-xs text-default-500 hover:text-default-700 hover:underline self-start md:self-auto"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3 text-sm text-default-500">
        <div className="flex-1 h-1.5 bg-default-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: totalItems > 0 ? `${Math.round((totalFilled / totalItems) * 100)}%` : '0%' }}
          />
        </div>
        <span className="text-xs">{totalFilled} / {totalItems} terisi</span>
      </div>

      {/* Accordion per komponen */}
      {grouped.map((g) => {
        const isOpen = expanded.has(g.key)
        return (
          <div key={g.key} className="rounded-xl border border-default-200 overflow-hidden">
            {/* Accordion header */}
            <button
              onClick={() => toggleKomponen(g.key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-default-50 hover:bg-default-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{g.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  g.filled === g.total && g.total > 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-default-200 text-default-600'
                }`}>
                  {g.filled} / {g.total} terisi
                </span>
              </div>
              {isOpen
                ? <ChevronUp size={14} className="text-default-400" />
                : <ChevronDown size={14} className="text-default-400" />}
            </button>

            {/* Accordion body */}
            {isOpen && (
              <div className="p-3 space-y-3 bg-background">
                {g.seksiGroups.map((sg) => (
                  <div key={sg.seksi}>
                    {/* Seksi header (pemenuhan vs reform) */}
                    {g.seksiGroups.length > 1 && (
                      <div className="flex items-center gap-2 py-1 mb-2">
                        <ChevronRight size={12} className="text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                          {sg.label}
                        </span>
                        <div className="flex-1 h-px bg-primary/15" />
                      </div>
                    )}

                    {Object.entries(sg.subKomponen).map(([subName, entries]) => (
                      <div key={subName} className="space-y-2 mb-4">
                        {/* Sub-komponen header */}
                        <p className="text-[10px] font-medium text-default-400 uppercase tracking-wide pl-1">
                          {subName}
                        </p>
                        {/* Question cards — jumlah with parent_question_id are embedded in their persen parent */}
                        {entries.map((entry) => {
                          const qid = entry.kriteria.question_id
                          const childIdMatched = (persenSubItemsMap.current[qid] ?? [])
                            .some((sub) => String(sub.question_id).includes(normalizedSearchId))
                          const isMatched =
                            normalizedSearchId === '' ||
                            String(qid).includes(normalizedSearchId) ||
                            childIdMatched
                          if (!isMatched) return null

                          // Skip jumlah entries that have an explicit persen parent — rendered inside parent card
                          if (isDetailKriteria(entry.kriteria)) return null

                          // For persen entries: find their jumlah children sorted by urutan
                          const subItemKriterias = (persenSubItemsMap.current[qid] ?? [])
                          const jumlahEntriesForThis = entries
                            .filter(e => e.kriteria.answer_type === 'jumlah' && e.kriteria.parent_question_id === qid)
                            .sort((a, b) => a.kriteria.urutan - b.kriteria.urutan)

                          const computedPersen =
                            entry.kriteria.answer_type === 'persen' && subItemKriterias.length > 0
                              ? computePersenValue(entry.kriteria, subItemKriterias, localData)
                              : null
                          const computedTpiUnitPersen =
                            entry.kriteria.answer_type === 'persen' && subItemKriterias.length > 0
                              ? computePersenValue(entry.kriteria, subItemKriterias, localData, 'jawaban_tpi_unit')
                              : null
                          const computedTpiItjenPersen =
                            entry.kriteria.answer_type === 'persen' && subItemKriterias.length > 0
                              ? computePersenValue(entry.kriteria, subItemKriterias, localData, 'jawaban_tpi_itjen')
                              : null

                          const jumlahSubItems =
                            entry.kriteria.answer_type === 'persen' && jumlahEntriesForThis.length > 0
                              ? jumlahEntriesForThis.map(je => ({
                                  entry:       je,
                                  localValues: localData[je.kriteria.question_id] ?? defaultLocal(),
                                  saving:      savingIds.has(je.kriteria.question_id),
                                }))
                              : undefined

                          return (
                            <JawabanCard
                              key={qid}
                              entry={entry}
                              onChange={handleChange}
                              onSave={handleSavePerData}
                              localValues={localData[qid] ?? defaultLocal()}
                              saving={savingIds.has(qid) || (jumlahEntriesForThis.length > 0 && jumlahEntriesForThis.some((je) => savingIds.has(je.kriteria.question_id)))}
                              computedPersen={computedPersen}
                              computedTpiUnitPersen={computedTpiUnitPersen}
                              computedTpiItjenPersen={computedTpiItjenPersen}
                              jumlahSubItems={jumlahSubItems}
                              hasPending={pendingSave.has(qid) || (jumlahEntriesForThis.length > 0 && jumlahEntriesForThis.some((je) => pendingSave.has(je.kriteria.question_id)))}
                              canEditUnit={canEditUnit}
                              canEditTpiUnit={canEditTpiUnit}
                              canEditTpiItjen={canEditTpiItjen}
                              canOpenDriveLink={canOpenDriveLink}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {grouped.length === 0 && (
        <div className="text-center py-16 text-default-400 text-sm">
          <AlertTriangle size={24} className="mx-auto mb-3 text-amber-400" />
          <p>Tidak ada kriteria ditemukan. Pastikan admin sudah menjalankan import data.</p>
          <button
            onClick={() => router.push('/dashboard/zi/kriteria')}
            className="mt-3 text-primary text-sm hover:underline"
          >
            Buka halaman admin kriteria →
          </button>
        </div>
      )}
        </div>

        <RecapSidebar bundle={recapBundle} />
      </div>
    </div>
  )
}
