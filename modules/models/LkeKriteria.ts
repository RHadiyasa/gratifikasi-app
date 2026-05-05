import mongoose, { Schema } from 'mongoose'

const KOMPONEN_ENUM    = ['mp', 'tt', 'sdm', 'ak', 'pw', 'pp', 'ipak', 'capaian_kinerja', 'prima'] as const
const ANSWER_TYPE_ENUM = ['ya_tidak', 'abc', 'abcd', 'abcde', 'persen', 'nilai_04', 'jumlah'] as const
const SEKSI_ENUM       = ['pemenuhan', 'reform', 'hasil'] as const
const OP_ENUM          = ['+', '-', '*', '/'] as const
const TOKEN_KIND_ENUM  = ['operand', 'op', 'open_paren', 'close_paren'] as const

// formula_tokens: infix ekspresi matematika dengan dukungan kurung
// Contoh "(A - B) / A": [{kind:'open_paren'}, {kind:'operand',ref:1}, {kind:'op',op:'-'}, {kind:'operand',ref:2}, {kind:'close_paren'}, {kind:'op',op:'/'}, {kind:'operand',ref:1}]
const FormulaTokenSchema = new Schema(
  {
    kind: { type: String, enum: TOKEN_KIND_ENUM, required: true },
    ref:  { type: Number, default: null },
    op:   { type: String, enum: OP_ENUM, default: null },
  },
  { _id: false }
)

const LkeKriteriaSchema = new Schema(
  {
    question_id:        { type: Number, required: true, unique: true },
    parent_question_id: { type: Number, default: null },
    komponen:           { type: String, required: true, enum: KOMPONEN_ENUM },
    seksi:              { type: String, enum: SEKSI_ENUM, default: 'pemenuhan' },
    sub_komponen:       { type: String, required: true, default: '' },
    urutan:             { type: Number, required: true, default: 0 },
    pertanyaan:         { type: String, default: '' },
    standar_dokumen:    { type: String, default: '' },
    kriteria_panrb:     { type: String, default: '' },
    bobot:              { type: Number, required: true },
    answer_type:        { type: String, required: true, enum: ANSWER_TYPE_ENUM },
    // Untuk sub-item jumlah: apakah nilainya dihitung dari sub-item lain
    is_computed:        { type: Boolean, default: false },
    // Formula ekspresi — dipakai di 2 konteks:
    // 1. Sub-item jumlah (is_computed=true): formula atas sub-item lain
    // 2. Parent persen: formula akhir persentase dari sub-item (×100 implied)
    formula_tokens:     { type: [FormulaTokenSchema], default: null },
    // Batasan hasil persen (hanya relevan untuk parent persen)
    formula_min:        { type: Number, default: 0 },
    formula_max:        { type: Number, default: 100 },
    // Untuk parent persen: jika formula mengalami pembagian dengan 0,
    // gunakan formula_max sebagai nilai penuh.
    formula_zero_division_full_score: { type: Boolean, default: false },
    aktif:              { type: Boolean, default: true },
  },
  { timestamps: true }
)

LkeKriteriaSchema.index({ komponen: 1, urutan: 1 })
LkeKriteriaSchema.index({ parent_question_id: 1 })

if (mongoose.models.LkeKriteria) {
  delete (mongoose.models as any).LkeKriteria
}

const LkeKriteria = mongoose.model('LkeKriteria', LkeKriteriaSchema)

export default LkeKriteria
