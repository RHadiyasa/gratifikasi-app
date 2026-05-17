# 📒 Catatan Perubahan Fitur E-Learning

> Dokumen ini berisi catatan setiap pekerjaan yang dilakukan pada fitur E-Learning.
> Bahasa sengaja dibuat sederhana supaya mudah dipahami siapapun yang baca.

---

## 🎯 Rencana Besar

| Phase | Topik | Status |
|-------|-------|--------|
| Phase 3 | Perbaikan Bug & Issue di kode existing | ✅ **Selesai** |
| Phase 1 | Feature flag "E-Learning Berakhir" (tidak hardcode) | ✅ **Selesai** |
| Phase 2 | Proteksi API peserta (Opsi B: publik + filter field) | ✅ **Selesai** |
| Phase 4 | Import Excel Peserta (validasi NIP 18 digit) | ✅ **Selesai** |
| Phase 5 | Workflow + Dashboard Redesign (parsial — Opsi A) | ✅ **Selesai sebagian** |
| Phase 6 | Cohort (Tahun + Batch) & Filter Dashboard | ✅ **Selesai** |
| Phase 7 | UX Modern Upload Wizard (3 step + Visa AI) | ✅ **Selesai** |
| Phase 8 | Cegah Duplicate Upload (Smart-by-Status) | ✅ **Selesai** |
| Phase 8b | Preview Sertifikat yang Sudah Diupload | ✅ **Selesai** |
| Phase 8c | S3 ↔ DB Reconcile (Lazy + Admin Reset) | ✅ **Selesai** |
| Phase 9 | Modern UI Redesign — Daftar Peserta | ✅ **Selesai** |
| Phase 9b | Cohort Filter di Halaman Peserta | ✅ **Selesai** |
| Phase 9c | Cohort Filter di Tracker + Fix 403 | ✅ **Selesai** |
| Phase 9d | Tracker Streamline + Deep-link ke Participants | ✅ **Selesai** |
| Phase 5b–d | AI verify · Email reminder · Self-service portal | 🔜 Mini-phase tertunda |

---

## ✅ Phase 3 — Perbaikan Bug & Issue (SELESAI)

7 perbaikan: bucket S3 dari env, fix ReferenceError, fix upload silent-fail,
validasi PDF + 5MB cap, fix `setCurrentPage` di useMemo, dual-mode Export Excel,
bersih-bersih.

---

## ✅ Phase 1 — Feature Flag "E-Learning Berakhir" (SELESAI)

Toggle upload sertifikat dari dashboard admin. Bisa atur: toggle on/off, pesan
custom, batch aktif, deadline informatif. Akses: `developer`, `admin`,
`admin_elearning`.

---

## ✅ Phase 2 — Proteksi API Peserta (SELESAI)

Strategi Opsi B: endpoint publik return field minimal, login + permission
return semua field. Endpoint sensitif wajib auth. Endpoint baru
`/api/elearning/peserta-picker` khusus dropdown upload publik.

---

## ✅ Phase 4 — Import Excel Peserta (SELESAI)

Import via Excel dengan validasi NIP 18 digit, upsert by NIP, mode preview
(dry run), feedback per baris (Baru / Diupdate / Duplikat / Error).
Setelah **Phase 6**, template & validasi juga mencakup `Tahun` (wajib) dan
`Batch` (wajib, angka saja).

---

## ✅ Phase 5 — Dashboard & Status Granular (SELESAI SEBAGIAN)

Dashboard baru `/dashboard/elearning`, status granular `Belum` / `Sudah` /
`Diverifikasi`, tombol Verify untuk admin, auto-redirect admin_elearning.
Sub-feature AI / Email / Self-Service Portal ditunda jadi mini-phase
(5b / 5c / 5d).

---

## ✅ Phase 6 — Cohort (Tahun + Batch) & Filter Dashboard (SELESAI)

### Latar Belakang

Data peserta sebelumnya semuanya tercampur tanpa penanda tahun/batch yang
terstruktur. Sekarang ada cohort baru (**Batch 1 tahun 2026**) yang akan
di-import, sementara data lama adalah **Batch 2 tahun 2025**. Tanpa pemisah,
dashboard tidak bisa fokus ke cohort yang sedang berjalan.

### Yang Dikerjakan

#### 1. Schema Update — Field `tahun` & `batch` Terstruktur

`ParticipantModel.js` sekarang punya 2 field cohort terpisah:

```js
{
  batch: "1",          // angka batch (string supaya fleksibel: "1", "2", "1A")
  tahun: 2026,         // tahun cohort (number, indexed)
  ...
}
```

`ElearningSettingsModel.ts` juga dapat field baru:

```ts
{
  tahunAktif: 2026 | null,   // tahun yang sedang berjalan
  batchAktif: "1",            // batch yang sedang berjalan (sudah ada, format diubah)
}
```

#### 2. Migrasi Auto-Backfill

Saat **pertama kali** API dashboard atau cohorts dipanggil, semua peserta yang
belum punya field `tahun` akan otomatis di-tag:
- `tahun = 2025`
- `batch = "2"`

Idempotent — boleh dipanggil berkali-kali, hanya yang `tahun`-nya kosong yang
diupdate. Cached per server process supaya tidak hammer database.

Helper: [lib/elearning/cohort-migration.ts](lib/elearning/cohort-migration.ts).

#### 3. Excel Template — Kolom Tahun Wajib

Template Excel sekarang punya kolom baru **`Tahun`** dan validasi **`Batch`**
yang ketat (hanya angka):

| Nama Lengkap | NIP | Unit Eselon 2 | Unit Eselon 1 | Jabatan | **Batch** | **Tahun** |
|---|---|---|---|---|---|---|
| Budi | 199811222025061013 | ... | ... | Auditor | `1` | `2026` |

**Aturan baru import:**
- `Batch` wajib diisi, format `\d{1,3}` (cukup angka: 1, 2, 3, dst)
- `Tahun` wajib diisi, format 4 digit antara 2020–2100

