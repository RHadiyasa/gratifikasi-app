import { google } from 'googleapis'
import fs from 'fs'
import type { NilaiLKE, NilaiKomponen } from '@/types/zi'
import { AI_PATTERN, VR_COL } from '@/lib/zi/constants'
import { calculateNilaiLkeAi } from '@/lib/zi/scoring'
import { writeRingkasanAi } from '@/lib/zi/ringkasan-ai'

function getGoogleAuth() {
  let credentials

  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  } else if (process.env.GOOGLE_CREDENTIALS_FILE && fs.existsSync(process.env.GOOGLE_CREDENTIALS_FILE)) {
    credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_FILE, 'utf8'))
  } else {
    throw new Error('Google credentials tidak ditemukan. Set GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY, atau GOOGLE_CREDENTIALS_FILE')
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

function extractSheetId(url: string): string {
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : url.trim()
}

function parseNum(val: any): number | null {
  if (val === undefined || val === null || String(val).trim() === '') return null
  const n = parseFloat(String(val).replace(/[,%]/g, '').trim())
  return isNaN(n) ? null : n
}

export async function parseRingkasanAI(sheetUrl: string): Promise<NilaiLKE | null> {
  const spreadsheetId = extractSheetId(sheetUrl)
  const auth   = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth } as any)

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Ringkasan AI!A1:B30',
      valueRenderOption: 'UNFORMATTED_VALUE',
    })
    const rows = res.data.values || []
    if (rows.length < 2) return null

    // Baca berdasarkan label (kolom A) → nilai (kolom B), tidak bergantung pada urutan baris
    const labelMap: Record<string, number | null> = {}
    for (const row of rows) {
      const label = String(row[0] ?? '').trim()
      if (!label || label === 'KOMPONEN') continue
      labelMap[label] = parseNum(row[1])
    }

    const get  = (label: string): number | null => labelMap[label] ?? null
    const toK  = (label: string): NilaiKomponen => ({ nilai: get(label), persen: null })

    const nilaiAkhir = get('NILAI AKHIR')
    // Jika nilai akhir tidak ditemukan, sheet belum terisi dengan benar
    if (nilaiAkhir === null) return null

    const target    = String(rows.find((r) => String(r[0]).trim() === 'Target')?.[1] ?? 'WBK')
    const threshold = target === 'WBBM' ? 75 : 60

    const mp        = toK('Manajemen Perubahan')
    const tt        = toK('Penataan Tatalaksana')
    const sdm       = toK('Penataan SDM')
    const ak        = toK('Penguatan Akuntabilitas')
    const pw        = toK('Penguatan Pengawasan')
    const pp        = toK('Peningkatan Pelayanan')
    const totalPeng = toK('Total Pengungkit')
    const ipak      = toK('IPAK')
    const ck        = toK('Capaian Kinerja')
    const bbTotal   = toK('Birokrasi Bersih')
    const prima     = toK('IPKP')
    const ppTotal   = toK('Pelayanan Prima')
    const totalHasil= toK('Total Hasil')

    return {
      pengungkit: {
        manajemen_perubahan:     mp,
        penataan_tatalaksana:    tt,
        penataan_sdm:            sdm,
        penguatan_akuntabilitas: ak,
        penguatan_pengawasan:    pw,
        peningkatan_pelayanan:   pp,
        total:                   totalPeng,
      },
      hasil: {
        birokrasi_bersih: { ipak, capaian_kinerja: ck, total: bbTotal },
        pelayanan_prima:  { ipkp: prima, total: ppTotal },
        total:            totalHasil,
      },
      nilai_akhir:     nilaiAkhir,
      target_tercapai: nilaiAkhir >= threshold,
    }
  } catch (err: any) {
    console.error('[parseRingkasanAI] error:', err.message, 'status:', err.status, 'code:', err.code)
    if (
      err.message?.includes('Unable to parse range') ||
      err.message?.includes('not found') ||
      err.status === 404
    ) return null
    throw err
  }
}

/**
 * Baca Visa review → hitung skor → tulis Ringkasan AI → return NilaiLKE.
 * Dipanggil saat sync dan sheet "Ringkasan AI" belum ada tapi "Visa review" sudah ada.
 */
export async function buildRingkasanFromVisaReview(sheetUrl: string, target: string): Promise<NilaiLKE | null> {
  const spreadsheetId = extractSheetId(sheetUrl)
  const auth   = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth } as any)

  // Baca Visa review
  let rows: any[][]
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Visa review!A:K',
      valueRenderOption: 'UNFORMATTED_VALUE',
    })
    rows = res.data.values || []
  } catch {
    return null // sheet Visa review tidak ada
  }

  if (rows.length < 2) return null

  // Konversi visa review rows ke format scoring
  const results: { id: string; verdict: { color: string } }[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const id = String(row[VR_COL.ID - 1] || '').trim()
    const result = String(row[VR_COL.RESULT - 1] || '')
    if (!id || !AI_PATTERN.test(result)) continue

    const color = /^\u2705/u.test(result) ? 'HIJAU'
      : /^\u26A0\uFE0F/u.test(result) ? 'KUNING' : 'MERAH'
    results.push({ id, verdict: { color } })
  }

  if (results.length === 0) return null

  // Hitung skor
  const nilaiLkeAi = calculateNilaiLkeAi(results, target)

  // Tulis Ringkasan AI sheet
  try {
    await writeRingkasanAi(sheets, spreadsheetId, nilaiLkeAi, target)
  } catch { /* lanjut walau gagal tulis */ }

  return nilaiLkeAi as NilaiLKE
}
