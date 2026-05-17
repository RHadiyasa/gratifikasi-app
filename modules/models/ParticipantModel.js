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
  batch: {
    type: String,
    index: true,
  },
  tahun: {
    type: Number,
    index: true,
  },
  statusCourse: {
    type: String,
    enum: ["Belum", "Sudah", "Diverifikasi"],
    default: "Belum",
  },
  s3_key: {
    type: String,
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
  },
  verified_at: {
    type: Date,
    default: null,
  },
  verified_by: {
    type: String,
    default: null,
  },
  verify_note: {
    type: String,
    default: "",
  },
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
