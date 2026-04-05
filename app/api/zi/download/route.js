import fs from "fs";
import path from "path";
import os from "os";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("reportId") || searchParams.get("id");

  if (!reportId || !/^\d+$/.test(reportId)) {
    return new Response("ID laporan tidak valid", { status: 400 });
  }

  const filePath = path.join(os.tmpdir(), "zi-laporan", `laporan_zi_${reportId}.xlsx`);

  if (!fs.existsSync(filePath)) {
    return new Response("Laporan tidak ditemukan atau sudah kedaluwarsa", { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const filename = `laporan_zi_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
