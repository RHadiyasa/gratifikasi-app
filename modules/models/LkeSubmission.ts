import mongoose, { Schema, Document } from 'mongoose'
import { ESELON1_LIST } from '@/types/zi'

const NilaiKomponenSchema = new Schema(
  { nilai: { type: Number, default: null }, persen: { type: Number, default: null } },
  { _id: false }
)

const LkeSubmissionSchema = new Schema(
  {
    link:     { type: String, default: null },
    spreadsheet_id: { type: String, default: null, index: true },
    source:   { type: String, enum: ['sheet', 'app'], default: 'sheet' },
    target:   { type: String, enum: ['WBK', 'WBBM'], required: true },
    eselon1:  { type: String, required: true, enum: ESELON1_LIST },
    eselon2:  { type: String, required: true },
    pic_unit: { type: String, required: true },
    assigned_unit_zi_id: {
      type: Schema.Types.ObjectId,
      ref: 'UpgAdmin',
      default: null,
      index: true,
    },
    catatan:  { type: String, default: '' },

    status: {
      type:    String,
      enum:    ['Belum Dicek', 'Sedang Dicek', 'Selesai', 'Perlu Revisi'],
      default: 'Belum Dicek',
    },
    total_data:       { type: Number, default: 0 },
    checked_count:    { type: Number, default: 0 },
    unchecked_count:  { type: Number, default: 0 },
    progress_percent: { type: Number, default: 0 },

    nilai_lke_ai: {
      _id: false,
      pengungkit: {
        _id: false,
        manajemen_perubahan:     { type: NilaiKomponenSchema, default: () => ({}) },
        penataan_tatalaksana:    { type: NilaiKomponenSchema, default: () => ({}) },
        penataan_sdm:            { type: NilaiKomponenSchema, default: () => ({}) },
        penguatan_akuntabilitas: { type: NilaiKomponenSchema, default: () => ({}) },
        penguatan_pengawasan:    { type: NilaiKomponenSchema, default: () => ({}) },
        peningkatan_pelayanan:   { type: NilaiKomponenSchema, default: () => ({}) },
        total:                   { type: NilaiKomponenSchema, default: () => ({}) },
      },
      hasil: {
        _id: false,
        birokrasi_bersih: {
          _id: false,
          ipak:            { type: NilaiKomponenSchema, default: () => ({}) },
          capaian_kinerja: { type: NilaiKomponenSchema, default: () => ({}) },
          total:           { type: NilaiKomponenSchema, default: () => ({}) },
        },
        pelayanan_prima: {
          _id: false,
          ipkp:  { type: NilaiKomponenSchema, default: () => ({}) },
          total: { type: NilaiKomponenSchema, default: () => ({}) },
        },
        total: { type: NilaiKomponenSchema, default: () => ({}) },
      },
      nilai_akhir:     { type: Number, default: null },
      target_tercapai: { type: Boolean, default: false },
    },

    last_synced_at:  { type: Date, default: null },
    sync_status:     { type: String, enum: ['idle', 'syncing', 'success', 'error'], default: 'idle' },
    sync_error:      { type: String, default: null },
    last_checked_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
)

const LkeSubmission =
  mongoose.models.LkeSubmission ||
  mongoose.model('LkeSubmission', LkeSubmissionSchema)

export default LkeSubmission