Kalau salah satu kosong / invalid → row dapat status **Error** di hasil
import, tidak masuk DB.

#### 4. Halaman Pengaturan — Set Cohort Aktif

Di [/dashboard/elearning/settings](app/dashboard/elearning/settings/page.tsx)
ada card baru **"Cohort Aktif"** dengan 2 input:

| Input | Fungsi |
|-------|--------|
| **Tahun Aktif** | Number input (2020–2100). Boleh kosong = tidak ada cohort aktif. |
| **Batch Aktif** | String (cukup `"1"` atau `"2"`). |

Admin set cohort aktif manual lewat sini (sesuai keinginan Anda — tidak
auto-set saat migrasi).

#### 5. Endpoint `/api/elearning/cohorts` — Daftar Cohort yang Ada

API baru yang return semua kombinasi tahun + batch yang ada di database:

```json
{
  "tahun": [2026, 2025],
  "byTahun": {
    "2026": [{ "batch": "1", "count": 245 }],
    "2025": [{ "batch": "2", "count": 198 }]
  }
}
```

Dipakai untuk isi dropdown filter di dashboard. Otomatis trigger backfill
migrasi.

#### 6. Endpoint `dashboard-stats` Sekarang Filter by Cohort

`GET /api/elearning/dashboard-stats?tahun=2026&batch=1`

| Query Param | Efek |
|-------------|------|
| Tidak ada (atau `all`) | Aggregate **semua peserta** dari semua cohort |
| `tahun=2026` | Filter hanya peserta tahun 2026 (semua batch) |
| `tahun=2026&batch=1` | Filter cohort spesifik |

Semua angka stat card, chart tren, top/bottom unit, dan recent upload feed
**ikut filter cohort** yang dipilih.

#### 7. Dashboard Page — 2 Dropdown Cohort

Di header dashboard sekarang ada card filter:

```
┌── Filter Cohort ────────────────────────────┐
│ Pilih tahun & batch untuk filter dashboard. │
│                                              │
│ [Tahun: 2026 ▼]  [Batch: 1 (245 peserta) ▼]│
└──────────────────────────────────────────────┘
```

**Behavior:**
- Default load: ambil `tahunAktif` & `batchAktif` dari settings.
- Kalau settings kosong → default "Semua Tahun"
- Ganti Tahun → batch otomatis reset ke "Semua Batch"
- Tahun "Semua" → dropdown Batch otomatis disabled (tidak masuk akal)
- Setiap perubahan dropdown → dashboard re-fetch dengan filter baru

#### 8. Informasi Cohort Aktif di Header

Sub-judul dashboard sekarang nampilin "Cohort aktif" dari settings (kalau
admin sudah set):

> Dashboard E-Learning  
> *Cohort aktif: Batch 1 · 2026*

### File yang Dibuat/Diubah di Phase 6

```
📄 lib/elearning/cohort-migration.ts                (BARU) — auto-backfill helper
📄 app/api/elearning/cohorts/route.ts               (BARU) — list cohort
✏️  modules/models/ParticipantModel.js              — tambah field tahun
✏️  modules/models/ElearningSettingsModel.ts        — tambah tahunAktif
✏️  app/api/elearning/settings/route.ts             — handle tahunAktif
✏️  app/api/elearning/participants/template/route.ts — kolom Tahun
✏️  app/api/elearning/participants/import/route.ts  — validate Tahun & Batch
✏️  app/api/elearning/dashboard-stats/route.ts      — filter query param
✏️  app/dashboard/elearning/page.tsx                — 2 dropdown filter
✏️  app/dashboard/elearning/settings/page.tsx       — input Tahun Aktif
```

### Cara Pakai (Step-by-Step Untuk Admin)

**A. Migrasi data lama (otomatis, tidak perlu apa-apa):**
1. Saat pertama kali ada user yang buka `/dashboard/elearning` setelah deploy,
   semua peserta lama otomatis di-tag `tahun=2025, batch="2"`
2. Tidak perlu jalankan script manual

**B. Set cohort aktif baru:**
1. Login `admin_elearning`
2. Buka `/dashboard/elearning/settings`
3. Scroll ke card **"Cohort Aktif"**
4. Isi Tahun Aktif = `2026`, Batch Aktif = `1`
5. Simpan
6. Buka kembali dashboard — sekarang otomatis filter ke 2026/1

**C. Import peserta batch baru (1 / 2026):**
1. Buka `/dashboard/elearning/participants/import`
2. Download template terbaru (sudah ada kolom Tahun)
3. Isi data, kolom **Batch = `1`** dan **Tahun = `2026`** untuk semua row
4. Preview → Import
5. Dashboard otomatis menampilkan data baru karena cohort aktif sudah 2026/1

**D. Lihat data cohort lama:**
1. Di dashboard, ganti dropdown Tahun ke `2025`, Batch ke `2`
2. Atau pilih "Semua Tahun" untuk lihat gabungan semua cohort

### Catatan Teknis

- Index ditambah di `batch` dan `tahun` untuk performa query
- Aggregation di endpoint cohorts hanya hitung yang `batch` & `tahun`
  ke-duanya non-null/empty supaya dropdown bersih
- Settings page input Tahun pakai `<Input type="number" min={2020} max={2100}>`
- API validasi Tahun di 2 layer: server reject kalau di luar range 2020-2100

---

## ✅ Phase 7 — UX Modern Upload Wizard (SELESAI)

### Latar Belakang

Halaman `/e-learning/upload` sebelumnya pakai form datar: 2 dropdown (unit
+ nama) berdampingan + tombol upload. UX kurang menarik dan kalau nama
peserta typo, user bingung.

### Flow Baru — Wizard 3 Step

```
┌─ Step 1 ─┐   ┌─ Step 2 ─┐   ┌─ Step 3 ──┐
│  Unit    │ → │  Nama    │ → │  Upload   │
└──────────┘   └──────────┘   └───────────┘
```

