import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { drawFields, wrapTextByWidth } from "@/helper/textWrapper";
import { createLampiranBuilder } from "@/helper/lampiran";
import { drawCheck, drawOptionCheck } from "@/helper/drawChecklist";

// Geometri kotak isian teks panjang pada template hasil scan.
//   top   = jarak dari tepi atas halaman (koordinat pdf-lib dihitung dari bawah)
//   width = lebar aman sebelum teks keluar dari kolom/halaman
//   lines = jatah baris; teks yang melebihi ini dialihkan ke halaman Lampiran
// lineHeight 18 dipertahankan agar tetap sejajar garis cetak pada template.
const BOXES = {
  // Halaman 2 - item 4 Kronologi. Baris "Jakarta, .. 20__" ada di 755pt dari
  // atas, jadi maksimum fisiknya 8 baris; 5 dipakai sebagai margin aman.
  uraianGratifikasi: { x: 48, top: 607, width: 499, lines: 5, lineHeight: 18 },
  // Halaman 2 - uraian objek, dibatasi baris "Perkiraan Nilai" di 479pt
  uraianObjekGratifikasi: {
    x: 236,
    top: 440,
    width: 319,
    lines: 2,
    lineHeight: 18,
  },
  // Halaman 2 - alasan, dibatasi daftar peristiwa yang mulai di 238pt
  alasan: { x: 236, top: 190, width: 319, lines: 3, lineHeight: 18 },
  // Halaman 1 - alamat pelapor, dibatasi baris kecamatan/kabupaten di 736pt.
  // Tidak ikut mekanisme lampiran; hanya dijaga agar tidak keluar halaman.
  alamatPelapor: { x: 280, top: 695, width: 275, lines: 2, lineHeight: 18 },
};

// Judul yang dicetak pada halaman lampiran, mengikuti penamaan di formulir
const JUDUL_LAMPIRAN = {
  alasan: "Alasan pemberian gratifikasi",
  uraianObjekGratifikasi: "Uraian objek penerimaan gratifikasi",
  uraianGratifikasi:
    "Uraian tentang proses terjadinya penerimaan gratifikasi (kapan, dimana, dengan siapa, bagaimana, dan dalam rangka apa)",
};

