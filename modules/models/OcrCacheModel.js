import mongoose, { Schema } from "mongoose";

// Cache hasil ekstraksi teks/OCR file Google Drive.
// Kunci: file_id + modified_time — file yang berubah otomatis di-OCR ulang.
const OcrCacheSchema = new Schema({
  file_id:       { type: String, required: true },
  modified_time: { type: String, default: "" },
  text:          { type: String, default: "" },
  created_at:    { type: Date, default: Date.now },
});

OcrCacheSchema.index({ file_id: 1, modified_time: 1 }, { unique: true });

const OcrCache =
  mongoose.models.OcrCache ||
  mongoose.model("OcrCache", OcrCacheSchema);

export default OcrCache;