#### Step 1 — Pilih Unit
- Search-as-you-type input untuk filter unit Eselon 1
- List unit muncul sebagai tombol-tombol berbatas (border-card)
- Klik unit → animate transisi ke Step 2
- Visa: "Hai 👋 Saya Visa, asisten e-learning kamu. Yuk mulai dengan
  memilih unit Eselon 1..."

#### Step 2 — Ketik Nama (Visa Verify)
- Input text field — user ketik nama
- **Fuzzy matching real-time** (debounce 350ms) pakai algoritma
  Levenshtein distance:
  - **Exact match** → Visa: "Ketemu! 🎉 Hai [Nama]" + tombol Konfirmasi
  - **Mirip tapi tidak persis** → Visa: "Mungkin maksudmu ini?" +
    daftar saran top-5
  - **Tidak ketemu sama sekali** → Visa: "Maaf, tidak ditemukan." +
    pesan kontak admin dari settings
- Saran nama bisa diklik langsung untuk pilih
- Persona Visa pakai avatar VisaBrandMark + chat bubble dengan
  typing indicator (3 titik animasi) saat lagi cari

#### Step 3 — Upload Sertifikat
- **Drag-drop zone** dengan animasi state:
  - Idle: border dashed default
  - Drag-over: border primary, background tint, scale 1.01
  - File picked: file card dengan icon PDF, nama, ukuran, tombol X
  - Uploading: progress bar gradient + persen real-time
  - Success: full card hijau dengan check spring animation
  - Error: banner merah
- **Progress real-time** pakai axios `onUploadProgress` saat PUT ke S3
- Stage indicator:
  - 0-95%: "Mengirim ke server..."
  - 95-100%: "Menyimpan data..."
- Setelah success: "Sertifikat Terkirim! 🎉" + tombol "Upload Sertifikat
  Lain" untuk reset wizard

### Komponen Reusable Baru

| Komponen | Lokasi | Fungsi |
|----------|--------|--------|
| `VisaBubble` | inline di upload page | Chat bubble persona Visa dengan tone (default/success/warning/danger) + typing indicator |
| `Stepper` | inline di upload page | 3-dot stepper dengan label, animasi state done/active |
| `fuzzyFind()` | [lib/elearning/fuzzy-match.ts](lib/elearning/fuzzy-match.ts) | Levenshtein-based name matching dengan prioritas: exact > prefix > substring > fuzzy |

### Kontak Admin yang Bisa Diatur

Tambah field baru di [ElearningSettings](modules/models/ElearningSettingsModel.ts):

```ts
adminContact: string  // default: "Hubungi Admin E-Learning Inspektorat V Itjen ESDM."
```

Admin bisa edit lewat [/dashboard/elearning/settings](app/dashboard/elearning/settings/page.tsx)
→ scroll ke card "Cohort Aktif" → ada Textarea **"Kontak Admin E-Learning"**.

Contoh isi:
> "Hubungi Bu Ani via Telegram @ani_esdm atau email ani@esdm.go.id"

Pesan ini muncul di Step 2 kalau peserta ketik nama yang tidak ditemukan,
membantu mereka tahu siapa yang harus dihubungi.

### Animasi yang Dipakai

Semua pakai `framer-motion` (sudah ada di stack):

- `AnimatePresence mode="wait"` antara step → smooth fade + slide
- `motion.div layout` di VisaBubble → smooth resize kalau pesan berubah
- Stagger animation untuk list items (delay incremental per index)
- Spring animation untuk success checkmark
- Continuous pulse untuk dot online di avatar Visa
- Progress bar smooth easeOut

### File yang Dibuat/Diubah di Phase 7

```
📄 lib/elearning/fuzzy-match.ts                    (BARU) — Levenshtein helper
✏️  modules/models/ElearningSettingsModel.ts        — tambah adminContact
✏️  app/api/elearning/settings/route.ts             — handle adminContact
✏️  app/api/elearning/peserta-picker/route.js       — return adminContact
✏️  app/dashboard/elearning/settings/page.tsx       — input adminContact
✏️  app/e-learning/upload/page.jsx                  — REWRITE total (multi-step wizard)
```

### Cara Test (Mengikuti Flow Peserta)

1. Pastikan cohort aktif sudah di-set di settings, dan data sudah di-import
2. Buka `/e-learning/upload`
3. **Step 1**: cari & pilih unit Eselon 1 — animasi slide ke step 2
4. **Step 2**: ketik nama. Test 3 skenario:
   - Ketik nama persis benar → Visa bilang "Ketemu!" → klik kandidat
   - Ketik nama dengan typo (misal "Bdi Santso" untuk "Budi Santoso")
     → Visa kasih saran → klik saran yang benar
   - Ketik nama random tidak ada di list → Visa kasih pesan kontak admin
5. **Step 3**: drag-drop atau klik file PDF
   - Test file > 5MB → ditolak instant
   - Test file non-PDF → ditolak instant
   - Test file valid → progress bar jalan dari 0% → 100% → success card

---

## ✅ Phase 8 — Cegah Duplicate Upload (SELESAI)

### Masalah

Sebelum phase ini, peserta bisa upload sertifikat **berkali-kali tanpa kendala**.
Konsekuensi:
- File sebelumnya tertimpa di S3 (boros storage)
- Status `Diverifikasi` bisa ke-reset jadi `Sudah` lagi karena overwrite
- Bikin admin bingung kalau mau review

### Strategi: Smart-by-Status (3-Tier)

Perilaku menyesuaikan status peserta saat ini:

| Status | Boleh Upload? | Yang Ditampilkan |
|--------|---------------|-------------------|
| **Belum** | ✅ Ya | Form upload normal seperti biasa |
| **Sudah** (belum diverifikasi) | ⚠️ Boleh, **harus konfirmasi dulu** | Banner amber "Sudah upload pada [tanggal]" + tombol oranye "Ya, Ganti File" untuk lanjut |
| **Diverifikasi** | ❌ Tidak | Banner ungu "Sudah Diverifikasi" + instruksi hubungi admin. Tombol upload tidak muncul sama sekali. |

