import { NextResponse } from 'next/server'
import { connect } from '@/config/dbconfig'
import LkeKriteria from '@/modules/models/LkeKriteria'
import { ID_DETAIL_MAP } from '@/lib/zi/constants'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

async function getRole(): Promise<string | null> {
  try {
    const token = (await cookies()).get('token')?.value
    if (!token) return null
    const payload: any = jwt.verify(token, process.env.TOKEN_SECRET!)
    return payload.role ?? null
  } catch { return null }
}

const KOMPONEN_MAP: Record<string, string> = {
  'MANAJEMEN PERUBAHAN':                    'mp',
  'PENATAAN TATALAKSANA':                   'tt',
  'PENATAAN SISTEM MANAJEMEN SDM APARATUR': 'sdm',
  'PENGUATAN AKUNTABILITAS':                'ak',
  'PENGUATAN PENGAWASAN':                   'pw',
  'PENINGKATAN KUALITAS PELAYANAN PUBLIK':  'pp',
}

const ANSWER_TYPE_MAP: Record<string, string> = {
  'Ya/Tidak': 'ya_tidak',
  'A/B/C':    'abc',
  'A/B/C/D':  'abcd',
  'A/B/C/D/E':'abcde',
  '%':        'persen',
  'Jumlah':   'jumlah',
}

function normalizeAnswerType(raw: string): string {
  const s = raw.replace(/\n/g, '').trim()
  if (s.includes('Nilai') || s.includes('0-4')) return 'nilai_04'
  return ANSWER_TYPE_MAP[s] ?? 'ya_tidak'
}

// POST /api/zi/kriteria/import — developer only
export async function POST() {
  const role = await getRole()
  if (role !== 'developer') {
    return NextResponse.json({ error: 'Hanya developer yang dapat menjalankan import' }, { status: 403 })
  }

  try {
    await connect()

    const excelPath = path.join(process.cwd(), 'reference', 'Standarisasi Data Dukung ZI new 16Apr.xlsx')
    const fileBuffer = fs.readFileSync(excelPath)
    const wb = XLSX.read(fileBuffer, { type: 'buffer' })
    const ws = wb.Sheets['Standarisasi']
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

    let seksi            = 'pemenuhan'
    let komponen         = ''
    let subKomponen      = ''
    let urutan           = 0
    let lastPersenQid: number | null = null  // track parent for jumlah rows

    const ops: any[] = []

    for (const row of data) {
      const idStr = String(row[0] || '').trim()

      // ── Section header row ──
      if (!/^\d+$/.test(idStr) || parseInt(idStr) > 9999) {
        const c1 = String(row[1] || '').trim().toUpperCase()
        const c2 = String(row[2] || '').trim().toUpperCase()
        const c3 = String(row[3] || '').trim().toUpperCase()
        const c4 = String(row[4] || '').trim()
        const c5 = String(row[5] || '').trim()

        // Top-level: B. HASIL
        if (c1 === 'B.' || c2 === 'HASIL') {
          seksi         = 'hasil'
          komponen      = ''
          lastPersenQid = null
        }

        // PENGUNGKIT subsection: II. REFORM
        if (c2 === 'II.' && String(row[3] || '').trim().toUpperCase() === 'REFORM') {
          seksi         = 'reform'
          komponen      = ''
          lastPersenQid = null
        }
        if (c3 === 'REFORM') {
          seksi         = 'reform'
          komponen      = ''
          lastPersenQid = null
        }

        // Komponen level
        for (const [name, code] of Object.entries(KOMPONEN_MAP)) {
          if (c3 === name || c4.toUpperCase() === name) {
            komponen      = code
            urutan        = 0
            lastPersenQid = null
            break
          }
        }

        // Sub-komponen level: col4 = roman numeral, col5 = label
        if (/^[ivxIVX]+\.$/.test(c4) && c5) {
          subKomponen   = c5.trim()
          lastPersenQid = null  // reset when entering new sub-komponen
        }

        continue
      }

      // ── Question row ──
      const qid    = parseInt(idStr)
      const detail = (ID_DETAIL_MAP as any)[qid]

      const pertanyaan     = String(row[6] || '').trim()
      const bobot          = typeof row[7] === 'number' ? row[7] : (detail?.bobot ?? 0)
      const kriteriaPanrb  = String(row[8] || '').trim()
      const pilihanRaw     = String(row[9] || '').trim()
      const standarDokumen = String(row[10] || '').trim()

      const answerType = normalizeAnswerType(pilihanRaw) as any
      const komponentCode = (seksi === 'hasil'
        ? (detail?.komponen ?? 'ipak')
        : (komponen || detail?.komponen || 'mp')) as any

      // Track persen parent for auto-linking jumlah rows
      const parentQid: number | null = answerType === 'jumlah' ? lastPersenQid : null
      if (answerType === 'persen') lastPersenQid = qid
      else if (answerType !== 'jumlah') lastPersenQid = null  // non-jumlah non-persen resets tracking

      urutan++

      ops.push({
        updateOne: {
          filter: { question_id: qid },
          update: {
            $set: {
              question_id:        qid,
              parent_question_id: parentQid,
              komponen:           komponentCode,
              seksi,
              sub_komponen:       subKomponen,
              urutan,
              pertanyaan,
              standar_dokumen:    standarDokumen,
              kriteria_panrb:     kriteriaPanrb,
              bobot,
              answer_type:        answerType,
              aktif:              true,
            },
          },
          upsert: true,
        },
      })
    }

    if (ops.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data ditemukan di sheet Standarisasi' }, { status: 400 })
    }

    const result = await LkeKriteria.bulkWrite(ops)
    return NextResponse.json({
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      total:    ops.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
