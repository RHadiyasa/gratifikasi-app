import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { connect } from '@/config/dbconfig'
import LkeKriteria from '@/modules/models/LkeKriteria'
import { ID_DETAIL_MAP } from '@/lib/zi/constants'

async function getRole(): Promise<string | null> {
  try {
    const token = (await cookies()).get('token')?.value
    if (!token) return null
    const payload: any = jwt.verify(token, process.env.TOKEN_SECRET!)
    return payload.role ?? null
  } catch { return null }
}

// Sub-komponen mapping berdasarkan komentar di constants.js
const SUB_KOMPONEN_MAP: Record<number, { sub: string; urutan: number }> = {
  // MP - Pemenuhan
  6:  { sub: 'Penyusunan Tim Kerja', urutan: 1 },
  7:  { sub: 'Penyusunan Tim Kerja', urutan: 2 },
  9:  { sub: 'Rencana Pembangunan ZI', urutan: 1 },
  10: { sub: 'Rencana Pembangunan ZI', urutan: 2 },
  11: { sub: 'Rencana Pembangunan ZI', urutan: 3 },
  13: { sub: 'Pemantauan & Evaluasi', urutan: 1 },
  14: { sub: 'Pemantauan & Evaluasi', urutan: 2 },
  15: { sub: 'Pemantauan & Evaluasi', urutan: 3 },
  17: { sub: 'Perubahan Pola Pikir', urutan: 1 },
  18: { sub: 'Perubahan Pola Pikir', urutan: 2 },
  19: { sub: 'Perubahan Pola Pikir', urutan: 3 },
  20: { sub: 'Perubahan Pola Pikir', urutan: 4 },
  // TT - Pemenuhan
  23: { sub: 'SOP', urutan: 1 },
  24: { sub: 'SOP', urutan: 2 },
  25: { sub: 'SOP', urutan: 3 },
  27: { sub: 'SPBE', urutan: 1 },
  28: { sub: 'SPBE', urutan: 2 },
  29: { sub: 'SPBE', urutan: 3 },
  30: { sub: 'SPBE', urutan: 4 },
  32: { sub: 'Keterbukaan Informasi', urutan: 1 },
  33: { sub: 'Keterbukaan Informasi', urutan: 2 },
  // SDM - Pemenuhan
  36: { sub: 'Perencanaan Kebutuhan', urutan: 1 },
  37: { sub: 'Perencanaan Kebutuhan', urutan: 2 },
  38: { sub: 'Perencanaan Kebutuhan', urutan: 3 },
  40: { sub: 'Pola Mutasi Internal', urutan: 1 },
  41: { sub: 'Pola Mutasi Internal', urutan: 2 },
  42: { sub: 'Pola Mutasi Internal', urutan: 3 },
  44: { sub: 'Pengembangan Berbasis Kompetensi', urutan: 1 },
  45: { sub: 'Pengembangan Berbasis Kompetensi', urutan: 2 },
  46: { sub: 'Pengembangan Berbasis Kompetensi', urutan: 3 },
  47: { sub: 'Pengembangan Berbasis Kompetensi', urutan: 4 },
  48: { sub: 'Pengembangan Berbasis Kompetensi', urutan: 5 },
  49: { sub: 'Pengembangan Berbasis Kompetensi', urutan: 6 },
  51: { sub: 'Penetapan Kinerja Individu', urutan: 1 },
  52: { sub: 'Penetapan Kinerja Individu', urutan: 2 },
  53: { sub: 'Penetapan Kinerja Individu', urutan: 3 },
  54: { sub: 'Penetapan Kinerja Individu', urutan: 4 },
  56: { sub: 'Penegakan Aturan Disiplin', urutan: 1 },
  58: { sub: 'Sistem Informasi Kepegawaian', urutan: 1 },
  // AK - Pemenuhan
  61: { sub: 'Keterlibatan Pimpinan', urutan: 1 },
  62: { sub: 'Keterlibatan Pimpinan', urutan: 2 },
  63: { sub: 'Keterlibatan Pimpinan', urutan: 3 },
  65: { sub: 'Pengelolaan Akuntabilitas Kinerja', urutan: 1 },
  66: { sub: 'Pengelolaan Akuntabilitas Kinerja', urutan: 2 },
  67: { sub: 'Pengelolaan Akuntabilitas Kinerja', urutan: 3 },
  68: { sub: 'Pengelolaan Akuntabilitas Kinerja', urutan: 4 },
  69: { sub: 'Pengelolaan Akuntabilitas Kinerja', urutan: 5 },
  70: { sub: 'Pengelolaan Akuntabilitas Kinerja', urutan: 6 },
  71: { sub: 'Pengelolaan Akuntabilitas Kinerja', urutan: 7 },
  72: { sub: 'Pengelolaan Akuntabilitas Kinerja', urutan: 8 },
  // PW - Pemenuhan
  75: { sub: 'Pengendalian Gratifikasi', urutan: 1 },
  76: { sub: 'Pengendalian Gratifikasi', urutan: 2 },
  78: { sub: 'SPIP', urutan: 1 },
  79: { sub: 'SPIP', urutan: 2 },
  80: { sub: 'SPIP', urutan: 3 },
  81: { sub: 'SPIP', urutan: 4 },
  83: { sub: 'Pengaduan Masyarakat', urutan: 1 },
  84: { sub: 'Pengaduan Masyarakat', urutan: 2 },
  85: { sub: 'Pengaduan Masyarakat', urutan: 3 },
  86: { sub: 'Pengaduan Masyarakat', urutan: 4 },
  88: { sub: 'Whistle-Blowing System', urutan: 1 },
  89: { sub: 'Whistle-Blowing System', urutan: 2 },
  90: { sub: 'Whistle-Blowing System', urutan: 3 },
  92: { sub: 'Penanganan Benturan Kepentingan', urutan: 1 },
  93: { sub: 'Penanganan Benturan Kepentingan', urutan: 2 },
  94: { sub: 'Penanganan Benturan Kepentingan', urutan: 3 },
  95: { sub: 'Penanganan Benturan Kepentingan', urutan: 4 },
  96: { sub: 'Penanganan Benturan Kepentingan', urutan: 5 },
  // PP - Pemenuhan
  99:  { sub: 'Standar Pelayanan', urutan: 1 },
  100: { sub: 'Standar Pelayanan', urutan: 2 },
  101: { sub: 'Standar Pelayanan', urutan: 3 },
  102: { sub: 'Standar Pelayanan', urutan: 4 },
  104: { sub: 'Budaya Pelayanan Prima', urutan: 1 },
  105: { sub: 'Budaya Pelayanan Prima', urutan: 2 },
  106: { sub: 'Budaya Pelayanan Prima', urutan: 3 },
  107: { sub: 'Budaya Pelayanan Prima', urutan: 4 },
  108: { sub: 'Budaya Pelayanan Prima', urutan: 5 },
  109: { sub: 'Budaya Pelayanan Prima', urutan: 6 },
  111: { sub: 'Pengelolaan Pengaduan', urutan: 1 },
  112: { sub: 'Pengelolaan Pengaduan', urutan: 2 },
  113: { sub: 'Pengelolaan Pengaduan', urutan: 3 },
  115: { sub: 'Penilaian Kepuasan Pelayanan', urutan: 1 },
  116: { sub: 'Penilaian Kepuasan Pelayanan', urutan: 2 },
  117: { sub: 'Penilaian Kepuasan Pelayanan', urutan: 3 },
  119: { sub: 'Pemanfaatan Teknologi Informasi', urutan: 1 },
  120: { sub: 'Pemanfaatan Teknologi Informasi', urutan: 2 },
  121: { sub: 'Pemanfaatan Teknologi Informasi', urutan: 3 },
  // MP - Reform
  125: { sub: 'Komitmen dalam Perubahan', urutan: 1 },
  128: { sub: 'Komitmen dalam Perubahan', urutan: 2 },
  132: { sub: 'Komitmen Pimpinan', urutan: 1 },
  134: { sub: 'Membangun Budaya Kerja', urutan: 1 },
  // TT - Reform
  137: { sub: 'Peta Proses Bisnis', urutan: 1 },
  139: { sub: 'SPBE Terintegrasi', urutan: 1 },
  140: { sub: 'SPBE Terintegrasi', urutan: 2 },
  142: { sub: 'Transformasi Digital - Nilai Manfaat', urutan: 1 },
  143: { sub: 'Transformasi Digital - Nilai Manfaat', urutan: 2 },
  144: { sub: 'Transformasi Digital - Nilai Manfaat', urutan: 3 },
  // SDM - Reform
  147: { sub: 'Kinerja Individu', urutan: 1 },
  149: { sub: 'Assessment Pegawai', urutan: 1 },
  151: { sub: 'Pelanggaran Disiplin Pegawai', urutan: 1 },
  // AK - Reform
  157: { sub: 'Meningkatnya Capaian Kinerja', urutan: 1 },
  161: { sub: 'Pemberian Reward and Punishment', urutan: 1 },
  163: { sub: 'Kerangka Logis Kinerja', urutan: 1 },
  // PW - Reform
  166: { sub: 'Mekanisme Pengendalian', urutan: 1 },
  168: { sub: 'Penanganan Pengaduan Masyarakat', urutan: 1 },
  174: { sub: 'Penyampaian LHKPN', urutan: 1 },
  181: { sub: 'Penyampaian Non-LHKPN', urutan: 1 },
  // PP - Reform
  189: { sub: 'Upaya dan/atau Inovasi Pelayanan', urutan: 1 },
  190: { sub: 'Upaya dan/atau Inovasi Pelayanan', urutan: 2 },
  194: { sub: 'Penanganan Pengaduan dan Konsultasi', urutan: 1 },
  // Hasil
  199: { sub: 'IPAK', urutan: 1 },
  200: { sub: 'Capaian Kinerja', urutan: 1 },
  202: { sub: 'Pelayanan Prima (IPKP)', urutan: 1 },
}

