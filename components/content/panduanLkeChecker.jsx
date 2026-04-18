"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Info,
  AlertTriangle,
  Zap,
  Coffee,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const alurSteps = [
  {
    title: "Input Data LKE",
    desc: "Daftarkan unit kerja Anda beserta link Google Sheet LKE. Satu kali input, bisa dicek berkali-kali. Seperti KTP — bikin sekali, pakai terus.",
  },
  {
    title: "Cek Struktur Sheet",
    desc: "Sistem membaca sheet Anda dan menghitung berapa data yang sudah dicek, belum dicek, dan yang belum punya link Drive. Anggap ini bagian \"pemanasan\" sebelum olahraga.",
  },
  {
    title: "Jalankan AI Checker",
    desc: "AI membuka satu per satu folder Google Drive, membaca isi file, lalu menilai kesesuaian dokumen dengan standar ZI. Anda tinggal duduk manis sambil minum kopi.",
  },
  {
    title: "Review Hasil di Visa",
    desc: "Hasil pemeriksaan otomatis ditulis ke sheet \"Visa review\" — lengkap dengan skor, catatan, dan status supervisi. Tidak perlu ketik manual satu-satu!",
  },
  {
    title: "Download Laporan",
    desc: "Laporan Excel 3 sheet (Ringkasan, Detail, Statistik) siap diunduh. Bisa juga dikirim otomatis ke email. Tinggal print, tanda tangan, selesai.",
  },
];

const formFields = [
  {
    tag: "1",
    title: "Link Google Sheet LKE",
    desc: "Copy-paste link spreadsheet LKE unit Anda. Pastikan sheet-nya sudah di-share ke akun Google yang terdaftar, ya! Kalau belum di-share, AI-nya juga bingung mau baca apa.",
  },
  {
    tag: "2",
    title: "Target (WBK / WBBM)",
    desc: "Pilih target unit Anda: WBK (Wilayah Bebas dari Korupsi) atau WBBM (Wilayah Birokrasi Bersih dan Melayani). WBK butuh skor minimal 60, WBBM butuh 75.",
  },
  {
    tag: "3",
    title: "Eselon I & Eselon II",
    desc: "Pilih induk organisasi (Eselon I) dan isi nama unit kerja (Eselon II). Ini penting agar data tidak tertukar dengan unit lain — apalagi kalau namanya mirip-mirip.",
  },
  {
    tag: "4",
    title: "PIC Unit (Opsional)",
    desc: "Nama penanggung jawab unit. Opsional, tapi berguna kalau suatu saat perlu dihubungi. \"Pak siapa ya yang ngurus ini?\" — nah, ini jawabannya.",
  },
  {
    tag: "5",
    title: "Catatan (Opsional)",
    desc: "Tambahkan catatan jika ada hal khusus. Misalnya: \"Sheet ini masih draft\" atau \"Folder Drive-nya belum lengkap, sabar ya AI.\"",
  },
];

const kolSheetLke = [
  {
    kolom: "A",
    fungsi: "ID",
    desc: "Nomor urut pertanyaan LKE. AI menggunakan ini sebagai kode referensi.",
  },
  {
    kolom: "M",
    fungsi: "Bukti Data Dukung",
    desc: "Deskripsi dokumen yang diminta. Contoh: \"SK Tim Kerja ZI\".",
  },
  {
    kolom: "N",
    fungsi: "Link Google Drive",
    desc: "Link ke folder Google Drive yang berisi file bukti. Ini yang akan dibuka dan dibaca oleh AI. Pastikan link-nya mengarah ke folder, bukan file tunggal.",
  },
];

