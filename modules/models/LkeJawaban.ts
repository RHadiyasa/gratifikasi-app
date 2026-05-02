import mongoose, { Schema } from 'mongoose'

const AiResultSchema = new Schema(
  {
    score:          { type: Number, default: null },
    verdict:        { type: String, default: null },
    color:          { type: String, default: null },
    status:         { type: String, default: null },
    reviu:          { type: String, default: null },
    pendapat:       { type: String, default: null },
    temuan_kritis:  { type: String, default: null },
    dokumen_ada:    { type: [String], default: [] },
    dokumen_kurang: { type: [String], default: [] },
    fingerprint:    { type: String, default: null },
    checked_at:     { type: Date, default: null },
    based_on:       { type: String, default: null },
    supervisi:      { type: String, default: null },
  },
  { _id: false }
)

const LkeJawabanSchema = new Schema(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'LkeSubmission', required: true, index: true },
    question_id:   { type: Number, required: true },
    // Pengisian Unit
    jawaban_unit:      { type: String, default: '' },
    narasi:            { type: String, default: '' },
    bukti:             { type: String, default: '' },
    link_drive:        { type: String, default: '' },
    // Review TPI Unit
    jawaban_tpi_unit:  { type: String, default: '' },
    catatan_tpi_unit:  { type: String, default: '' },
    // Review TPI Itjen KESDM
    jawaban_tpi_itjen: { type: String, default: '' },
    catatan_tpi_itjen: { type: String, default: '' },
    ai_result:         { type: AiResultSchema, default: () => ({}) },
  },
  { timestamps: true }
)

LkeJawabanSchema.index({ submission_id: 1, question_id: 1 }, { unique: true })

const LkeJawaban =
  mongoose.models.LkeJawaban ||
  mongoose.model('LkeJawaban', LkeJawabanSchema)

export default LkeJawaban