### Dua Layer Pertahanan

#### 1. Client-side (UX)
- Step 2 suggestions menampilkan **status chip** per nama
  (🟢 "Sudah Upload" / 🟣 "Diverifikasi"), jadi peserta sadar
  sebelum klik
- Step 3 punya 3 mode rendering berdasarkan `peserta.statusCourse`

#### 2. Server-side (Defensive)
[`/api/status`](app/api/status/route.js) sekarang **reject 409** kalau status
peserta sudah `Diverifikasi`. Kalau ada user bypass UI (curl, devtools,
extension, dst), backend tetap nahan. Response:
```json
{
  "error": "Sertifikat Anda sudah diverifikasi oleh admin...",
  "code": "ALREADY_VERIFIED"
}
```

### File yang Diubah di Phase 8

```
✏️  app/api/elearning/peserta-picker/route.js   — return statusCourse + uploaded_at
✏️  app/api/status/route.js                     — reject upload kalau status Diverifikasi
✏️  app/e-learning/upload/page.jsx              — Step 2 status chip, Step 3 status gate
```

### Cara Test

**Scenario A — Peserta status "Belum":**
1. Pilih nama → langsung masuk form upload (flow normal)

**Scenario B — Peserta status "Sudah":**
1. Di Step 2, nama tampil dengan chip hijau "Sudah Upload"
2. Pilih nama → masuk Step 3 → banner amber "Eh tunggu! Sudah upload pada [tanggal]"
3. Klik "Ya, Ganti File Sertifikat" → form upload muncul → upload baru
4. File lama di S3 tertimpa, status tetap "Sudah" (admin perlu verify lagi)

**Scenario C — Peserta status "Diverifikasi":**
1. Di Step 2, nama tampil dengan chip ungu "Diverifikasi"
2. Pilih nama → masuk Step 3 → banner ungu "Sudah Diverifikasi"
3. Tidak ada tombol upload — hanya tombol "Ganti Nama" & "Mulai Lagi"

**Scenario D — Bypass test (defensive):**
1. Login peserta status "Diverifikasi" → buka DevTools
2. `axios.post('/api/status', { nip: '...', s3_key: 'fake' })` →
   server return 409 dengan pesan jelas

---

## ✅ Phase 8b — Preview Sertifikat yang Sudah Diupload (SELESAI)

### Masalah

Setelah Phase 8 block re-upload untuk peserta yang sudah punya status,
peserta jadi tidak bisa **memastikan file yang dulu mereka upload itu yang
benar**. Mereka cuma diberi tahu "kamu sudah upload tanggal X" tanpa bisa
verifikasi visual.

### Solusi: Tombol "Lihat Sertifikat Saya"

Tambah tombol preview di 2 lokasi Step 3:

| Status Peserta | Lokasi Tombol | Label |
|----------------|---------------|-------|
| **Sudah** (banner amber confirm-replace) | Di dalam card amber | "Lihat Sertifikat Sebelumnya" |
| **Diverifikasi** (banner ungu locked) | Di dalam card ungu | "Lihat Sertifikat Saya" |

Klik tombol → server generate presigned URL (5 menit valid) → buka di
**tab baru** sebagai PDF inline (bukan download).

### Endpoint Baru: `/api/elearning/peserta-preview`

```
POST /api/elearning/peserta-preview
Body: { "nip": "199811222025061013" }
Response: { "success": true, "url": "https://...", "uploaded_at": "..." }
```

**Validasi:**
- NIP wajib 18 digit angka (regex `^\d{18}$`)
- Peserta harus exist di DB
- Peserta harus punya `s3_key` (sudah upload)
- `s3_key` harus diawali `sertifikat/` (defensive — cegah path traversal)
- Presigned URL pakai `ResponseContentDisposition: inline` supaya browser
  langsung tampilkan PDF, bukan download

**Privacy considerations:**
- Endpoint **publik** (peserta tidak login) tapi butuh NIP yang valid
- Karena NIP 18 digit, sulit di-bruteforce
- Sama model threat dengan picker endpoint yang sudah ada
- URL valid hanya 5 menit, tidak bisa di-share lama

### Komponen Reusable Baru

`PreviewCertButton` di [upload/page.jsx](app/e-learning/upload/page.jsx):
- Tombol kecil flat primary dengan icon 👁
- Loading state pakai spinner saat fetch URL
- Error feedback inline kalau gagal
- Pakai `window.open(url, "_blank")` supaya buka tab baru

### File yang Dibuat/Diubah di Phase 8b

```
📄 app/api/elearning/peserta-preview/route.js   (BARU) — generate presigned URL by NIP
✏️  app/e-learning/upload/page.jsx              — komponen PreviewCertButton + wire ke 2 banner
```

### Cara Test

1. Login sebagai admin → upload sertifikat dummy untuk 1 peserta
2. (Skenario "Sudah"): Buka `/e-learning/upload` sebagai peserta itu →
   Step 3 muncul banner amber → klik **"Lihat Sertifikat Sebelumnya"** →
   tab baru terbuka dengan preview PDF
3. (Skenario "Diverifikasi"): Verify peserta itu dari dashboard admin →
   buka upload page lagi → banner ungu → klik **"Lihat Sertifikat Saya"** →
   tab baru terbuka
4. Test edge case: NIP invalid (misal 17 digit) → tombol return error
   "NIP tidak valid. Harus 18 digit angka."

---

## ✅ Phase 8c — S3 ↔ DB Reconcile (SELESAI)

### Masalah

Kalau admin **hapus file sertifikat langsung dari AWS S3 Console**, sistem
tetap menganggap peserta "Sudah" upload karena MongoDB tidak ter-sync
otomatis dengan S3. Akibatnya:
- Stat dashboard salah (terhitung "Sudah" padahal file gone)
- Peserta klik "Lihat Sertifikat" → error
- Data jadi inkonsisten

