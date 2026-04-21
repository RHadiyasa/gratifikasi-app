# CLAUDE.md - Sistem Pencegahan Korupsi Kementerian ESDM

## Overview

Aplikasi internal **Inspektorat Jenderal Kementerian ESDM** untuk mengelola program pencegahan korupsi, meliputi:
- **Gratifikasi** — Pelaporan dan tracking gratifikasi pegawai
- **Zona Integritas (ZI)** — Evaluasi Lembar Kerja Evaluasi (LKE) unit kerja menuju predikat WBK/WBBM
- **E-Learning** — Tracking peserta sosialisasi/pelatihan pencegahan korupsi

Deployed di **Vercel**. Database menggunakan **MongoDB** (via Mongoose).

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 15.3.9 (App Router) |
| UI Library | HeroUI v2 (formerly NextUI) |
| Styling | Tailwind CSS v4 + Tailwind Variants |
| State Management | Zustand |
| Database | MongoDB (Mongoose) |
| Auth | JWT (jose + jsonwebtoken), cookie-based |
| File Storage | AWS S3 |
| AI Integration | Anthropic Claude SDK (@anthropic-ai/sdk) |
| Google Services | Google Sheets API, Google Drive API |
| PDF Generation | pdf-lib |
| Excel Export | exceljs, xlsx |
| Charts | Recharts |
| Deployment | Vercel |

---

## Project Structure

```
app/                    # Next.js App Router pages
├── api/                # API routes (backend)
│   ├── auth/           # Login, logout, register, me
│   ├── zi/             # Zona Integritas (check, compare, detail, download, submissions)
│   ├── elearning/      # Peserta e-learning (participants, download sertif)
│   ├── dashboard/      # Dashboard data
│   ├── peserta/        # Peserta gratifikasi
│   ├── report/         # Report CRUD
│   ├── upload/         # File upload
│   ├── s3/             # S3 operations
│   └── generate-pdf/   # PDF generation
├── dashboard/          # Dashboard pages (admin, upg, zi)
├── gratifikasi/        # Halaman gratifikasi publik
├── zona-integritas/    # ZI pages (lke-checker, monitoring)
├── e-learning/         # E-learning pages (tracker, participants, upload)
├── lapor/              # Pelaporan gratifikasi
├── login/              # Login page
├── register/           # Register page (admin only)
└── panduan/            # Panduan/dokumentasi

components/             # Shared React components
config/                 # App config (DB, fonts, site)
helper/                 # Utility helpers (PDF drawing, text wrapper)
hooks/                  # Custom React hooks (usePesertaData, useReportData)
lib/zi/                 # ZI business logic (AI checker, scoring, Google integration)
modules/
├── auth/               # Auth service layer
├── data/               # Static data (JSON, report options)
└── models/             # Mongoose models
service/                # Service layer (AWS, reports, PDF, peserta)
store/                  # Zustand stores (authStore, ziStore)
types/                  # TypeScript type definitions
styles/                 # Global CSS
public/                 # Static assets
```

---

## Key Concepts

### User Roles
Ada 4 role pengguna (permission-based system di `lib/permissions.ts`):
- **developer** — Superadmin, hanya 1 akun. Kelola seluruh sistem & CRUD semua akun (`/dashboard/accounts`)
- **admin** — Akses penuh ke semua fitur (dashboard utama, register user zi/upg, report list)
- **upg** — Unit Pengendalian Gratifikasi (dashboard UPG, e-learning tracker)
- **zi** — Zona Integritas (dashboard ZI, LKE checker)

Role-based routing dikelola di `middleware.js`. Permission checks menggunakan `hasPermission()` dari `lib/permissions.ts`.

### Zona Integritas (ZI) — LKE Checker
Fitur utama terbaru. Flow:
1. User submit link Google Sheets LKE unit kerja
2. Sistem parsing sheet → menghitung scoring per komponen
3. AI (Claude) melakukan pengecekan otomatis dokumen pendukung via Google Drive
4. Hasil scoring ditampilkan dengan target WBK (≥60) / WBBM (≥75)
5. Bisa compare antar unit, export ke Excel

File penting ZI:
- `lib/zi/scoring.js` — Logika perhitungan nilai LKE
- `lib/zi/ai-checker.js` — Integrasi Claude AI untuk review dokumen
- `lib/zi/sheetParser.ts` — Parsing Google Sheets
- `lib/zi/visa-review.js` — Auto check visa
- `lib/zi/drive.js` — Akses Google Drive (traversal subfolder rekursif)
- `store/ziStore.ts` — State management ZI
- `types/zi.ts` — Type definitions ZI

### Authentication
- JWT stored di HTTP-only cookie (`token`)
- Middleware decode payload untuk routing
- Auth API: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/register`
- Store: `store/authStore.ts`

### Models (Mongoose)
- `UserModel.js` — User accounts
- `ParticipantModel.js` — Peserta e-learning
- `ReportModel.js` — Laporan gratifikasi
- `LkeSubmission.ts` — Submission LKE Zona Integritas
- `LkeSyncLog.ts` — Log sinkronisasi LKE
- `UpgAdminModel.js` — Admin UPG
- `statusModel.js` — Status tracking

---

## Development Commands

```bash
# Development (with OpenSSL legacy provider for compatibility)
npm run dev

# Build production
npm run build

# Start production server
npm start

# Lint (with auto-fix)
npm run lint
```

---

## Environment Variables

Required environment variables (set di Vercel / `.env.local`):

```
# Database
MONGODB_URI=
MONGODB_DB=

# JWT
JWT_SECRET=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=

# Google APIs (for ZI/LKE)
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=

# Anthropic AI (for LKE checker)
ANTHROPIC_API_KEY=
```

---

## Coding Conventions

### General
- Mix of JavaScript (.js/.jsx) dan TypeScript (.ts/.tsx) — file baru sebaiknya TypeScript
- Bahasa Indonesia di comments dan UI text
- Path alias `@/` maps ke project root

### Styling
- Tailwind CSS utility-first
- HeroUI components sebagai base UI
- Dark mode default (`defaultTheme: "dark"`)

### State Management
- Zustand stores di `store/` — pattern: create store with async actions
- React hooks di `hooks/` untuk data fetching logic

### API Routes
- Next.js App Router route handlers (`route.js`/`route.ts`)
- MongoDB connection via singleton pattern di `config/dbconfig.js`
- Auth check via JWT verification di masing-masing route

### ESLint
- Config di `eslint.config.mjs` (flat config format)
- TypeScript-only rules (files: `**/*.ts`, `**/*.tsx`)
- Key rules: unused-imports removal, import ordering, prettier formatting
- `jsx-a11y` set to warn (not error)

---

## Git Workflow

- Branch utama: `main` (production)
- Branch development: `development`
- PR dari `development` → `main` untuk production release
- Commit messages in English, prefixed with: `Feat:`, `Fix:`, `UPDATE:`, `ADD:`

---

## Important Notes

- `maxDuration` set to 300s (5 min) pada beberapa API routes untuk proses berat (AI checking, batch operations)
- Google Sheets parsing mendukung traversal subfolder rekursif di Google Drive
- LKE scoring memiliki fallback ke kriteria PANRB jika skor terlalu rendah
- Batch save setiap 5 item pada proses LKE checking untuk prevent data loss
- Eselon 1 list hardcoded di `types/zi.ts` (10 unit kerja Kementerian ESDM)
