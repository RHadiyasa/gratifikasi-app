# Pencegahan Korupsi

Aplikasi internal berbasis Next.js untuk mendukung pengelolaan pencegahan korupsi, pelaporan gratifikasi, e-learning, serta pemeriksaan Zona Integritas/LKE.

## About Developer

Aplikasi ini dibuat oleh Rafi Hadiyasa dari Inspektorat V.

## Fitur Utama

- Dashboard admin untuk pengelolaan pengguna, laporan, dan modul aplikasi.
- Modul pelaporan gratifikasi dan monitoring data.
- Modul e-learning untuk peserta, upload data, dan tracking sertifikat.
- Modul Zona Integritas/LKE untuk input jawaban, master kriteria, sinkronisasi Google Sheet, pemeriksaan AI, dan export laporan Excel.
- VISA sebagai asisten pemeriksaan data dukung ZI/LKE berbasis AI.

## Tech Stack

- Next.js 15 dengan App Router
- React 18
- TypeScript dan JavaScript
- HeroUI dan Tailwind CSS
- MongoDB dengan Mongoose
- Google APIs untuk integrasi Google Sheet/Drive
- AWS S3 untuk penyimpanan file
- ExcelJS/XLSX untuk import dan export Excel
- Anthropic SDK untuk pemeriksaan AI

## Kebutuhan Lokal

- Node.js versi 20 atau lebih baru
- npm
- MongoDB
- Kredensial Google Service Account jika memakai fitur Google Sheet/Drive
- Kredensial AWS S3 jika memakai upload/download file
- API key AI jika memakai fitur VISA/AI checker

## Instalasi

```bash
npm install
```

Buat file environment lokal, misalnya `.env` atau `.env.local`, lalu isi variabel yang dibutuhkan.

```env
MONGODB_URI=
MONGODB_DB=
TOKEN_SECRET=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET_NAME=

GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_CREDENTIALS_FILE=

ANTHROPIC_API_KEY=

ZI_STANDARISASI_SHEET_ID=
ZI_STANDARISASI_SHEET_NAME=
ZI_EMAIL_FROM=
ZI_EMAIL_PASS=
```

Catatan: sesuaikan hanya variabel yang benar-benar dipakai oleh fitur yang dijalankan.

## Menjalankan Aplikasi

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Start production:

```bash
npm start
```

Lint dengan auto-fix:

```bash
npm run lint
```

## Modul Zona Integritas/LKE

Beberapa halaman penting:

- `/zona-integritas/lke-checker` untuk daftar submission LKE.
- `/zona-integritas/lke-checker/[id]` untuk hasil pengecekan dan monitoring submission.
- `/zona-integritas/lke-checker/[id]/input` untuk input jawaban LKE.
- `/dashboard/zi/kriteria` untuk master kriteria LKE.

Alur data utama:

- `LkeKriteria` menjadi sumber kebenaran untuk pertanyaan, bobot, tipe jawaban, formula, dan sub-detail.
- `LkeJawaban` menyimpan jawaban per submission/unit.
- Google Sheet dapat dipakai sebagai sumber awal dan sumber re-sync jawaban.
- Export LKE menggunakan template Excel di `reference/Export_Template_LKE.xlsx`.

## File Penting

- `VISA.md` berisi rencana dan catatan implementasi besar untuk modul ZI/LKE.
- `reference/Export_Template_LKE.xlsx` wajib ikut tersedia karena dipakai oleh fitur export LKE.
- `lib/zi/scoring.js` berisi logika perhitungan skor ZI/LKE.
- `lib/zi/sheet-sync.ts` berisi sinkronisasi Google Sheet ke database.
- `modules/models/LkeKriteria.ts` dan `modules/models/LkeJawaban.ts` adalah model utama master kriteria dan jawaban LKE.

## Catatan Git

File template export `reference/Export_Template_LKE.xlsx` perlu ikut di-commit karena menjadi dependency runtime fitur export.

File contoh Excel lain sebaiknya tidak ikut di-commit jika hanya dipakai sebagai referensi lokal.

## Lisensi

Project ini bersifat internal. Sesuaikan informasi lisensi sebelum distribusi publik.
