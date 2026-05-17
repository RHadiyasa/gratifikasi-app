import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionUser();
  if (!hasPermission(session?.role, "elearning:participants:manage")) {
    return NextResponse.json(
      { success: false, message: "Anda tidak punya akses untuk download template." },
      { status: 403 }
    );
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem E-Learning Itjen ESDM";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Peserta", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Nama Lengkap", key: "nama", width: 30 },
    { header: "NIP", key: "nip", width: 22 },
    { header: "Unit Eselon 2", key: "eselon2", width: 40 },
    { header: "Unit Eselon 1", key: "eselon1", width: 40 },
    { header: "Jabatan", key: "jabatan", width: 30 },
    { header: "Batch", key: "batch", width: 10 },
    { header: "Tahun", key: "tahun", width: 10 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E40AF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  sheet.addRow({
    nama: "Contoh: Budi Santoso",
    nip: "199811222025061013",
    eselon2: "Sekretariat Inspektorat Jenderal",
    eselon1: "Inspektorat Jenderal",
    jabatan: "Auditor Pertama",
    batch: "1",
    tahun: 2026,
  });

  const infoSheet = workbook.addWorksheet("Petunjuk Pengisian");
  infoSheet.columns = [{ width: 100 }];
  const lines = [
    "PETUNJUK PENGISIAN TEMPLATE IMPORT PESERTA E-LEARNING",
    "",
    "1. Isi data peserta mulai baris ke-2 di sheet 'Peserta'. Jangan ubah baris header.",
    "2. Kolom WAJIB DIISI:",
    "   - Nama Lengkap",
    "   - NIP (harus 18 digit angka, contoh: 199811222025061013)",
    "   - Unit Eselon 2",
    "   - Unit Eselon 1",
    "   - Batch (cukup angka: 1, 2, 3, dst)",
    "   - Tahun (4 digit angka, contoh: 2026)",
    "3. Kolom OPSIONAL (boleh kosong):",
    "   - Jabatan",
    "4. Format NIP harus persis 18 digit angka tanpa spasi, strip, atau karakter lain.",
    "5. Jika ada peserta dengan NIP yang sudah ada di sistem, data akan DIUPDATE.",
    "   Jika belum ada, akan DIBUAT BARU dengan status 'Belum'.",
    "6. NIP duplikat di dalam satu file akan otomatis di-skip (yang pertama dipakai).",
    "7. Hapus baris contoh sebelum di-import.",
    "",
    "Bila ada kendala, hubungi Admin E-Learning.",
  ];
  lines.forEach((text, i) => {
    const row = infoSheet.getRow(i + 1);
    row.getCell(1).value = text;
    if (i === 0) {
      row.font = { bold: true, size: 13 };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="Template_Import_Peserta_Elearning.xlsx"',
    },
  });
}
