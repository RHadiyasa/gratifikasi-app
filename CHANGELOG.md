# Changelog - Aplikasi Gratifikasi (Kementerian ESDM)

Dokumentasi perubahan dan pembaruan aplikasi dari awal pengembangan hingga saat ini.

---

## [v5.x] - April 2026: Fitur Zona Integritas & LKE Checker

### Fitur Baru
- **Zona Integritas (ZI)** — Menambahkan modul Zona Integritas ke dalam aplikasi, termasuk fitur pemeriksaan Lembar Kerja Evaluasi (LKE).
- **Halaman Detail Unit LKE** — Halaman baru untuk melihat detail evaluasi per unit kerja, dilengkapi dengan filter, tabel data, dan kemampuan export ke Excel.
- **Redesign Tabel Nilai LKE** — Tabel nilai LKE didesain ulang agar menampilkan nilai per komponen secara lebih akurat dan mudah dibaca.
- **Batch Save Otomatis** — Sistem otomatis menyimpan hasil pengecekan setiap 5 item, dilengkapi dengan deteksi jika proses berhenti di tengah jalan sehingga tidak ada data yang hilang.
- **Auto Check Visa** — Fitur pengecekan visa secara otomatis pada proses evaluasi.
- **Fallback Kriteria PANRB** — Jika skor evaluasi terlalu rendah, sistem secara otomatis menggunakan kriteria dari PANRB sebagai fallback agar penilaian tetap relevan.

### Perbaikan Bug
- **Perbaikan Traversal Subfolder** — Sistem sekarang dapat membaca subfolder secara rekursif (masuk ke dalam folder di dalam folder) sehingga semua dokumen terdeteksi.
- **Perbaikan Halaman LKE Checker** — Memperbaiki error pada halaman `/lke-checker`.
- **Perbaikan Query Param Download** — Memperbaiki parameter URL saat proses download agar file yang diunduh sesuai.
- **Penambahan Max Duration 300 detik** — Menambah batas waktu eksekusi menjadi 300 detik (5 menit) agar proses yang berat tidak timeout.

### Keamanan
- **Patch CVE-2025-66478** — Memperbarui Next.js ke versi 15.3.9 untuk menambal celah keamanan kritis pada React Server Components.
- **Perbaikan Kerentanan React Server Components** — Menutup celah keamanan CVE yang ditemukan pada komponen server React.
- **Perbaikan ESLint** — Menyelesaikan error ESLint `jsx-a11y` (aksesibilitas) yang menghalangi proses build.

### Konfigurasi & Deployment
- **Perbaikan Kredensial Google** — Mengubah cara autentikasi Google Sheets dari `GOOGLE_CREDENTIALS_BASE64` menjadi `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` agar lebih kompatibel di environment production (Vercel).
- **Perbaikan Environment Production** — Memperbaiki konfigurasi environment agar aplikasi berjalan dengan benar di server production.

### Peningkatan Tampilan
- **Update UI/UX** — Pembaruan tampilan dan pengalaman pengguna secara keseluruhan.

---

## [v4.0] - November 2025: Versi Mayor dengan Dashboard & Reporting

### Fitur Baru
- **Dashboard** — Menambahkan halaman dashboard untuk melihat ringkasan data gratifikasi secara visual.
- **Tracking Report** — Fitur laporan pelacakan untuk memantau status dan riwayat laporan gratifikasi.
- **Dokumentasi** — Menambahkan halaman dokumentasi sebagai panduan penggunaan aplikasi.

### Perubahan
- **Version 4.0** — Rilis versi mayor baru dengan perombakan dan peningkatan signifikan pada aplikasi.

---

## [v3.x] - Oktober - November 2025: Fitur Export & Public Tracking

### Fitur Baru
- **Export ke Excel** — Menambahkan fitur untuk mengunduh data ke format file Excel (.xlsx).
- **Fitur Download** — Menambahkan fitur download untuk mengunduh file/dokumen terkait gratifikasi.
- **Public Tracking** — Menambahkan halaman pelacakan publik sehingga status laporan bisa dilihat oleh pelapor tanpa harus login.

### Perbaikan Bug
- **Perbaikan Masalah Download** — Memperbaiki bug pada fitur download yang sebelumnya gagal/error.
- **Nonaktifkan Fitur Upload** — Fitur upload sementara dinonaktifkan untuk alasan tertentu.
- **Hapus Console Log** — Membersihkan `console.log` yang tertinggal di kode produksi.

### Perubahan Internal
- **Refactoring Data Source** — Memperbaiki dan menyusun ulang sumber data agar kode lebih bersih dan mudah dikelola.

---

## [v2.x] - Oktober 2025: Stabilisasi & Keamanan

### Perbaikan Bug
- **Perbaikan Token** — Memperbaiki bug terkait token autentikasi yang menyebabkan error saat login atau akses data.
- **Pembersihan Secrets** — Membersihkan kunci rahasia dan memperbarui kredensial keamanan.

### Fitur Baru
- **Upload Sertifikat** — Menambahkan fitur untuk mengunggah sertifikat terkait pelatihan gratifikasi.

### Perubahan Internal
- **Halaman Under Construction** — Menambahkan halaman sementara untuk fitur yang masih dalam pengembangan.
- **Re-deploy Vercel** — Melakukan deployment ulang ke Vercel.

---

## [v1.0] - Oktober 2025: Rilis Awal

### Fitur Awal
- **Initial Commit** — Inisialisasi proyek aplikasi Gratifikasi menggunakan Next.js.
- **Keamanan (Security)** — Menambahkan fitur keamanan dasar pada aplikasi.
- **Fitur Report** — Menyelesaikan fitur pelaporan gratifikasi sebagai fitur utama aplikasi.
- **Middleware** — Menambahkan middleware untuk autentikasi dan otorisasi akses pengguna.

---

## Teknologi yang Digunakan

| Teknologi | Keterangan |
|-----------|------------|
| **Next.js 15** | Framework React untuk frontend & backend |
| **HeroUI** | Library komponen UI |
| **Tailwind CSS** | Framework CSS untuk styling |
| **Google Sheets API** | Integrasi dengan Google Spreadsheet |
| **AWS S3** | Penyimpanan file/dokumen |
| **Anthropic Claude AI** | Integrasi AI untuk fitur pengecekan |
| **Vercel** | Platform deployment |
| **MongoDB (Prisma)** | Database |