const kolVisaReview = [
  { kolom: "A", fungsi: "ID", desc: "Sama dengan ID di sheet LKE — sebagai penghubung data." },
  { kolom: "B", fungsi: "Bukti Data", desc: "Nama bukti data yang dicek." },
  { kolom: "C", fungsi: "Link Dicek", desc: "Link Drive yang benar-benar dibuka AI saat pengecekan." },
  { kolom: "D", fungsi: "Fingerprint", desc: "\"Sidik jari\" folder — berubah kalau ada file yang ditambah/diubah. Canggih, kan?" },
  { kolom: "E", fungsi: "Result AI", desc: "Hasil penilaian: Sesuai, Sebagian Sesuai, atau Tidak Sesuai." },
  { kolom: "F", fungsi: "Reviu AI", desc: "Catatan lengkap dari AI: file apa yang ada, apa yang kurang, dan komentarnya." },
  { kolom: "G", fungsi: "Status Supervisi", desc: "Dropdown pilihan: \"Sudah Dicek AI\" atau \"Revisi\". Ubah ke Revisi kalau mau AI cek ulang." },
  { kolom: "H", fungsi: "Tanggal Cek", desc: "Kapan terakhir dicek. Bukti bahwa AI-nya rajin bekerja." },
  { kolom: "I", fungsi: "Komponen", desc: "Komponen LKE yang terkait (misal: Manajemen Perubahan)." },
  { kolom: "J", fungsi: "Bobot", desc: "Bobot pertanyaan dalam penilaian ZI." },
  { kolom: "K", fungsi: "Nilai AI", desc: "Skor kontribusi untuk nilai akhir LKE AI." },
];

const statusExplain = [
  {
    status: "Belum Dicek",
    color: "text-default-500",
    bg: "bg-default-100",
    border: "border-default-200",
    desc: "Data belum pernah diproses AI. Masih \"perawan\" — belum disentuh mesin.",
  },
  {
    status: "Sedang Dicek",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    desc: "AI sedang bekerja memproses data Anda. Sabar, jangan di-refresh terus. AI-nya juga butuh konsentrasi.",
  },
  {
    status: "Selesai",
    color: "text-green-600",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    desc: "Semua data sudah dicek. Hasil bisa dilihat di halaman detail atau di sheet Visa review.",
  },
  {
    status: "Perlu Revisi",
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    desc: "Ada item yang statusnya diubah ke \"Revisi\" di sheet Visa review. Jalankan AI Checker lagi, maka item tersebut akan dicek ulang.",
  },
];

const fiturCanggih = [
  {
    title: "Deteksi Link Berubah",
    desc: "Kalau Anda ganti link Drive di sheet LKE, AI otomatis tahu dan akan mengecek ulang item tersebut di run berikutnya. Tidak perlu hapus data lama.",
  },
  {
    title: "Deteksi Konten Berubah (Fingerprint)",
    desc: "Centang opsi \"Deteksi perubahan konten\" saat menjalankan checker. AI akan membandingkan \"sidik jari\" folder — kalau ada file baru atau file diubah, item dicek ulang. Fitur ini agak lambat karena AI harus buka semua folder, jadi gunakan seperlunya.",
  },
  {
    title: "Status Revisi",
    desc: "Buka sheet \"Visa review\", ubah kolom G (Status Supervisi) dari \"Sudah Dicek AI\" menjadi \"Revisi\" pada baris yang ingin dicek ulang. Di run berikutnya, AI akan memprioritaskan item ini.",
  },
  {
    title: "Mulai dari ID Tertentu",
    desc: "Tidak harus selalu mulai dari awal. Isi \"Mulai dari ID\" di konfigurasi, maka AI akan melompat ke ID tersebut. Berguna kalau proses sebelumnya terhenti di tengah jalan (misalnya internet mati atau laptop ketiduran).",
  },
  {
    title: "Batch Save Otomatis",
    desc: "AI menyimpan hasil setiap 5 item ke sheet. Jadi kalau proses terputus, data yang sudah dicek tidak hilang. Seperti auto-save di game — progress Anda aman.",
  },
  {
    title: "Laporan Email Otomatis",
    desc: "Isi alamat email di konfigurasi, maka setelah selesai, laporan Excel akan dikirim otomatis. Cocok kalau mau langsung forward ke atasan tanpa repot download-upload.",
  },
];

