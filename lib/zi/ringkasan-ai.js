import { RA_SHEET } from "./constants.js";

export async function ensureRingkasanAiSheet(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))",
  });
  const exists = meta.data.sheets?.some((s) => s.properties.title === RA_SHEET);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: RA_SHEET } } }],
    },
  });
}

export async function writeRingkasanAi(sheets, spreadsheetId, nilaiLkeAi, target) {
  await ensureRingkasanAiSheet(sheets, spreadsheetId);
  const n = nilaiLkeAi;
  const tgl = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const rows = [
    ["KOMPONEN", "NILAI AI"],
    ["Manajemen Perubahan", n.pengungkit.manajemen_perubahan.nilai ?? 0],
    ["Penataan Tatalaksana", n.pengungkit.penataan_tatalaksana.nilai ?? 0],
    ["Penataan SDM", n.pengungkit.penataan_sdm.nilai ?? 0],
    ["Penguatan Akuntabilitas", n.pengungkit.penguatan_akuntabilitas.nilai ?? 0],
    ["Penguatan Pengawasan", n.pengungkit.penguatan_pengawasan.nilai ?? 0],
    ["Peningkatan Pelayanan", n.pengungkit.peningkatan_pelayanan.nilai ?? 0],
    ["Total Pengungkit", n.pengungkit.total.nilai ?? 0],
    ["IPAK", n.hasil.birokrasi_bersih.ipak.nilai ?? 0],
    ["Capaian Kinerja", n.hasil.birokrasi_bersih.capaian_kinerja.nilai ?? 0],
    ["Birokrasi Bersih", n.hasil.birokrasi_bersih.total.nilai ?? 0],
    ["IPKP", n.hasil.pelayanan_prima.ipkp.nilai ?? 0],
    ["Pelayanan Prima", n.hasil.pelayanan_prima.total.nilai ?? 0],
    ["Total Hasil", n.hasil.total.nilai ?? 0],
    ["NILAI AKHIR", n.nilai_akhir ?? 0],
    ["Target", target],
    ["Terakhir Diperbarui", tgl],
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${RA_SHEET}'!A1:B17`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}
