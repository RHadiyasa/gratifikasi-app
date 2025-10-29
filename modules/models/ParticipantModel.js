import mongoose from "mongoose";

// Skema untuk Peserta Elearning
const ElearningParticipantSchema = new mongoose.Schema({
  // Bidang yang sesuai dengan data Anda
  nama: {
    type: String,
    required: true,
  },
  nip: {
    type: String,
    required: true,
    unique: true,
  },
  jabatan: {
    type: String,
  },
  unit_eselon_ii: {
    type: String,
  },
  unit_eselon_i: {
    type: String,
  },
  // Bidang tambahan: batch
  batch: {
    type: String,
  },
  statusCourse: {
    type: String,
    enum: ["Belum", "Sudah"],
  },
  s3_key: {
    type: String,
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
  },
  // Bidang tambahan: timestamp (opsional, tetapi baik untuk tracking)
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Membuat model dari skema
const ElearningParticipant =
  mongoose.models.ElearningParticipant ||
  mongoose.model("ElearningParticipant", ElearningParticipantSchema);

export default ElearningParticipant;