const faqItems = [
  {
    q: "Berapa lama proses pengecekan?",
    a: "Tergantung jumlah data. Setiap item butuh sekitar 3-5 detik (AI baca folder + analisis). Untuk 100 item, sekitar 5-8 menit. Sempat buat bikin kopi dulu.",
  },
  {
    q: "Apakah sheet LKE asli akan diubah oleh AI?",
    a: "Tidak! Sheet LKE Anda aman dan tidak disentuh. AI hanya MEMBACA dari sheet LKE (kolom A, M, N) dan MENULIS ke sheet terpisah bernama \"Visa review\" dan \"Ringkasan AI\". Sheet asli Anda tetap bersih seperti semula.",
  },
  {
    q: "Kenapa ada item yang skornya 0 padahal folder-nya ada isinya?",
    a: "Kemungkinan: (1) File di folder tidak relevan dengan standar yang diminta, (2) AI tidak bisa membaca format file tertentu (misalnya gambar atau video), atau (3) Nama file tidak mengandung kata kunci yang sesuai. Coba rename file-nya agar lebih deskriptif.",
  },
  {
    q: "Bisa cek ulang item tertentu saja tanpa mengulang semuanya?",
    a: "Bisa! Ada 3 cara: (1) Ubah Status Supervisi ke \"Revisi\" di Visa review, (2) Ganti link Drive di sheet LKE, atau (3) Isi \"Mulai dari ID\" saat menjalankan checker. AI hanya akan memproses item yang memang perlu dicek ulang.",
  },
  {
    q: "Sheet saya tidak bisa dibaca / error \"credentials\"?",
    a: "Pastikan Google Sheet sudah di-share (beri akses view/edit) ke akun service Google yang digunakan sistem. Hubungi admin jika tidak tahu email service account-nya.",
  },
  {
    q: "Nilai LKE AI kok beda dengan nilai resmi dari penilai?",
    a: "Wajar! Nilai AI adalah estimasi berdasarkan keberadaan dan kesesuaian dokumen. Penilai resmi melihat banyak aspek lain yang tidak bisa dinilai AI (seperti wawancara, observasi, dll). Anggap nilai AI sebagai \"cermin latihan\" sebelum penilaian resmi.",
  },
];

// ─── Komponen Kecil ──────────────────────────────────────────────────────────

function SectionHeading({ number, title }) {
  return (
    <div className="flex items-baseline gap-4 mb-8">
      <span className="text-5xl font-black text-primary/15 leading-none select-none tabular-nums">
        {String(number).padStart(2, "0")}
      </span>
      <h2 className="text-2xl font-bold">{title}</h2>
    </div>
  );
}

function InfoCard({ children, variant = "default" }) {
  const styles = {
    default: "bg-default-50 dark:bg-default-100/5 border-default-200",
    accent:  "bg-primary/5 border-primary/20",
    warn:    "bg-amber-500/5 border-amber-500/20",
    green:   "bg-green-500/5 border-green-500/20",
  };
  return (
    <div className={`rounded-2xl border p-5 ${styles[variant]}`}>
      {children}
    </div>
  );
}

// ─── Sections config (untuk sidebar) ─────────────────────────────────────────

export const lkeCheckerSections = [
  { id: "lke-apa",       label: "Apa Itu LKE Checker?" },
  { id: "lke-alur",      label: "Alur Pengecekan" },
  { id: "lke-input",     label: "Input Data LKE" },
  { id: "lke-struktur",  label: "Struktur Sheet" },
  { id: "lke-jalankan",  label: "Menjalankan AI" },
  { id: "lke-hasil",     label: "Membaca Hasil" },
  { id: "lke-visa",      label: "Sheet Visa Review" },
  { id: "lke-status",    label: "Status & Progress" },
  { id: "lke-fitur",     label: "Fitur Lanjutan" },
  { id: "lke-faq",       label: "FAQ" },
];

// ─── Main ────────────────────────────────────────────────────────────────────