const NAMA_BULAN = [
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

const boxOpts = (field) => ({
  maxWidth: BOXES[field].width,
  maxLines: BOXES[field].lines,
  lineHeight: BOXES[field].lineHeight,
});

/**
 * Ubah nilai tanggal apa pun menjadi objek Date, atau null kalau tidak valid.
 * Form mengirim string "YYYY-MM-DD", sedangkan dokumen Mongo memberi objek
 * Date (atau string ISO setelah melewati JSON).
 */
export const toDate = (nilai) => {
  if (!nilai) return null;

  const d = nilai instanceof Date ? nilai : new Date(nilai);

  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Normalkan tanggal ke "YYYY-MM-DD" — format yang selama ini tercetak di
 * formulir. Tanpa ini, dokumen dari database akan mencetak timestamp ISO utuh
 * ("2026-08-08T00:00:00.000Z") pada kolom tanggal.
 *
 * Dibaca sebagai tanggal UTC karena Mongo menyimpan "2026-08-08" sebagai
 * tengah malam UTC; memakai getDate() lokal bisa menggeser sehari ke belakang.
 */
export const tanggalISO = (nilai) => {
  const d = toDate(nilai);

  if (!d) return "";

  // String "YYYY-MM-DD" murni tidak perlu diutak-atik
  if (typeof nilai === "string" && /^\d{4}-\d{2}-\d{2}$/.test(nilai.trim())) {
    return nilai.trim();
  }

  return d.toISOString().slice(0, 10);
};

/**
 * Bangun PDF Laporan Gratifikasi dari satu objek laporan.
 *
 * Menerima dua bentuk data yang setara:
 *   - objek form mentah dari `/lapor` (tanggal berupa string "YYYY-MM-DD")
 *   - dokumen Mongo hasil `ReportModel.findById()` (tanggal berupa Date)
 *
 * @param {object} data laporan gratifikasi
 * @returns {Promise<Uint8Array>} byte PDF siap dikirim ke browser
 */
export async function buildLaporanPdf(data) {
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
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Penampung halaman lampiran untuk teks yang tidak muat di formulir
  const lampiran = createLampiranBuilder({
    pdfDoc,
    font,
    fontBold,
    meta: { uniqueId: data.uniqueId, nama: data.nama },
  });

  /**
   * Kembalikan nilai yang layak dicetak pada kotak formulir.
   * Kalau teksnya melebihi jatah baris kotak, teks lengkap dipindah ke
   * halaman Lampiran dan kotaknya cukup diisi penanda "[Lampiran N]".
   */
  const isiAtauLampirkan = (field) => {
    const teks = data[field];
    const box = BOXES[field];

    if (!teks || !box) return teks;

    const baris = wrapTextByWidth(teks, font, 10, box.width);

    if (baris.length <= box.lines) return teks;

    const nomor = lampiran.add(JUDUL_LAMPIRAN[field], teks);

    return `[Lampiran ${nomor}]`;
  };

  // Nomor lampiran mengikuti urutan kemunculan field pada formulir
  const alasan = isiAtauLampirkan("alasan");
  const uraianObjekGratifikasi = isiAtauLampirkan("uraianObjekGratifikasi");
  const uraianGratifikasi = isiAtauLampirkan("uraianGratifikasi");

  // Nama & no. HP pihak yang dapat dihubungi, diisi pelapor lewat form.
  // Dikosongkan kalau tidak diisi (drawFields melewati nilai kosong).
  const kontakReferensi = [data.namaReferensi, data.noTelpReferensi]
    .filter(Boolean)
    .join(" - ");

  // Tanggal surat diambil dari laporannya sendiri, bukan dari jam server,
  // supaya PDF hasil cetak ulang admin identik dengan yang diunduh pelapor.
  const tanggalSurat =
    toDate(data.tanggalLapor) || toDate(data.createdAt) || new Date();
  const tanggal = tanggalSurat.getDate();
  const bulan = NAMA_BULAN[tanggalSurat.getMonth()];
  const duaDigitTahun = String(tanggalSurat.getFullYear()).slice(-2);

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
    [tanggalISO(data.tanggalLahir), 280, height1 - 576, 10],
    [data.instansiPelapor, 280, height1 - 602, 10],
    [data.jabatanPelapor, 280, height1 - 623, 10],
    [data.emailPelapor, 280, height1 - 648, 10],

    // Alamat (wrapp)
    [
      data.alamatPelapor,
      BOXES.alamatPelapor.x,
      height1 - BOXES.alamatPelapor.top,
      10,
      boxOpts("alamatPelapor"),
    ],
    [data.kecamatanPelapor, 318, height1 - 736, 8],
    [data.kabupatenPelapor, 428, height1 - 736, 8],
    [data.provinsiPelapor, 514, height1 - 736, 8],
    [data.noTelpPelapor, 280, height1 - 767, 10],
    [kontakReferensi, 280, height1 - 791, 10],
  ];

  const getValue = (value, otherValue) => {
    if (value === "Lainnya") {
      return otherValue;
    }

    return "";
  };

  const getValueObjekGratifikasi = (value, otherValue) => {
    if (value?.toLowerCase().includes("lainnya")) {
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
    [alasan, BOXES.alasan.x, height2 - BOXES.alasan.top, 10, boxOpts("alasan")],

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
    [
      uraianObjekGratifikasi,
      BOXES.uraianObjekGratifikasi.x,
      height2 - BOXES.uraianObjekGratifikasi.top,
      10,
      boxOpts("uraianObjekGratifikasi"),
    ],
    [
      data.perkiraanNilai
        ? `Rp ${Number(data.perkiraanNilai).toLocaleString("id-ID")}`
        : "",
      236,
      height2 - 479,
      10,
    ],

    // Kronologi Gratifikasi
    [tanggalISO(data.tanggalPenerimaan), 236, height2 - 526, 10],
    [tanggalISO(data.tanggalLapor), 236, height2 - 547, 10],
    [data.tempatPenerimaan, 236, height2 - 569, 10],
    [
      uraianGratifikasi,
      BOXES.uraianGratifikasi.x,
      height2 - BOXES.uraianGratifikasi.top,
      10,
      boxOpts("uraianGratifikasi"),
    ],

    // Lokasi & Tanggal
    ["Jakarta", 400, height2 - 755, 10],
    [String(tanggal) + ` ${bulan}`, 460, height2 - 755, 10],
    [duaDigitTahun, 537, height2 - 755, 10],

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

  // Tulis field ke halaman masing-masing
  drawFields(page1, fieldsPage1, font);
  drawFields(page2, fieldsPage2, font);

  // Tempelkan halaman lampiran (kalau ada) setelah formulir selesai digambar
  lampiran.render();

  return pdfDoc.save();
}