### Solusi: 2 Layer

#### 1. Lazy Auto-Reconcile (self-healing)
Endpoint [`/api/elearning/peserta-preview`](app/api/elearning/peserta-preview/route.js)
sekarang **HEAD-check** ke S3 sebelum generate presigned URL:

```
Peserta klik "Lihat Sertifikat"
   ↓
Server HEAD ke S3
   ↓
File ada? → return presigned URL (normal)
   ↓
File 404? → auto-reset DB ke "Belum" + return error code FILE_GONE
```

Field yang di-clear otomatis kalau file hilang:
- `statusCourse → "Belum"`
- `s3_key → null`
- `uploaded_at → null`
- `verified_at, verified_by, verify_note → null/""`

Self-healing — tidak perlu intervensi admin.

#### 2. Admin Reset Button (explicit cleanup)

API baru `POST /api/elearning/participants/[id]/reset` di
[reset/route.ts](app/api/elearning/participants/[id]/reset/route.ts):

| Body | Yang Dilakukan |
|------|----------------|
| `{ deleteFile: true }` (default dari UI) | Hapus file di S3 + reset DB |
| `{ deleteFile: false }` | Reset DB saja, file di S3 dibiarkan |

Response juga return `s3DeleteResult: "deleted" | "failed" | "skipped"`
supaya UI bisa kasih feedback yang tepat.

**S3 delete best-effort** — kalau gagal (misal file memang sudah tidak ada),
DB tetap di-reset, tidak fatal.

#### 3. UI Tombol Reset

Di [/e-learning/participants](app/e-learning/participants/page.jsx), kolom
Aksi sekarang punya tombol merah **"Reset"** dengan icon 🔄 — hanya tampil
untuk admin (`elearning:participants:manage`) dan peserta yang punya `s3_key`.

Klik → confirm dialog → reset eksekusi → row state di-update tanpa reload.

### Best Practice (Untuk Admin)

❌ **Jangan** hapus file langsung dari S3 Console untuk operasi rutin
✅ **Pakai** tombol Reset di [`/e-learning/participants`](app/e-learning/participants/page.jsx)
    → menjamin DB + S3 tetap sinkron

Kalau accidental hapus dari S3 sudah terjadi, peserta itu akan otomatis
ter-reset begitu dia atau admin coba preview sertifikatnya (lazy reconcile).

### File yang Dibuat/Diubah di Phase 8c

```
📄 app/api/elearning/participants/[id]/reset/route.ts   (BARU)
✏️  app/api/elearning/peserta-preview/route.js           — HEAD check + lazy reconcile
✏️  app/e-learning/participants/page.jsx                 — tombol Reset (merah) + handler
```

### Cara Test

**Scenario A — Hard delete di AWS Console:**
1. Upload sertifikat untuk peserta X
2. Buka AWS S3 Console → hapus file `sertifikat/.../...pdf`
3. Buka `/e-learning/upload` sebagai peserta X
4. Step 3 → klik **"Lihat Sertifikat"** → tab baru gagal
   ATAU mungkin lebih jelas: dapat error message "File tidak ditemukan,
   status sudah direset"
5. Refresh `/e-learning/participants` → peserta X kembali ke "Belum"

**Scenario B — Admin reset dari UI:**
1. Login `admin_elearning` → buka `/e-learning/participants`
2. Cari peserta yang sudah upload → klik tombol **"Reset"** (merah)
3. Konfirmasi dialog → klik OK
4. Row langsung jadi "Belum", tombol Lihat/Unduh/Verifikasi hilang
5. Cek AWS S3 → file sudah tidak ada juga

---

## ✅ Phase 9 — Modern UI Redesign Daftar Peserta (SELESAI)

### Sebelum vs Sesudah

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| Layout | Flat — heading + tabel besar | Card-based dengan max-width container, entrance animation |
| Stats | Tidak ada | 4 stat pill (Total/Diverifikasi/Sudah/Belum) dengan icon + accent color |
| Filter | 4 dropdown horizontal yang sumpek | Card terpisah dengan search prominent + grid 4 kolom + tombol "Reset Filter" |
| Search | Plain input | Input dengan icon search + tombol clear (X) |
| Tabel | HeroUI table default | Custom styling: header uppercase tracking, row hover, avatar berinisial + jabatan stacked |
| Status | Span warna polos | HeroUI `Chip` dengan icon + color semantic |
| Action button | 4 tombol besar dengan label | Icon-only buttons (32px) dengan tooltip — hemat space, clean |
| Reset confirm | Native `confirm()` browser | HeroUI `Modal` dengan blur backdrop, list checklist, tombol bertingkat |
| Pagination | "Sebelumnya / Berikutnya" tombol biasa | Icon button + tampilan `1 / 5` + range info "Menampilkan 1–10 dari 243" |
| Export | 2 tombol berdampingan | Dropdown menu dengan deskripsi tiap opsi |
| Empty state | Text "Tidak ada data" | Icon search + judul + petunjuk |

### Komponen Baru (inline di file)

| Komponen | Fungsi |
|----------|--------|
| `StatPill` | Stat card kecil dengan icon, label, value, accent color custom |
| `NamaCell` | Avatar berinisial (warna deterministik dari hash nama) + nama + jabatan stacked |
| `StatusBadge` | HeroUI Chip dengan icon (CheckCircle2/Clock/ShieldCheck) + warna semantic |
| `ActionIconButton` | Wrapper icon-only Button dengan Tooltip + loading state |
| `getInitials()` | "Budi Santoso" → "BS" |
| `avatarColorFromName()` | Hash nama → 1 dari 7 warna pastel konsisten (blue/emerald/purple/amber/rose/cyan/indigo) |

### Penambahan UX Detail

