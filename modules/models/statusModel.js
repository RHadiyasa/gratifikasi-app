import mongoose from "mongoose";

// Ini adalah skema Anda.
// 'sertifikat_status' akan dibuat otomatis
const statusSchema = new mongoose.Schema({
  nip: {
    type: String,
    required: true,
    unique: true, // Pastikan NIP unik
  },
  status: {
    type: String,
    required: true,
    default: "uploaded",
  },
  s3_key: {
    type: String,
    required: true,
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
  },
});

// Cek jika model sudah ada, jika tidak, buat baru.
// Mongoose akan membuat koleksi bernama 'sertifikat_statuses' (jamak)
const Status = mongoose.models.SertifikatStatus || mongoose.model("SertifikatStatus", statusSchema);

export default Status;