export default function PanduanLkeChecker() {
  return (
    <div className="space-y-24 min-w-0">

      {/* 1. Apa Itu LKE Checker */}
      <motion.section
        id="lke-apa"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={1} title="Apa Itu LKE Checker?" />
        <p className="text-default-600 leading-relaxed mb-4">
          <strong>LKE Checker</strong> adalah fitur yang menggunakan kecerdasan buatan (AI)
          untuk memeriksa kelengkapan dan kesesuaian dokumen data dukung Zona Integritas
          secara otomatis. Bayangkan punya asisten yang tidak pernah lelah, tidak pernah
          minta cuti, dan bisa membaca ratusan dokumen dalam hitungan menit.
        </p>
        <p className="text-default-600 leading-relaxed mb-6">
          AI akan membaca sheet LKE Anda, membuka satu per satu folder Google Drive
          yang berisi bukti data dukung, lalu menilai apakah dokumen yang ada sudah
          sesuai dengan standar yang ditetapkan. Hasilnya ditulis langsung ke Google Sheet
          Anda di tab terpisah bernama <strong>&quot;Visa review&quot;</strong>.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {[
            ["Otomatis", "AI membaca dan menilai dokumen — Anda tidak perlu buka folder satu-satu."],
            ["Tidak Mengubah Sheet Asli", "Sheet LKE Anda aman! Hasil ditulis di tab terpisah."],
            ["Real-time Progress", "Pantau proses pengecekan secara langsung di layar, seperti nonton sinetron tapi lebih produktif."],
            ["Laporan Instan", "Excel 3 sheet + email otomatis. Tinggal print dan tanda tangan."],
            ["Cek Ulang Mudah", "Item yang perlu revisi bisa dicek ulang tanpa mengulang semuanya."],
            ["Nilai Prediksi", "Dapatkan estimasi skor LKE sebelum penilaian resmi — seperti try-out sebelum ujian."],
          ].map(([title, desc]) => (
            <InfoCard key={title}>
              <div className="flex gap-3">
                <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold mb-0.5">{title}</p>
                  <p className="text-xs text-default-500">{desc}</p>
                </div>
              </div>
            </InfoCard>
          ))}
        </div>
      </motion.section>

      {/* 2. Alur Pengecekan */}
      <motion.section
        id="lke-alur"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={2} title="Alur Pengecekan (Gambaran Besar)" />
        <p className="text-default-600 leading-relaxed mb-4">
          Keseluruhan proses cukup 5 langkah. Tidak perlu jadi ahli IT — kalau Anda
          bisa copy-paste link dan klik tombol, Anda sudah cukup qualified.
        </p>
        <InfoCard variant="warn">
          <div className="flex gap-3">
            <Coffee size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-default-600 leading-relaxed">
              <strong>Tips Pro:</strong> Siapkan kopi atau camilan sebelum memulai.
              Proses AI butuh beberapa menit tergantung jumlah data.
              Waktu yang sempurna untuk istirahat sejenak dari layar.
            </p>
          </div>
        </InfoCard>
        <div className="relative space-y-0 mt-8">
          {alurSteps.map((step, i) => (
            <div key={i} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 z-10">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                {i < alurSteps.length - 1 && (
                  <div className="w-px flex-1 bg-default-200 my-1" />
                )}
              </div>
              <div className="pb-6">
                <p className="font-semibold text-sm mb-1 mt-1.5">{step.title}</p>
                <p className="text-xs text-default-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 3. Input Data LKE */}
      <motion.section
        id="lke-input"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={3} title="Input Data LKE (Langkah 1)" />
        <p className="text-default-600 leading-relaxed mb-4">
          Buka halaman <strong>LKE Checker</strong> lalu klik tab <strong>&quot;Input LKE&quot;</strong>.
          Isi form berikut dengan data unit kerja Anda. Tenang, form-nya pendek kok — tidak
          seperti form pajak.
        </p>
        <div className="space-y-3">
          {formFields.map((s, i) => (
            <motion.div
              key={s.tag}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex gap-4 p-4 rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5 hover:border-primary/30 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                {s.tag}
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5">{s.title}</p>
                <p className="text-xs text-default-500 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4">
          <InfoCard variant="accent">
            <div className="flex gap-3">
              <Info size={16} className="text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-default-600 leading-relaxed">
                Setelah klik <strong>&quot;Tambah &amp; Parse LKE&quot;</strong>, sistem akan membaca
                sheet Anda dan menampilkan ringkasan nilai komponen. Jika ada error,
                periksa apakah link sudah benar dan sheet sudah di-share.
              </p>
            </div>
          </InfoCard>
        </div>
      </motion.section>

      {/* 4. Struktur Sheet */}
      <motion.section
        id="lke-struktur"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={4} title="Struktur Sheet yang Perlu Diketahui" />
        <p className="text-default-600 leading-relaxed mb-6">
          AI membaca kolom-kolom tertentu dari sheet LKE Anda. Pastikan data Anda ada
          di kolom yang benar, karena AI itu pintar tapi bukan paranormal —
          dia tidak bisa menebak kalau data Anda taruh di kolom yang salah.
        </p>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            Kolom yang DIBACA dari Sheet LKE
          </p>
          <div className="space-y-2">
            {kolSheetLke.map((k) => (
              <div key={k.kolom} className="flex gap-3 p-3 rounded-xl border border-default-200 bg-default-50 dark:bg-default-100/5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{k.kolom}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{k.fungsi}</p>
                  <p className="text-xs text-default-500 leading-relaxed">{k.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <InfoCard variant="green">
          <div className="flex gap-3">
            <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-default-600 leading-relaxed">
              <strong>Kabar Baik:</strong> Sheet LKE asli Anda <strong>TIDAK AKAN DIUBAH</strong> oleh
              AI. Semua hasil ditulis ke sheet baru bernama &quot;Visa review&quot; dan &quot;Ringkasan AI&quot;
              yang dibuat otomatis. Sheet asli Anda tetap bersih dan utuh.
            </p>
          </div>
        </InfoCard>
      </motion.section>

      {/* 5. Menjalankan AI */}
      <motion.section
        id="lke-jalankan"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={5} title="Menjalankan AI Checker (Langkah 2 & 3)" />
        <p className="text-default-600 leading-relaxed mb-6">
          Setelah unit terdaftar, saatnya menjalankan si AI. Klik tab
          <strong> &quot;AI Checker&quot;</strong> di halaman LKE Checker.
        </p>

        <div className="space-y-6">
          {/* Step A */}
          <div>
            <p className="text-sm font-bold mb-3 text-primary">A. Pilih Unit & Cek Sheet</p>
            <div className="space-y-2">
              {[
                "Pilih unit dari dropdown di \"Langkah 1: Pilih Unit\"",
                "Klik tombol \"Cek Sheet\" — sistem akan membaca struktur sheet",
                "Anda akan melihat: total data, sudah dicek, belum dicek, tanpa link Drive",
                "Jika ada yang \"Tanpa Link\" berarti ada baris di sheet yang belum diisi link folder Drive-nya",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-default-600">
                  <ArrowRight size={12} className="text-primary shrink-0 mt-1" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step B */}
          <div>
            <p className="text-sm font-bold mb-3 text-primary">B. Konfigurasi & Jalankan</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ["Batas Data", "Isi angka kalau mau cek sebagian dulu (misal: 10 untuk coba-coba). Kosongkan untuk cek semua."],
                ["Mulai dari ID", "Otomatis terisi ID pertama yang belum dicek. Ubah kalau mau mulai dari ID tertentu."],
                ["Email Laporan", "Isi email kalau mau laporan Excel dikirim otomatis setelah selesai."],
                ["Deteksi Perubahan Konten", "Centang kalau ingin AI mengecek ulang folder yang isinya berubah. Agak lambat, tapi teliti."],
              ].map(([title, desc]) => (
                <InfoCard key={title}>
                  <p className="text-sm font-semibold mb-1">{title}</p>
                  <p className="text-xs text-default-500 leading-relaxed">{desc}</p>
                </InfoCard>
              ))}
            </div>
          </div>

          {/* Step C */}
          <div>
            <p className="text-sm font-bold mb-3 text-primary">C. Klik &quot;Mulai Pemeriksaan AI&quot;</p>
            <InfoCard variant="accent">
              <div className="flex gap-3">
                <Zap size={16} className="text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-default-600 leading-relaxed">
                  <p className="mb-2">
                    Setelah klik tombol, Anda akan melihat <strong>progress bar</strong> dan
                    <strong> log real-time</strong> di layar. Warna log:
                  </p>
                  <div className="space-y-1">
                    <p><span className="text-green-600 font-semibold">Hijau</span> = berhasil, dokumen sesuai</p>
                    <p><span className="text-amber-600 font-semibold">Kuning</span> = sebagian sesuai, ada yang kurang</p>
                    <p><span className="text-red-600 font-semibold">Merah</span> = tidak sesuai atau error</p>
                    <p><span className="text-blue-600 font-semibold">Biru</span> = informasi proses</p>
                  </div>
                </div>
              </div>
            </InfoCard>
          </div>
        </div>

        <div className="mt-6">
          <InfoCard variant="warn">
            <div className="flex gap-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-default-600 leading-relaxed">
                <strong>Jangan tutup browser</strong> selama proses berjalan!
                Tapi tenang, kalau terputus di tengah jalan, data yang sudah dicek
                tetap tersimpan. Cukup jalankan lagi dan AI akan melanjutkan dari
                item yang belum dicek.
              </p>
            </div>
          </InfoCard>
        </div>
      </motion.section>

      {/* 6. Membaca Hasil */}
      <motion.section
        id="lke-hasil"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={6} title="Membaca Hasil Pengecekan" />
        <p className="text-default-600 leading-relaxed mb-6">
          Setelah AI selesai bekerja (atau saat proses berjalan), Anda bisa melihat
          hasil di beberapa tempat. Pilih yang paling nyaman untuk Anda.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <InfoCard variant="accent">
            <p className="text-sm font-semibold mb-2 text-primary">Di Layar (Real-time)</p>
            <div className="space-y-1.5 text-xs text-default-500">
              <p>Ringkasan muncul setelah proses selesai: total item, sesuai, sebagian, dan tidak sesuai.</p>
              <p>Tombol <strong>&quot;Download Laporan Excel&quot;</strong> langsung tersedia.</p>
            </div>
          </InfoCard>
          <InfoCard>
            <p className="text-sm font-semibold mb-2">Di Halaman Detail</p>
            <div className="space-y-1.5 text-xs text-default-500">
              <p>Klik ikon detail di daftar unit untuk masuk ke halaman lengkap.</p>
              <p>Ada tabel dengan <strong>6 tab filter</strong>: Semua, Perlu Tindak Lanjut, Belum Dicek, Tanpa Link, Revisi, dan Sesuai.</p>
            </div>
          </InfoCard>
          <InfoCard>
            <p className="text-sm font-semibold mb-2">Di Google Sheet</p>
            <div className="space-y-1.5 text-xs text-default-500">
              <p>Buka Google Sheet Anda, cek tab <strong>&quot;Visa review&quot;</strong> dan <strong>&quot;Ringkasan AI&quot;</strong>.</p>
              <p>Data lengkap per baris ada di sana — bisa langsung di-filter atau di-sort pakai fitur Google Sheet.</p>
            </div>
          </InfoCard>
          <InfoCard variant="accent">
            <p className="text-sm font-semibold mb-2 text-primary">Via Email</p>
            <div className="space-y-1.5 text-xs text-default-500">
              <p>Jika Anda mengisi email saat konfigurasi, laporan Excel akan dikirim otomatis.</p>
              <p>Tinggal buka email, download attachment, print, selesai!</p>
            </div>
          </InfoCard>
        </div>

        <InfoCard>
          <p className="text-sm font-semibold mb-2">Arti Warna Hasil AI</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            {[
              { label: "Sesuai", color: "bg-green-500/10 border-green-500/30 text-green-700", desc: "Skor 70-100. Dokumen lengkap dan sesuai standar." },
              { label: "Sebagian Sesuai", color: "bg-amber-500/10 border-amber-500/30 text-amber-700", desc: "Skor 40-69. Ada dokumen tapi belum lengkap." },
              { label: "Tidak Sesuai", color: "bg-red-500/10 border-red-500/30 text-red-700", desc: "Skor 0-39. Dokumen tidak ada atau sangat tidak sesuai." },
            ].map((item) => (
              <div key={item.label} className={`p-3 rounded-xl border ${item.color}`}>
                <p className="text-sm font-bold mb-1">{item.label}</p>
                <p className="text-xs opacity-80">{item.desc}</p>
              </div>
            ))}
          </div>
        </InfoCard>
      </motion.section>

      {/* 7. Sheet Visa Review */}
      <motion.section
        id="lke-visa"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={7} title="Sheet Visa Review (Jantungnya Sistem)" />
        <p className="text-default-600 leading-relaxed mb-4">
          Semua hasil AI ditulis ke sheet <strong>&quot;Visa review&quot;</strong> di Google Sheet Anda.
          Sheet ini adalah &quot;catatan kerja&quot; AI — di sinilah Anda bisa melihat detail
          lengkap setiap item yang dicek.
        </p>
        <p className="text-default-600 leading-relaxed mb-6">
          Berikut penjelasan setiap kolom (jangan panik, ada 11 kolom tapi
          Anda hanya perlu perhatikan 3-4 kolom saja):
        </p>

        <div className="space-y-2">
          {kolVisaReview.map((k, i) => (
            <motion.div
              key={k.kolom}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="flex gap-3 p-3 rounded-xl border border-default-200 bg-default-50 dark:bg-default-100/5"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{k.kolom}</span>
              </div>
              <div>
                <p className="text-sm font-semibold">{k.fungsi}</p>
                <p className="text-xs text-default-500 leading-relaxed">{k.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6">
          <InfoCard variant="accent">
            <div className="flex gap-3">
              <Info size={16} className="text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-default-600 leading-relaxed">
                <strong>Kolom yang paling penting untuk Anda:</strong> E (Result AI), F (Reviu AI),
                dan G (Status Supervisi). Sisanya biarkan saja — itu untuk keperluan teknis AI.
                Anggap kolom lainnya sebagai &quot;dapur&quot; yang tidak perlu Anda masuki.
              </p>
            </div>
          </InfoCard>
        </div>
      </motion.section>

      {/* 8. Status & Progress */}
      <motion.section
        id="lke-status"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={8} title="Status & Progress Pengecekan" />
        <p className="text-default-600 leading-relaxed mb-8">
          Setiap unit yang didaftarkan memiliki status yang menunjukkan sejauh mana
          proses pengecekan sudah berjalan. Berikut arti masing-masing status:
        </p>

        <div className="relative">
          <div className="hidden md:block absolute top-6 left-6 right-6 h-px bg-default-200 z-0" />
          <div className="grid md:grid-cols-4 gap-4 relative z-10">
            {statusExplain.map((s, i) => (
              <motion.div
                key={s.status}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className={`p-4 rounded-2xl border ${s.bg} ${s.border}`}
              >
                <div className={`w-12 h-12 rounded-full ${s.bg} border ${s.border} flex items-center justify-center mb-3`}>
                  <span className={`text-lg font-black ${s.color}`}>{i + 1}</span>
                </div>
                <p className={`text-sm font-bold mb-1 ${s.color}`}>{s.status}</p>
                <p className="text-xs text-default-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <InfoCard>
            <p className="text-sm font-semibold mb-2">Progress Bar</p>
            <p className="text-xs text-default-500 leading-relaxed mb-3">
              Di daftar unit dan halaman detail, Anda akan melihat progress bar yang menunjukkan
              persentase data yang sudah dicek. Contoh: <strong>85/100 (85%)</strong> berarti
              85 dari 100 item sudah diperiksa AI.
            </p>
            <div className="w-full bg-default-200 rounded-full h-3">
              <div className="bg-primary rounded-full h-3 transition-all" style={{ width: "85%" }} />
            </div>
            <p className="text-xs text-default-400 mt-1.5 text-right">85 dari 100 data sudah dicek</p>
          </InfoCard>
        </div>
      </motion.section>

      {/* 9. Fitur Lanjutan */}
      <motion.section
        id="lke-fitur"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={9} title="Fitur Lanjutan (Untuk yang Sudah Mahir)" />
        <p className="text-default-600 leading-relaxed mb-6">
          Sudah paham dasarnya? Bagus! Berikut fitur-fitur canggih yang bisa Anda manfaatkan.
          Tidak wajib digunakan, tapi kalau sudah terbiasa, hidup Anda akan jauh lebih mudah.
        </p>

        <div className="space-y-3">
          {fiturCanggih.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <InfoCard>
                <div className="flex gap-3">
                  <Zap size={16} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold mb-1">{f.title}</p>
                    <p className="text-xs text-default-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </InfoCard>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 10. FAQ */}
      <motion.section
        id="lke-faq"
        className="scroll-mt-28"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeading number={10} title="Pertanyaan yang Sering Ditanyakan" />
        <p className="text-default-600 leading-relaxed mb-6">
          Kumpulan pertanyaan yang sering muncul saat rapat koordinasi, chat WhatsApp grup,
          atau bisik-bisik di lorong kantor.
        </p>

        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <details key={i} className="group rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5 overflow-hidden">
              <summary className="flex items-center gap-3 p-4 cursor-pointer select-none hover:bg-default-100/60 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">?</span>
                </div>
                <span className="text-sm font-semibold flex-1">{item.q}</span>
                <ArrowRight size={14} className="text-default-400 transition-transform group-open:rotate-90 shrink-0" />
              </summary>
              <div className="px-4 pb-4 pt-0 pl-[3.25rem]">
                <p className="text-xs text-default-500 leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </motion.section>

      {/* CTA bottom */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-primary/20 bg-primary/5 p-10 text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
          Siap mencoba?
        </p>
        <h3 className="text-2xl font-bold mb-3">Mulai Cek Data Dukung ZI</h3>
        <p className="text-default-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">
          Biarkan AI yang bekerja keras membaca dokumen.
          Anda fokus pada hal yang lebih penting — seperti menentukan strategi
          peningkatan integritas unit Anda.
        </p>
        <a
          href="/zona-integritas/lke-checker"
          className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors text-sm"
        >
          Buka LKE Checker <ArrowRight size={14} />
        </a>
      </motion.div>
    </div>
  );
}