// POST /api/zi/kriteria/seed — developer only, jalankan sekali
export async function POST() {
  const role = await getRole()
  if (role !== 'developer') {
    return NextResponse.json({ error: 'Hanya developer yang dapat menjalankan seed' }, { status: 403 })
  }
  try {
    await connect()

    const existing = await LkeKriteria.countDocuments()
    if (existing > 0) {
      return NextResponse.json({
        message: `Seed dilewati: sudah ada ${existing} kriteria di database`,
        existing,
      })
    }

    const ops = Object.entries(ID_DETAIL_MAP).map(([idStr, detail]: [string, any]) => {
      const qid = parseInt(idStr)
      const subInfo = SUB_KOMPONEN_MAP[qid] ?? { sub: '', urutan: 0 }
      return {
        updateOne: {
          filter: { question_id: qid },
          update: {
            $setOnInsert: {
              question_id:     qid,
              komponen:        detail.komponen,
              sub_komponen:    subInfo.sub,
              urutan:          subInfo.urutan,
              pertanyaan:      '',
              standar_dokumen: '',
              kriteria_panrb:  '',
              bobot:           detail.bobot,
              answer_type:     detail.answer_type,
              aktif:           true,
            },
          },
          upsert: true,
        },
      }
    })

    const result = await LkeKriteria.bulkWrite(ops)
    return NextResponse.json({
      message: `Seed selesai: ${result.upsertedCount} kriteria dibuat`,
      upserted: result.upsertedCount,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
