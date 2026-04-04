import mongoose, { Schema } from 'mongoose'

const LkeSyncLogSchema = new Schema({
  submission_id:        { type: Schema.Types.ObjectId, ref: 'LkeSubmission', required: true },
  triggered_by:         { type: String, required: true },
  status:               { type: String, enum: ['success', 'error'], required: true },
  nilai_akhir_sebelum:  { type: Number, default: null },
  nilai_akhir_sesudah:  { type: Number, default: null },
  error_message:        { type: String, default: null },
  synced_at:            { type: Date, default: Date.now },
})

const LkeSyncLog =
  mongoose.models.LkeSyncLog ||
  mongoose.model('LkeSyncLog', LkeSyncLogSchema)

export default LkeSyncLog
