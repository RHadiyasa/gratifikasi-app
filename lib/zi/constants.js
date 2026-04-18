// ── Sheet Names ─────────────────────────────────────────
export const RA_SHEET = "Ringkasan AI";
export const VR_SHEET = "Visa review";

// ── Visa Review Column Mapping ──────────────────────────
export const VR_COL = {
  ID: 1,        // A
  BUKTI: 2,     // B
  LINK: 3,      // C
  FINGERPRINT: 4, // D
  RESULT: 5,    // E
  REVIU: 6,     // F
  SUPERVISI: 7, // G
  TGL_CEK: 8,   // H
  KOMPONEN: 9,  // I
  BOBOT: 10,    // J
  NILAI_AI: 11, // K
};

export const VR_HEADER = [
  "ID",
  "Bukti Data",
  "Link Dicek",
  "Fingerprint",
  "Result AI",
  "Reviu AI",
  "Status Supervisi",
  "Tgl Cek",
  "Komponen",
  "Bobot",
  "Nilai AI",
];

// ── LKE Penilaian Column Mapping ────────────────────────
export const COL = { ID: 1, BUKTI: 13, LINK: 14 };

// ── Regex ───────────────────────────────────────────────
export const AI_PATTERN = /^[✅⚠️❌]/u;

// ── Standarisasi Column Mapping ─────────────────────────
export const STANDAR = { ID: 1, DOK: 11 };

// ── Komponen Labels ─────────────────────────────────────
export const KOMPONEN_LABEL = {
  mp: "Manajemen Perubahan",
  tt: "Penataan Tatalaksana",
  sdm: "Penataan SDM",
  ak: "Penguatan Akuntabilitas",
  pw: "Penguatan Pengawasan",
  pp: "Peningkatan Pelayanan",
  ipak: "Hasil - IPAK",
  capaian_kinerja: "Hasil - Capaian Kinerja",
  prima: "Hasil - Pelayanan Prima",
};

