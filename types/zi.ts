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

export interface LkeSubmission {
  _id:              string
  link:             string
  target:           'WBK' | 'WBBM'
  eselon1:          string
  eselon2:          string
  pic_unit:         string
  catatan:          string
  status:           'Belum Dicek' | 'Sedang Dicek' | 'Selesai' | 'Perlu Revisi'
  total_data:       number
  checked_count:    number
  unchecked_count:  number
  progress_percent: number
  nilai_lke:        NilaiLKE | null
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
  WBK:  60,
  WBBM: 75,
}
