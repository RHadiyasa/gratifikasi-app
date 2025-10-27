import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { NextResponse } from "next/server";
import { drawFields } from "@/helper/textWrapper";
import { drawCheck, drawOptionCheck } from "@/helper/drawChecklist";

export async function POST(request) {
  const data = await request.json();

  // Ambil template PDF dari folder public
  const formPath = path.join(
    process.cwd(),
    "public",
    "Form-Laporan-Gratifikasi-1.pdf"
  );
  const existingPdfBytes = fs.readFileSync(formPath);

  // Buat dokumen baru dari template
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();

  const page1 = pages[0];
  const page2 = pages[1];
  const { height: height1 } = page1.getSize();
  const { height: height2 } = page2.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 🔹 Ambil tanggal sekarang
  const now = new Date();
  const namaBulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const tanggal = now.getDate();
  const bulan = namaBulan[now.getMonth()];

  const relasiOptions = [
    "Merupakan Pemberan dalam keluarga",
    "Penyedia Barang & Jasa/Penerima Layanan/terkait Pengawasan/Pemeriksaan",
    "Antara sesama Pegawai di lingkungan internal instansi",
    "Identitas Pemberi tidak diketahui",
    "Lainnya",
  ];

  const peristiwaOptions = [
    "Pemberian dalam rangka pisah sambut/pensiun/mutasi jabatan/ulang tahun",
    "Pemberian terkait dengan pelaksanaan Tugas Pokok dan Fungsi (Tupoksi)",
    "Pemberian tidak terkait dengan pelaksanaan Tugas Pokok dan Fungsi (Tupoksi)",
    "Pemberian terkait dengan pernikahan/upacara adat/agama lainnya atau terkait musibah/bencana (Lebih dari 1,000,000 per Orang)",
    "Keuntungan Investasi/Manfaat dari Koperasi/Hadiah Undian atau Langsung",
    "Lainnya",
  ];

  const lokasiOptions = [
    "Disimpan Pelapor",
    "Dititipkan di UPG",
    "Dititipkan di KPK",
    "Lainnya",
  ];

  const objekOptions = [
    "Hidangan/Oleh-oleh/Makanan/Minuman kemasan dengan masa berlaku",
    "Karangan Bunga/Cindera mata/Plakat/Barang dengan logo instansi pemberi",
    "Barang lainnya",
    "Tiket Perjalanan/Fasilitas Penginapan/Fasilitas lainnya",
    "Uang/Alat tukar lainnya",
  ];

  const relasiCheckCoords = [
    [234, height2 - 130],
    [234, height2 - 140],
    [234, height2 - 150],
    [234, height2 - 160],
    [234, height2 - 170],
  ];

  const peristiwaCheckCoords = [
    [234, height2 - 238],
    [234, height2 - 248],
    [234, height2 - 258],
    [234, height2 - 268],
    [234, height2 - 301],
    [234, height2 - 311],
  ];

  const lokasiCheckCoords = [
    [234, height2 - 330],
    [234, height2 - 340],
    [234, height2 - 350],
    [234, height2 - 360],
  ];

  const objekCheckCoords = [
    [234, height2 - 379],
    [234, height2 - 389],
    [234, height2 - 399],
    [234, height2 - 409],
    [234, height2 - 419],
  ];

  // Tentukan field untuk HALAMAN 1
  const fieldsPage1 = [
    // Data Pelapor
    [data.nama, 280, height1 - 500, 10],
    [data.nip || data.nik, 280, height1 - 522, 10],
    [data.tempatLahir, 280, height1 - 546, 10],
    [data.tanggalLahir, 280, height1 - 576, 10],
    [data.instansiPelapor, 280, height1 - 602, 10],
    [data.jabatanPelapor, 280, height1 - 623, 10],
    [data.emailPelapor, 280, height1 - 648, 10],

    // Alamat (wrapp)
    [data.alamatPelapor, 280, height1 - 695, 10, "wrapShort"], // maksimal 144 karakter
    [data.kecamatanPelapor, 318, height1 - 736, 8],
    [data.kabupatenPelapor, 428, height1 - 736, 8],
    [data.provinsiPelapor, 514, height1 - 736, 8],
    [data.noTelpPelapor, 280, height1 - 767, 10],
    ["Pihak ketiga - 0891234567887", 280, height1 - 791, 10],
  ];

  const getValue = (value, otherValue) => {
    if (value === "Lainnya") {
      return otherValue;
    }

    return "";
  };

  const getValueObjekGratifikasi = (value, otherValue) => {
    if (value.toLowerCase().includes("lainnya")) {
      return otherValue;
    }

    return "";
  };

  const adjustCoordObjekGratifikasi = (objekGratifikasi) => {
  switch (objekGratifikasi) {
    case "Barang lainnya":
      return { x: 335, y: 397 };
    case "Tiket Perjalanan/Fasilitas Penginapan/Fasilitas lainnya":
      return { x: 465, y: 408 };
    case "Uang/Alat tukar lainnya":
      return { x: 360, y: 418 };
    default:
      return { x: 310, y: 429 }; // fallback
  }
};

  // Tentukan field untuk HALAMAN 2
  const fieldsPage2 = [
    // Pemberi Gratifikasi
    [data.namaPemberi, 236, height2 - 73, 10],
    [data.instansiPemberi, 236, height2 - 94, 10],
    [data.alamatPemberi, 236, height2 - 114, 10],
    [getValue(data.relasi, data.relasiLainnya), 310, height2 - 169, 7],
    [data.alasan, 236, height2 - 190, 10, "wrapShort"], // maksimal 70 karakter

    // Objek Gratifikasi
    [
      getValue(data.peristiwaGratifikasi, data.peristiwaGratifikasiLainnya),
      310,
      height2 - 309,
      7,
    ],
    [
      getValue(data.lokasiObjekGratifikasi, data.lokasiObjekGratifikasiLainnya),
      310,
      height2 - 359,
      7,
    ],
    (() => {
      const pos = adjustCoordObjekGratifikasi(data.objekGratifikasi);
      return [
        getValueObjekGratifikasi(
          data.objekGratifikasi,
          data.objekGratifikasiLainnya
        ),
        pos.x, // posisi X berubah
        height2 - pos.y, // posisi Y berubah
        9,
      ];
    })(),
    [data.uraianObjekGratifikasi, 236, height2 - 440, 10, "wrapShort"], // maksimal 144 karakter
    [
      `Rp ${Number(data.perkiraanNilai).toLocaleString("id-ID")}`,
      236,
      height2 - 479,
      10,
    ],

    // Kronologi Gratifikasi
    [data.tanggalPenerimaan, 236, height2 - 526, 10],
    [data.tanggalLapor, 236, height2 - 547, 10],
    [data.tempatPenerimaan, 236, height2 - 569, 10],
    [data.uraianGratifikasi, 48, height2 - 607, 10, "wrap"], // maksimal 220 karakter



    // Lokasi & Tanggal
    ["Jakarta", 400, height2 - 755, 10],
    [String(tanggal) + ` ${bulan}`, 460, height2 - 755, 10],
    ["25", 537, height2 - 755, 10],

    // Tanda tangan
    [data.nama, 440, height2 - 817, 10],
  ];

  // Draw check Rahasia
  drawCheck(page1, data.secretReport === true, 278, height1 - 430, font);
  drawCheck(page1, data.secretReport === false, 475, height1 - 430, font);
  drawCheck(page2, data.kompensasiPelaporan === true, 452, height1 - 680, font);
  drawCheck(page2, data.kompensasiPelaporan !== true, 528, height1 - 680, font);

  // Draw check jenis laporan
  drawCheck(
    page1,
    data.reportType === "Laporan Penerimaan",
    278,
    height1 - 450,
    font
  );
  drawCheck(
    page1,
    data.reportType !== "Laporan Penerimaan",
    475,
    height1 - 450,
    font
  );

  // Checklist
  drawOptionCheck(page2, data.relasi, relasiOptions, relasiCheckCoords, font);
  drawOptionCheck(
    page2,
    data.peristiwaGratifikasi,
    peristiwaOptions,
    peristiwaCheckCoords,
    font
  );
  drawOptionCheck(
    page2,
    data.lokasiObjekGratifikasi,
    lokasiOptions,
    lokasiCheckCoords,
    font
  );
  drawOptionCheck(
    page2,
    data.objekGratifikasi,
    objekOptions,
    objekCheckCoords,
    font
  );

  console.log(data.secretReport);

  // Tulis field ke halaman masing-masing
  drawFields(page1, fieldsPage1, font);
  drawFields(page2, fieldsPage2, font);

  // Simpan hasil PDF
  const pdfBytes = await pdfDoc.save();

  // Return PDF ke browser
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Laporan-${data.uniqueId || "Anon"}.pdf`,
    },
  });
}
