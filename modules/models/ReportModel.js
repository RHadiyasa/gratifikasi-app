import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    // Relasi  ke pelapor jika memiliki account
    secretReport: { type: Boolean, required: true },
    reportType: {
      type: String,
      enum: ["Laporan Penerimaan", "Laporan Penolakan"],
    },

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
    relasi: {
      type: String,
      enum: [
        "Merupakan Pemberan dalam keluarga",
        "Penyedia Barang & Jasa/Penerima Layanan/terkait Pengawasan/Pemeriksaan",
        "Antara sesama Pegawai di lingkungan internal instansi",
        "Identitas Pemberi tidak diketahui",
        "Lainnya",
      ],
      trim: true,
    }, // berikan pilihan seperti: keluarga/atasan/identitas tidak diketahui, dan isian lainnya jika tidak ada
    relasiLainnya: { type: String, trim: true },
    alasan: { type: String, trim: true },

    // Data Penerimaan Gratifikasi
    peristiwaGratifikasi: {
      type: String,
      enum: [
        "Pemberian dalam rangka pisah sambut/pensiun/mutasi jabatan/ulang tahun",
        "Pemberian terkait dengan pelaksanaan Tugas Pokok dan Fungsi (Tupoksi)",
        "Pemberian tidak terkait dengan pelaksanaan Tugas Pokok dan Fungsi (Tupoksi)",
        "Pemberian terkait dengan pernikahan/upacara adat/agama lainnya atau terkait musibah/bencana (Lebih dari 1,000,000 per Orang)",
        "Keuntungan Investasi/Manfaat dari Koperasi/Hadiah Undian atau Langsung",
        "Lainnya",
      ],
      trim: true,
    }, // berikan pilihan, dan lainnya jika tidak ada pilihan
    peristiwaGratifikasiLainnya: { type: String, trim: true },

    lokasiObjekGratifikasi: {
      type: String,
      enum: [
        "Disimpan Pelapor",
        "Dititipkan di UPG",
        "Dititipkan di KPK",
        "Lainnya",
      ],
      trim: true,
    }, // berikan pilihan, dan lainnya jika tidak ada dalam pilihan
    lokasiObjekGratifikasiLainnya: { type: String, trim: true }, // berikan pilihan, dan lainnya jika tidak ada dalam pilihan

    objekGratifikasi: {
      type: String,
      enum: [
        "Hidangan/Oleh-oleh/Makanan/Minuman kemasan dengan masa berlaku",
        "Karangan Bunga/Cindera mata/Plakat/Barang dengan logo instansi pemberi",
        "Barang lainnya",
        "Tiket Perjalanan/Fasilitas Penginapan/Fasilitas lainnya",
        "Uang/Alat tukar lainnya",
        "Lainnya",
      ],
      trim: true,
    }, // berikan pilihan, dan lainnya jika tidak ada dalam pilihan
    objekGratifikasiLainnya: { type: String, trim: true }, // berikan pilihan, dan lainnya jika tidak ada dalam pilihan

    uraianObjekGratifikasi: { type: String, trim: true },
    perkiraanNilai: { type: String, trim: true },

    // Kronologi Gratifikasi
    tanggalPenerimaan: { type: Date },
    tanggalLapor: { type: Date },
    tempatPenerimaan: { type: String, trim: true },
    uraianGratifikasi: { type: String, trim: true },

    // Permohonan
    kompensasiPelaporan: { type: Boolean, required: true },

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