- **Stat strip auto-hide** untuk non-privileged user — hanya tampil kalau admin
- **Reset filter button** muncul otomatis kalau ada filter aktif (animated fade-in)
- **Avatar berinisial** dengan warna konsisten per nama — bantu eye-track baris
- **Jabatan** ditampilkan kecil di bawah nama (info bonus tanpa kolom tambahan)
- **Unit tooltip** karena unit Eselon I namanya panjang, di tabel di-truncate dengan tooltip on hover
- **Batch + Tahun** digabung jadi `1 · 2026` di kolom Batch (hemat space)
- **Modal reset** lebih informatif — checklist apa yang akan terjadi, warna danger jelas
- **Pagination range info** lebih informatif daripada "Halaman X dari Y" doang
- **Empty state** dengan icon + petunjuk yang membantu

### Tetap Sama

- Semua logika filter/search/export/verify/reset persis sama
- Permission gates (`isPrivileged` & `canManage`)
- API endpoint yang dipanggil
- Field-level masking untuk public user (NIP/jabatan tidak tampil)

### File yang Diubah di Phase 9

```
✏️  app/e-learning/participants/page.jsx   — REWRITE total (~600 LOC)
```

Skeleton lama ([_components/ParticipantsSkeleton.jsx](app/e-learning/participants/_components/ParticipantsSkeleton.jsx))
tetap dipakai sebagai loading state — sudah cukup baik.

---

## ✅ Phase 9b — Cohort Filter di Halaman Peserta (SELESAI)

### Konsep

Halaman [`/e-learning/participants`](app/e-learning/participants/page.jsx)
sekarang punya **master cohort filter** (Tahun + Batch) yang menjadi scope
utama. Semua filter lain (Status, Unit Eselon I, Pencarian) dan stat pills
**bekerja dalam scope cohort tersebut**.

### Behavior

- **Default load**: dropdown Tahun + Batch otomatis ter-isi dengan
  cohort aktif dari [Settings](app/dashboard/elearning/settings/page.tsx).
  Jadi admin langsung lihat kegiatan yang sedang berjalan.
- **Mau lihat data lama / arsip?** Pilih tahun yang berbeda atau pilih
  "Semua Tahun" → semua data ditampilkan.
- **Ganti Tahun** → dropdown Batch otomatis reset ke "Semua Batch"
  (karena daftar batch per tahun beda)
- **Batch dropdown disabled** kalau Tahun = "Semua Tahun" (tidak masuk akal
  filter batch tanpa tahun)
- **Reset Filter** sekarang reset back ke **default cohort dari settings**
  (bukan kosongkan semua) — admin kembali ke "home view" mereka.

### UI Structure (Layout)

```
┌─ Header ──────────────────────────────────┐
│ E-LEARNING                  [Export ▼]    │
│ Daftar Peserta                            │
│ Cohort: Batch 1 · 2026 · 245 peserta      │
├─ Cohort Master Filter (highlighted) ──────┤
│ 📅 COHORT AKTIF                           │
│ Pilih tahun & batch...    [Tahun ▼] [Batch ▼]│
├─ Stat Pills (within cohort) ──────────────┤
│ [👥 245] [🛡 42] [✓ 156] [⏱ 47]          │
├─ Filter & Pencarian ──────────────────────┤
│ [Cari nama/NIP...........................]│
│ [Unit ▼] [Status ▼] [Show ▼]              │
├─ Table ───────────────────────────────────┤
│ (Hanya peserta dalam cohort terpilih)     │
└───────────────────────────────────────────┘
```

Card cohort dibuat **highlight dengan border + bg primary tipis** supaya
visual hierarchy jelas — "ini adalah filter utama yang menentukan segalanya".

### Detail Implementasi

**Pipeline filter 2-tahap:**

```
participants (semua)
    ↓ Step 1: cohort filter (tahun + batch)
cohortScoped
    ↓ Step 2: search + unit + status
filteredParticipants
    ↓ pagination
paginatedData
```

**Stat pills berbasis cohortScoped:**
- Sebelumnya: stats di-compute dari `participants` (seluruh data)
- Sekarang: dari `cohortScoped` → angka berubah sesuai cohort yang dipilih

**Unit options scoped:**
- Sebelumnya: list unit dari semua peserta
- Sekarang: list unit hanya dari peserta dalam cohort terpilih (lebih relevan)

**Default cohort fetch:**
- Endpoint `/api/elearning/cohorts` → daftar tahun & batch yang tersedia
- Endpoint `/api/elearning/settings` → tahunAktif & batchAktif
- 2 endpoint di-fetch paralel pakai `Promise.all`
- Setelah dapat settings, set state `selectedTahun` & `selectedBatch`

### Kapan "Custom Cohort"?

Tombol "Reset ke Default" muncul kalau ada perbedaan antara cohort yang
dipilih user vs default dari settings. Jadi admin yang sudah eksplorasi data
tahun lain bisa dengan cepat balik ke cohort aktif.

### Header Subtitle

Subtitle header sekarang lebih informatif:
> Cohort: **Batch 1 · 2026** · 245 peserta

Atau kalau pilih "Semua Tahun":
> Cohort: **Semua Cohort** · 443 peserta

### File yang Diubah di Phase 9b

```
✏️  app/e-learning/participants/page.jsx   — cohort fetch + filter pipeline 2-tahap + UI cohort card
```

### Cara Test

1. Pastikan ada minimal 2 cohort di DB (misal 2025/2 hasil migrasi + 2026/1 hasil import baru)
2. Set cohort aktif = 2026/1 di Settings
3. Buka `/e-learning/participants` → otomatis filter ke 2026/1, stats hanya count 2026/1
4. Ganti dropdown Tahun ke 2025 → batch otomatis reset → pilih Batch 2 → stats berubah
5. Ganti ke "Semua Tahun" → batch dropdown disabled → stats jadi total semua
6. Klik **"Reset ke Default"** → kembali ke cohort 2026/1
7. Coba filter Unit "Inspektorat Jenderal" + status "Diverifikasi" dalam cohort 2026/1 → hanya peserta yang match semua kriteria
8. Klik **Export Hasil Filter** → file Excel hanya berisi peserta hasil filter (cohort + unit + status)
9. Klik **Export Semua** → file Excel berisi semua data tanpa filter (escape hatch untuk audit lengkap)

