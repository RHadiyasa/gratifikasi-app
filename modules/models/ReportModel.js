import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    // Relasi  ke pelapor jika memiliki account

    // Pelapor
    nama: { type: String, trim: true },
    nip: { type: String, trim: true },
    tempatLahir: { type: String, trim: true },
    tanggalLahir: { type: Date },
    instansiPelapor: { type: String, trim: true },
    jabatanPelapor: { type: String, trim: true },
    emailPelapor: { type: String, trim: true },
    alamatPelapor: { type: String, trim: true },
    kecamatanPelapor: { type: String, trim: true },
    kabupatenPelapor: { type: String, trim: true },
    provinsiPelapor: { type: String, trim: true },
    noTelpPelapor: { type: String, trim: true },
    noTelpReferensi: { type: String, trim: true }, // ini optional

    // Pemberi Gratifikasi
    namaPemberi: { type: String, trim: true },
    instansiPemberi: { type: String, trim: true },
    alamatPemberi: { type: String, trim: true },
    relasi: { type: String, trim: true }, // berikan pilihan seperti: keluarga/atasan/identitas tidak diketahui, dan isian lainnya jika tidak ada
    alasan: { type: String, trim: true },

    // Data Penerimaan Gratifikasi
    peristiwaGratifikasi: { type: String, trim: true }, // berikan pilihan, dan lainnya jika tidak ada pilihan
    lokasiObjekGratifikasi: { type: String, trim: true }, // berikan pilihan, dan lainnya jika tidak ada dalam pilihan
    objekGratifikasi: { type: String, trim: true }, // berikan pilihan, dan lainnya jika tidak ada dalam pilihan
    uraianObjekGratifikasi: { type: String, trim: true },
    perkiraanNilai: { type: String, trim: true },

    // Kronologi Gratifikasi
    tanggalPenerimaa: { type: Date },
    tanggalLapor: { type: Date },
    tempatPenerimaan: { type: String, trim: true },
    uraianGratifikasi: { type: String, trim: true },

    // Status
    uniqueId: { type: String, unique: true, required: true },
    status: {
      type: String,
      enum: ["Diajukan", "Diverifikasi", "Diteruskan ke KPK", "Selesai"],
      default: "Diajukan",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
