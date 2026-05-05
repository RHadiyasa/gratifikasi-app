export interface NilaiKomponen {
  nilai: number | null
  persen: number | null
}

export interface NilaiLKE {
  pengungkit: {
    manajemen_perubahan:     NilaiKomponen
    penataan_tatalaksana:    NilaiKomponen
    penataan_sdm:            NilaiKomponen
    penguatan_akuntabilitas: NilaiKomponen
    penguatan_pengawasan:    NilaiKomponen
    peningkatan_pelayanan:   NilaiKomponen
    total:                   NilaiKomponen
  }
  hasil: {
    birokrasi_bersih: {
      ipak:            NilaiKomponen
      capaian_kinerja: NilaiKomponen
      total:           NilaiKomponen
    }
    pelayanan_prima: {
      ipkp:  NilaiKomponen
      total: NilaiKomponen
    }
    total: NilaiKomponen
  }
  nilai_akhir:     number | null
  target_tercapai: boolean
}

export type FormulaOp = '+' | '-' | '*' | '/'

export type FormulaTokenKind = 'operand' | 'op' | 'open_paren' | 'close_paren'

export interface FormulaToken {
  kind: FormulaTokenKind
  ref?: number    // only when kind === 'operand'
  op?:  FormulaOp // only when kind === 'op'
}

export interface LkeKriteria {
  _id:                string
  question_id:        number
  parent_question_id: number | null
  komponen:           'mp' | 'tt' | 'sdm' | 'ak' | 'pw' | 'pp' | 'ipak' | 'capaian_kinerja' | 'prima'
  seksi:              'pemenuhan' | 'reform' | 'hasil'
  sub_komponen:       string
  urutan:             number
  pertanyaan:         string
  standar_dokumen:    string
  kriteria_panrb:     string
  bobot:              number
  answer_type:        'ya_tidak' | 'abc' | 'abcd' | 'abcde' | 'persen' | 'nilai_04' | 'jumlah'
  is_computed:        boolean
  formula_tokens:     FormulaToken[] | null
  formula_min:        number
  formula_max:        number
  formula_zero_division_full_score: boolean
  aktif:              boolean
  createdAt:          string
  updatedAt:          string
}

export interface AiResult {
  score:          number | null
  verdict:        string | null
  color:          string | null
  status:         string | null
  reviu:          string | null
  pendapat:       string | null
  temuan_kritis:  string | null
  dokumen_ada:    string[]
  dokumen_kurang: string[]
  fingerprint:    string | null
  checked_at:     string | null
  based_on:       string | null
  supervisi:      string | null
}

export interface LkeJawaban {
  _id:               string
  submission_id:     string
  question_id:       number
  jawaban_unit:      string
  narasi:            string
  bukti:             string
  link_drive:        string
  jawaban_tpi_unit:  string
  catatan_tpi_unit:  string
  jawaban_tpi_itjen: string
  catatan_tpi_itjen: string
  ai_result:         AiResult
  createdAt:         string
  updatedAt:         string
  kriteria?:         LkeKriteria
}

export interface LkeSubmission {
  _id:              string
  link:             string | null
  spreadsheet_id?:  string | null
  source:           'sheet' | 'app'
  target:           'WBK' | 'WBBM'
  eselon1:          string
  eselon2:          string
  pic_unit:         string
  assigned_unit_zi_id?: string | null
  assigned_unit_zi_name?: string | null
  catatan:          string
  status:           'Belum Dicek' | 'Sedang Dicek' | 'Selesai' | 'Perlu Revisi'
  total_data:       number
  checked_count:    number
  unchecked_count:  number
  progress_percent: number
  nilai_lke_ai:     NilaiLKE | null
  last_synced_at:   string | null
  sync_status:      'idle' | 'syncing' | 'success' | 'error'
  sync_error:       string | null
  created_at:       string
  last_checked_at:  string | null
}

export interface ZiSummary {
  total:            number
  selesai:          number
  sedang:           number
  belum:            number
  wbk_tercapai:     number
  wbbm_tercapai:    number
  rata_nilai_akhir: number | null
}

export const ESELON1_LIST = [
  'Sekretariat Jenderal',
  'Inspektorat Jenderal',
  'Direktorat Jenderal Migas',
  'Direktorat Jenderal Gatrik',
  'Direktorat Jenderal EBTKE',
  'Direktorat Jenderal Penegakan Hukum ESDM',
  'Badan Geologi',
  'BPSDM',
  'Sekretariat Jenderal DEN',
  'BPMA',
] as const

export type Eselon1 = typeof ESELON1_LIST[number]

export const TARGET_THRESHOLD: Record<'WBK' | 'WBBM', number> = {
  WBK:  75,
  WBBM: 85,
}