---

## ✅ Phase 9c — Cohort Filter di Tracker + Fix 403 (SELESAI)

### Dua Pekerjaan

#### 1. Fix Bug: 403 di `/api/elearning/cohorts`

**Penyebab:** Endpoint sebelumnya cek permission `dashboard:elearning` →
butuh login. Tapi halaman peserta publik
([/e-learning/participants](app/e-learning/participants/page.jsx))
yang sekarang juga butuh daftar cohort untuk dropdown filter,
diakses tanpa login → axios throw 403.

**Fix:** Endpoint cohorts di-buka publik
([api/elearning/cohorts/route.ts](app/api/elearning/cohorts/route.ts)).
Alasannya: data yang di-return cuma agregasi count tahun/batch — bukan PII.
Tidak ada risiko privasi.

#### 2. Tracker Page (`/e-learning/tracker`) Auto-Filter Cohort

**Sebelum:** `usePesertaData` hook fetch semua peserta tanpa filter →
monitoring jadi gabungan semua tahun. Tidak relevan untuk kegiatan
yang sedang berjalan.

**Sesudah:**
- Hook `usePesertaData` di-refactor — sekarang **terima params** `{ tahun, batch }`
- Data tetap di-fetch sekali (cache di state), tapi grouping & summary
  **di-derive ulang** lewat `useMemo` setiap kali cohort berubah
- Tracker page fetch settings + cohorts on mount → set default
  `selectedTahun` & `selectedBatch` dari `tahunAktif` & `batchAktif`
- UI: card cohort filter di header (sama desain seperti di halaman peserta &
  dashboard) dengan tombol "Kembali ke Default" kalau admin berubah pilihan

### Hook Refactor Detail

**Signature lama:**
```js
const { groupedData, summary, isLoading, error } = usePesertaData();
```

**Signature baru:**
```js
const { groupedData, summary, isLoading, error, totalRaw } = usePesertaData({
  tahun: "2026",
  batch: "1",
});
```

Param opsional → default `"all"` untuk keduanya → backward compatible
(kalau tidak di-pass, behavior sama dengan sebelum: ambil semua).

Tambahan return: `totalRaw` = total peserta di semua cohort (untuk hint
"dari total X di semua cohort" saat filter "Semua Tahun").

### Behavior Tracker yang Baru

| Aksi User | Hasil |
|-----------|-------|
| Load page pertama kali | Otomatis filter ke cohort aktif dari settings (mis. 2026/1) |
| Ganti dropdown Tahun | Batch reset ke "Semua Batch". Stats + grouping re-compute |
| Pilih "Semua Tahun" | Tampilkan semua peserta. Subtitle: "Cohort: Semua Cohort · 443 peserta" |
| Klik "Kembali ke Default" | Reset ke cohort dari settings |
| Cohort kosong (tidak ada peserta) | Empty state amber, sembunyikan chart & tabel |

### File yang Diubah

```
✏️  app/api/elearning/cohorts/route.ts   — remove auth check (publik)
✏️  hooks/usePesertaData.js              — terima cohort params + re-derive via useMemo
✏️  app/e-learning/tracker/page.jsx      — cohort dropdown + auto-default + empty state
```

### Verifikasi Setelah Deploy

- [ ] Buka `/e-learning/participants` **tanpa login** → tidak ada error 403,
      dropdown cohort terisi
- [ ] Buka `/e-learning/tracker` sebagai admin → otomatis filter ke cohort
      aktif (sesuai settings)
- [ ] Ganti dropdown Tahun di tracker → stats + grafik + tabel ikut berubah
- [ ] Pilih "Semua Tahun" di tracker → semua peserta semua tahun ter-aggregate
- [ ] Klik "Kembali ke Default" → balik ke cohort aktif
- [ ] Coba cohort yang kosong (mis. tahun yang tidak ada data) → empty state
      amber muncul, chart hilang

---

## ✅ Phase 9d — Tracker Streamline + Deep-link (SELESAI)

### Rasionalisasi

Tracker page sebelumnya menampilkan **3 section**: stat global, card per unit,
dan **rincian peserta per unit** (10+ tabel dengan ratusan baris).

Setelah Phase 9 redesign halaman peserta, section ketiga jadi **redundan**:
- Halaman [/e-learning/participants](app/e-learning/participants/page.jsx)
  sudah powerful: filter cohort, status, unit, search, pagination, modal,
  verify, reset, dll
- Tracker seharusnya fokus jadi **monitoring overview** (high-level scan)
- 10+ tabel berderet bikin page panjang & lambat di-load

### Yang Dikerjakan

#### 1. Hapus "Rincian Peserta per Unit"
- Tracker tidak lagi render `UnitParticipantTable` per unit
- Page jadi lebih fokus: header → cohort filter → stat global → card per unit
- Performance lebih baik (DOM nodes turun signifikan)

#### 2. Redesign Card Unit (Modern + Themed)
[UnitSummaryCardsList.jsx](app/e-learning/tracker/_components/UnitSummaryCardsList.jsx) di-rewrite:

| Sebelum | Sesudah |
|---------|---------|
| Hardcoded `bg-white text-gray-800` (rusak di dark mode) | `bg-background border-default-200` (theme-aware) |
| 3 box stat besar (Total/Upload/Belum) | Stat block kecil dengan icon + accent + progress bar |
| Cuma tombol Download Sertifikat | Tombol primary **"Lihat Detail"** + icon button download |
| Tidak ada progress visualization | Progress bar animated dengan warna semantic (hijau >50%, amber <50%) |
| Layout flex-wrap kacau | Grid 1/2/3 column responsive |

