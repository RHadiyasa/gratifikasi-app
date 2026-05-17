import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { connect } from "@/config/dbconfig";
import ElearningParticipant from "@/modules/models/ParticipantModel";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const maxDuration = 60;

const REQUIRED_HEADERS = [
  "Nama Lengkap",
  "NIP",
  "Unit Eselon 2",
  "Unit Eselon 1",
  "Batch",
  "Tahun",
] as const;
const OPTIONAL_HEADERS = ["Jabatan"] as const;
const NIP_REGEX = /^\d{18}$/;
const BATCH_REGEX = /^\d{1,3}$/;

type RowResult = {
  row: number;
  status: "inserted" | "updated" | "skipped" | "error";
  nip?: string;
  message?: string;
};

function normalizeHeader(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function findHeaderIndex(
  headerRow: ExcelJS.Row,
  candidates: readonly string[]
): number | null {
  const lowered = candidates.map((c) => c.toLowerCase());
  let foundIdx: number | null = null;
  headerRow.eachCell((cell, colNumber) => {
    const value = normalizeHeader(cell.value);
    if (lowered.includes(value)) {
      foundIdx = colNumber;
    }
  });
  return foundIdx;
}

function readCellString(row: ExcelJS.Row, colIdx: number | null): string {
  if (!colIdx) return "";
  const value = row.getCell(colIdx).value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in (value as any)) {
    return String((value as any).text ?? "").trim();
  }
  if (typeof value === "object" && "result" in (value as any)) {
    return String((value as any).result ?? "").trim();
  }
  return String(value).trim();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!hasPermission(session?.role, "elearning:participants:manage")) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak punya akses untuk import data peserta.",
        },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const dryRun = formData.get("dryRun") === "true";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, message: "File Excel tidak ditemukan dalam request." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal membaca file Excel. Pastikan file berekstensi .xlsx dan tidak rusak.",
        },
        { status: 400 }
      );
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json(
        { success: false, message: "File Excel tidak punya sheet apapun." },
        { status: 400 }
      );
    }

    const headerRow = sheet.getRow(1);
    const idxNama = findHeaderIndex(headerRow, ["Nama Lengkap", "Nama"]);
    const idxNip = findHeaderIndex(headerRow, ["NIP"]);
    const idxEselon2 = findHeaderIndex(headerRow, [
      "Unit Eselon 2",
      "Unit Eselon II",
      "Eselon 2",
    ]);
    const idxEselon1 = findHeaderIndex(headerRow, [
      "Unit Eselon 1",
      "Unit Eselon I",
      "Eselon 1",
    ]);
    const idxJabatan = findHeaderIndex(headerRow, ["Jabatan"]);
    const idxBatch = findHeaderIndex(headerRow, ["Batch"]);
    const idxTahun = findHeaderIndex(headerRow, ["Tahun", "Year"]);

    const missingHeaders = REQUIRED_HEADERS.filter((h) => {
      if (h === "Nama Lengkap") return !idxNama;
      if (h === "NIP") return !idxNip;
      if (h === "Unit Eselon 2") return !idxEselon2;
      if (h === "Unit Eselon 1") return !idxEselon1;
      if (h === "Batch") return !idxBatch;
      if (h === "Tahun") return !idxTahun;
      return false;
    });
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Kolom wajib tidak ditemukan: ${missingHeaders.join(", ")}. Pastikan baris pertama berisi header yang benar.`,
        },
        { status: 400 }
      );
    }

    const results: RowResult[] = [];
    const upserts: Array<{
      filter: { nip: string };
      update: Record<string, unknown>;
    }> = [];
    const seenNips = new Set<string>();

    const lastRow = sheet.actualRowCount;
    for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const nama = readCellString(row, idxNama);
      const nip = readCellString(row, idxNip).replace(/\s+/g, "");
      const eselon2 = readCellString(row, idxEselon2);
      const eselon1 = readCellString(row, idxEselon1);
      const jabatan = readCellString(row, idxJabatan);
      const batchRaw = readCellString(row, idxBatch).replace(/\s+/g, "");
      const tahunRaw = readCellString(row, idxTahun).replace(/\s+/g, "");

      const isEmpty =
        !nama && !nip && !eselon1 && !eselon2 && !batchRaw && !tahunRaw;
      if (isEmpty) continue;

      if (!nama) {
        results.push({ row: rowNumber, status: "error", nip, message: "Nama kosong." });
        continue;
      }
      if (!nip) {
        results.push({ row: rowNumber, status: "error", message: "NIP kosong." });
        continue;
      }
      if (!NIP_REGEX.test(nip)) {
        results.push({
          row: rowNumber,
          status: "error",
          nip,
          message: "NIP harus 18 digit angka (contoh: 199811222025061013).",
        });
        continue;
      }
      if (!eselon1 || !eselon2) {
        results.push({
          row: rowNumber,
          status: "error",
          nip,
          message: "Unit Eselon 1 dan Eselon 2 wajib diisi.",
        });
        continue;
      }
      if (!batchRaw || !BATCH_REGEX.test(batchRaw)) {
        results.push({
          row: rowNumber,
          status: "error",
          nip,
          message: "Batch wajib diisi dengan angka (1, 2, 3, dst).",
        });
        continue;
      }
      const tahunNum = parseInt(tahunRaw, 10);
      if (!tahunRaw || isNaN(tahunNum) || tahunNum < 2020 || tahunNum > 2100) {
        results.push({
          row: rowNumber,
          status: "error",
          nip,
          message: "Tahun wajib 4 digit angka antara 2020-2100 (contoh: 2026).",
        });
        continue;
      }
      if (seenNips.has(nip)) {
        results.push({
          row: rowNumber,
          status: "skipped",
          nip,
          message: "NIP duplikat di dalam file Excel ini.",
        });
        continue;
      }
      seenNips.add(nip);

      upserts.push({
        filter: { nip },
        update: {
          nama,
          nip,
          unit_eselon_i: eselon1,
          unit_eselon_ii: eselon2,
          jabatan: jabatan || undefined,
          batch: batchRaw,
          tahun: tahunNum,
        },
      });

      results.push({ row: rowNumber, status: "inserted", nip });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        summary: {
          totalRows: results.length,
          willInsertOrUpdate: upserts.length,
          errors: results.filter((r) => r.status === "error").length,
          duplicates: results.filter((r) => r.status === "skipped").length,
        },
        results,
      });
    }

    await connect();

    const existingNips = new Set(
      (
        await ElearningParticipant.find({
          nip: { $in: upserts.map((u) => u.filter.nip) },
        })
          .select("nip")
          .lean()
      ).map((p) => p.nip)
    );

    let inserted = 0;
    let updated = 0;

    if (upserts.length > 0) {
      const ops = upserts.map((u) => ({
        updateOne: {
          filter: u.filter,
          update: {
            $set: u.update,
            $setOnInsert: {
              statusCourse: "Belum",
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      await ElearningParticipant.bulkWrite(ops, { ordered: false });

      for (const u of upserts) {
        if (existingNips.has(u.filter.nip)) {
          updated += 1;
        } else {
          inserted += 1;
        }
      }

      for (const r of results) {
        if (r.status === "inserted" && r.nip && existingNips.has(r.nip)) {
          r.status = "updated";
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      summary: {
        totalRows: results.length,
        inserted,
        updated,
        errors: results.filter((r) => r.status === "error").length,
        duplicates: results.filter((r) => r.status === "skipped").length,
      },
      results,
    });
  } catch (error: any) {
    console.error("Error import peserta:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memproses file Excel.",
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