// ── ID → Detail Mapping (komponen + bobot + answer_type) ─
// Bobot per ID = bobot sub-komponen / jumlah pertanyaan dalam sub-komponen
// answer_type: ya_tidak | abc | abcd | abcde | persen | nilai_04
export const ID_DETAIL_MAP = {
  // ── PEMENUHAN ── MANAJEMEN PERUBAHAN (4.00) ──────────────────────────────
  // i. Penyusunan Tim Kerja (0.50 ÷ 2)
  6: { komponen: "mp", bobot: 0.25, answer_type: "ya_tidak" },
  7: { komponen: "mp", bobot: 0.25, answer_type: "abc" },
  // ii. Rencana Pembangunan ZI (1.00 ÷ 3)
  9: { komponen: "mp", bobot: 0.3333, answer_type: "ya_tidak" },
  10: { komponen: "mp", bobot: 0.3333, answer_type: "abc" },
  11: { komponen: "mp", bobot: 0.3333, answer_type: "abc" },
  // iii. Pemantauan & Evaluasi (1.00 ÷ 3)
  13: { komponen: "mp", bobot: 0.3333, answer_type: "abcd" },
  14: { komponen: "mp", bobot: 0.3333, answer_type: "abcd" },
  15: { komponen: "mp", bobot: 0.3333, answer_type: "abcd" },
  // iv. Perubahan Pola Pikir (1.50 ÷ 4)
  17: { komponen: "mp", bobot: 0.375, answer_type: "ya_tidak" },
  18: { komponen: "mp", bobot: 0.375, answer_type: "abc" },
  19: { komponen: "mp", bobot: 0.375, answer_type: "abc" },
  20: { komponen: "mp", bobot: 0.375, answer_type: "abcd" },
  // ── PEMENUHAN ── PENATAAN TATALAKSANA (3.50) ─────────────────────────────
  // i. SOP (1.00 ÷ 3)
  23: { komponen: "tt", bobot: 0.3333, answer_type: "abcd" },
  24: { komponen: "tt", bobot: 0.3333, answer_type: "abcde" },
  25: { komponen: "tt", bobot: 0.3333, answer_type: "abcde" },
  // ii. SPBE (2.00 ÷ 4)
  27: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  28: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  29: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  30: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  // iii. Keterbukaan Informasi (0.50 ÷ 2)
  32: { komponen: "tt", bobot: 0.25, answer_type: "abc" },
  33: { komponen: "tt", bobot: 0.25, answer_type: "abc" },
  // ── PEMENUHAN ── PENATAAN SDM (5.00) ─────────────────────────────────────
  // i. Perencanaan Kebutuhan (0.25 ÷ 3)
  36: { komponen: "sdm", bobot: 0.0833, answer_type: "ya_tidak" },
  37: { komponen: "sdm", bobot: 0.0833, answer_type: "abcd" },
  38: { komponen: "sdm", bobot: 0.0833, answer_type: "ya_tidak" },
  // ii. Pola Mutasi Internal (0.50 ÷ 3)
  40: { komponen: "sdm", bobot: 0.1667, answer_type: "ya_tidak" },
  41: { komponen: "sdm", bobot: 0.1667, answer_type: "abcde" },
  42: { komponen: "sdm", bobot: 0.1667, answer_type: "ya_tidak" },
  // iii. Pengembangan Berbasis Kompetensi (1.25 ÷ 6)
  44: { komponen: "sdm", bobot: 0.2083, answer_type: "ya_tidak" },
  45: { komponen: "sdm", bobot: 0.2083, answer_type: "abcd" },
  46: { komponen: "sdm", bobot: 0.2083, answer_type: "abcd" },
  47: { komponen: "sdm", bobot: 0.2083, answer_type: "abcd" },
  48: { komponen: "sdm", bobot: 0.2083, answer_type: "abcd" },
  49: { komponen: "sdm", bobot: 0.2083, answer_type: "abc" },
  // iv. Penetapan Kinerja Individu (2.00 ÷ 4)
  51: { komponen: "sdm", bobot: 0.5, answer_type: "abcd" },
  52: { komponen: "sdm", bobot: 0.5, answer_type: "abcd" },
  53: { komponen: "sdm", bobot: 0.5, answer_type: "abcde" },
  54: { komponen: "sdm", bobot: 0.5, answer_type: "ya_tidak" },
  // v. Penegakan Aturan Disiplin (0.75)
  56: { komponen: "sdm", bobot: 0.75, answer_type: "abcd" },
  // vi. Sistem Informasi Kepegawaian (0.25)
  58: { komponen: "sdm", bobot: 0.25, answer_type: "abc" },
  // ── PEMENUHAN ── PENGUATAN AKUNTABILITAS (5.00) ───────────────────────────
  // i. Keterlibatan Pimpinan (2.50 ÷ 3)
  61: { komponen: "ak", bobot: 0.8333, answer_type: "abc" },
  62: { komponen: "ak", bobot: 0.8333, answer_type: "abc" },
  63: { komponen: "ak", bobot: 0.8333, answer_type: "abcd" },
  // ii. Pengelolaan Akuntabilitas Kinerja (2.50 ÷ 8)
  65: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  66: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  67: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  68: { komponen: "ak", bobot: 0.3125, answer_type: "abcd" },
  69: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  70: { komponen: "ak", bobot: 0.3125, answer_type: "abc" },
  71: { komponen: "ak", bobot: 0.3125, answer_type: "ya_tidak" },
  72: { komponen: "ak", bobot: 0.3125, answer_type: "abc" },
  // ── PEMENUHAN ── PENGUATAN PENGAWASAN (7.50) ──────────────────────────────
  // i. Pengendalian Gratifikasi (1.50 ÷ 2)
  75: { komponen: "pw", bobot: 0.75, answer_type: "abc" },
  76: { komponen: "pw", bobot: 0.75, answer_type: "abcd" },
  // ii. SPIP (1.50 ÷ 4)
  78: { komponen: "pw", bobot: 0.375, answer_type: "abcde" },
  79: { komponen: "pw", bobot: 0.375, answer_type: "abcde" },
  80: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  81: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  // iii. Pengaduan Masyarakat (1.50 ÷ 4)
  83: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  84: { komponen: "pw", bobot: 0.375, answer_type: "ya_tidak" },
  85: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  86: { komponen: "pw", bobot: 0.375, answer_type: "abc" },
  // iv. Whistle-Blowing System (1.50 ÷ 3)
  88: { komponen: "pw", bobot: 0.5, answer_type: "abc" },
  89: { komponen: "pw", bobot: 0.5, answer_type: "abc" },
  90: { komponen: "pw", bobot: 0.5, answer_type: "abc" },
  // v. Penanganan Benturan Kepentingan (1.50 ÷ 5)
  92: { komponen: "pw", bobot: 0.3, answer_type: "abcd" },
  93: { komponen: "pw", bobot: 0.3, answer_type: "abcd" },
  94: { komponen: "pw", bobot: 0.3, answer_type: "abcd" },
  95: { komponen: "pw", bobot: 0.3, answer_type: "abc" },
  96: { komponen: "pw", bobot: 0.3, answer_type: "abc" },
  // ── PEMENUHAN ── PENINGKATAN KUALITAS PELAYANAN PUBLIK (5.00) ────────────
  // i. Standar Pelayanan (1.00 ÷ 4)
  99: { komponen: "pp", bobot: 0.25, answer_type: "abcde" },
  100: { komponen: "pp", bobot: 0.25, answer_type: "abcd" },
  101: { komponen: "pp", bobot: 0.25, answer_type: "abcd" },
  102: { komponen: "pp", bobot: 0.25, answer_type: "ya_tidak" },
  // ii. Budaya Pelayanan Prima (1.00 ÷ 6)
  104: { komponen: "pp", bobot: 0.1667, answer_type: "abcde" },
  105: { komponen: "pp", bobot: 0.1667, answer_type: "abcd" },
  106: { komponen: "pp", bobot: 0.1667, answer_type: "abcd" },
  107: { komponen: "pp", bobot: 0.1667, answer_type: "abcd" },
  108: { komponen: "pp", bobot: 0.1667, answer_type: "abcd" },
  109: { komponen: "pp", bobot: 0.1667, answer_type: "abcde" },
  // iii. Pengelolaan Pengaduan (1.00 ÷ 3)
  111: { komponen: "pp", bobot: 0.3333, answer_type: "abcde" },
  112: { komponen: "pp", bobot: 0.3333, answer_type: "abc" },
  113: { komponen: "pp", bobot: 0.3333, answer_type: "abc" },
  // iv. Penilaian Kepuasan terhadap Pelayanan (1.00 ÷ 3)
  115: { komponen: "pp", bobot: 0.3333, answer_type: "abcde" },
  116: { komponen: "pp", bobot: 0.3333, answer_type: "abc" },
  117: { komponen: "pp", bobot: 0.3333, answer_type: "abcd" },
  // v. Pemanfaatan Teknologi Informasi (1.00 ÷ 3)
  119: { komponen: "pp", bobot: 0.3333, answer_type: "abcd" },
  120: { komponen: "pp", bobot: 0.3333, answer_type: "ya_tidak" },
  121: { komponen: "pp", bobot: 0.3333, answer_type: "abc" },
  // ── REFORM ── MANAJEMEN PERUBAHAN (4.00) ─────────────────────────────────
  // i. Komitmen dalam Perubahan (2.00 ÷ 2)
  125: { komponen: "mp", bobot: 1.0, answer_type: "persen" },
  128: { komponen: "mp", bobot: 1.0, answer_type: "persen" },
  // ii. Komitmen Pimpinan (1.00)
  132: { komponen: "mp", bobot: 1.0, answer_type: "abcde" },
  // iii. Membangun Budaya Kerja (1.00)
  134: { komponen: "mp", bobot: 1.0, answer_type: "abcd" },
  // ── REFORM ── PENATAAN TATALAKSANA (3.50) ────────────────────────────────
  // i. Peta Proses Bisnis (0.50)
  137: { komponen: "tt", bobot: 0.5, answer_type: "abcd" },
  // ii. SPBE Terintegrasi (1.00 ÷ 2)
  139: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  140: { komponen: "tt", bobot: 0.5, answer_type: "abc" },
  // iii. Transformasi Digital Memberikan Nilai Manfaat (2.00 ÷ 3)
  142: { komponen: "tt", bobot: 0.6667, answer_type: "abcde" },
  143: { komponen: "tt", bobot: 0.6667, answer_type: "abcde" },
  144: { komponen: "tt", bobot: 0.6667, answer_type: "abcde" },
  // ── REFORM ── PENATAAN SDM (5.00) ────────────────────────────────────────
  // i. Kinerja Individu (1.50)
  147: { komponen: "sdm", bobot: 1.5, answer_type: "abc" },
  // ii. Assessment Pegawai (1.50)
  149: { komponen: "sdm", bobot: 1.5, answer_type: "abc" },
  // iii. Pelanggaran Disiplin Pegawai (2.00)
  151: { komponen: "sdm", bobot: 2.0, answer_type: "persen" },
  // ── REFORM ── PENGUATAN AKUNTABILITAS (5.00) ─────────────────────────────
  // i. Meningkatnya Capaian Kinerja (2.00)
  157: { komponen: "ak", bobot: 2.0, answer_type: "persen" },
  // ii. Pemberian Reward and Punishment (1.50)
  161: { komponen: "ak", bobot: 1.5, answer_type: "abcd" },
  // iii. Kerangka Logis Kinerja (1.50)
  163: { komponen: "ak", bobot: 1.5, answer_type: "abcd" },
  // ── REFORM ── PENGUATAN PENGAWASAN (7.50) ────────────────────────────────
  // i. Mekanisme Pengendalian (2.50)
  166: { komponen: "pw", bobot: 2.5, answer_type: "abcde" },
  // ii. Penanganan Pengaduan Masyarakat (3.00)
  168: { komponen: "pw", bobot: 3.0, answer_type: "persen" },
  // iii. Penyampaian LHKPN (1.00)
  174: { komponen: "pw", bobot: 1.0, answer_type: "persen" },
  // iv. Penyampaian Non-LHKPN (1.00)
  181: { komponen: "pw", bobot: 1.0, answer_type: "persen" },
  // ── REFORM ── PENINGKATAN KUALITAS PELAYANAN PUBLIK (5.00) ───────────────
  // i. Upaya dan/atau Inovasi Pelayanan (2.50 ÷ 2)
  189: { komponen: "pp", bobot: 1.25, answer_type: "abcd" },
  190: { komponen: "pp", bobot: 1.25, answer_type: "persen" },
  // ii. Penanganan Pengaduan Pelayanan dan Konsultasi (2.50)
  194: { komponen: "pp", bobot: 2.5, answer_type: "abcd" },
  // ── HASIL ─────────────────────────────────────────────────────────────────
  199: { komponen: "ipak", bobot: 17.5, answer_type: "nilai_04" },
  200: { komponen: "capaian_kinerja", bobot: 5.0, answer_type: "abcde" },
  202: { komponen: "prima", bobot: 17.5, answer_type: "nilai_04" },
};