#### 3. Deep-link ke Participants Page
Klik **"Lihat Detail"** di card unit X → buka:
```
/e-learning/participants?unit=Inspektorat%20Jenderal&tahun=2026&batch=1
```

Tahun + batch ikut diteruskan supaya filter di participants page **persis
sama dengan apa yang barusan dilihat di tracker** (bukan reset ke default cohort).

#### 4. Participants Page Support URL Params
[participants/page.jsx](app/e-learning/participants/page.jsx) sekarang baca
URL params on mount dan auto-apply:

| Param | Effect |
|-------|--------|
| `?unit=X` | Set `filterUnit` ke X |
| `?tahun=Y` | Override `selectedTahun` |
| `?batch=Z` | Override `selectedBatch` |
| `?status=Diverifikasi` | Set `filterStatus` |

URL params **menang dari settings default** — admin bisa di-link dari
luar dengan filter spesifik.

Component juga di-wrap `<Suspense>` (required oleh Next.js 15 untuk
`useSearchParams`).

### Flow User Baru

```
Tracker (cohort 2026/1, overview cepat)
   ↓ klik "Lihat Detail" di card "Inspektorat Jenderal"
Participants?unit=Inspektorat%20Jenderal&tahun=2026&batch=1
   (filter pre-applied: unit + cohort sama persis dengan tracker)
   ↓ admin scroll list detail, filter status, klik verify/reset, dll
```

### File yang Diubah

```
✏️  app/e-learning/tracker/page.jsx                         — hapus rincian section
✏️  app/e-learning/tracker/_components/UnitSummaryCardsList.jsx — redesign + deep-link
✏️  app/e-learning/participants/page.jsx                    — URL param support + Suspense wrap
```

### Cara Test

1. Buka `/e-learning/tracker` → tidak ada lagi section "Rincian Peserta per Unit"
   di bawah card unit
2. Card unit tampil modern dengan progress bar + 2 tombol (Lihat Detail + Download)
3. Klik **"Lihat Detail"** di card unit tertentu → buka tab/halaman baru ke
   participants dengan filter unit + cohort pre-applied
4. Subtitle participants page menunjukkan cohort & unit yang sedang difilter
5. Test deep-link langsung: buka URL `/e-learning/participants?unit=X&tahun=2026`
   di browser → filter otomatis ter-apply

---

## ⚠️ Tindakan Penting Setelah Deploy Phase 6

### 1. Migrasi Otomatis Jalan Sendiri ✅
Tidak perlu run script apa-apa. Data peserta lama akan otomatis dapat
`tahun=2025, batch="2"` saat ada user buka dashboard pertama kali.

### 2. Set Cohort Aktif via Pengaturan
Login `admin_elearning` → `/dashboard/elearning/settings` → isi **Tahun
Aktif = 2026, Batch Aktif = 1** → Simpan.

### 3. Test Manual
- [ ] Buka dashboard tanpa set cohort aktif → tampil "Semua Tahun" / "Semua Batch"
- [ ] Set cohort aktif di settings → reload dashboard → otomatis filter ke cohort tsb
- [ ] Ganti dropdown Tahun → angka stat card berubah
- [ ] Ganti dropdown Batch → angka berubah lagi
- [ ] Download template Excel → buka file → harus ada kolom **Tahun**
- [ ] Import Excel tanpa kolom Tahun → ditolak dengan pesan "Kolom wajib tidak ditemukan"
- [ ] Import Excel dengan Tahun = "ABC" → row dapat status Error
- [ ] Import Excel dengan Batch = "Batch 1" (string non-numeric) → row dapat status Error
- [ ] Import Excel dengan Batch = "1", Tahun = "2026" → sukses

---

## 📌 Ringkasan File yang Berubah (Phase 3 + 1 + 2 + 4 + 5 + 6)

```
File yang DIUBAH (✏️):
  app/api/elearning/download-sertif/route.js
  app/api/elearning/getAllParticipants/route.js
  app/api/elearning/getParticipantsByUnit/route.js
  app/api/elearning/dashboard-stats/route.ts
  app/api/elearning/settings/route.ts
  app/api/elearning/participants/template/route.ts
  app/api/elearning/participants/import/route.ts
  app/api/s3/route.js
  app/api/aws/getPresignedZipUrl/route.js
  app/api/upload/route.js
  app/dashboard/page.jsx
  app/dashboard/elearning/page.tsx
  app/dashboard/elearning/settings/page.tsx
  app/e-learning/upload/page.jsx
  app/e-learning/participants/page.jsx
  app/e-learning/tracker/page.jsx
  hooks/usePesertaData.js
  lib/permissions.ts
  middleware.js
  components/route-title.tsx
  modules/models/ParticipantModel.js
  modules/models/ElearningSettingsModel.ts

File BARU (📄):
  modules/models/ElearningSettingsModel.ts
  lib/elearning/cohort-migration.ts
  app/api/elearning/settings/route.ts
  app/api/elearning/peserta-picker/route.js
  app/api/elearning/participants/import/route.ts
  app/api/elearning/participants/template/route.ts
  app/api/elearning/participants/[id]/verify/route.ts
  app/api/elearning/dashboard-stats/route.ts
  app/api/elearning/cohorts/route.ts
  app/dashboard/elearning/page.tsx
  app/dashboard/elearning/settings/page.tsx
  app/dashboard/elearning/participants/import/page.tsx
```

---

## 🔜 Selanjutnya

Tiga mini-phase yang masih tertunda dari Phase 5:

- **Phase 5b** — AI Validasi Sertifikat (butuh sample cert KPK)
- **Phase 5c** — Email Reminder Cron (butuh SMTP provider + field email peserta)
- **Phase 5d** — Peserta Self-Service Portal (butuh email service)

Rekomendasi: setelah Phase 6 di-deploy & user testing dengan Admin E-Learning,
baru tentukan mini-phase mana yang prioritas berdasarkan feedback nyata.
