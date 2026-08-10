import { rgb } from "pdf-lib";

import { sanitizeWinAnsi, wrapTextByWidth } from "./textWrapper";

// Template Form-Laporan-Gratifikasi-1.pdf tidak punya halaman lampiran dan
// tidak punya text layer, jadi halaman lampiran digambar dari nol dengan
// ukuran A4 yang sama persis dengan MediaBox template.
const LEBAR_HALAMAN = 595;
const TINGGI_HALAMAN = 842;
const MARGIN_X = 56;
const MARGIN_ATAS = 64;
const MARGIN_BAWAH = 56;
const LEBAR_TEKS = LEBAR_HALAMAN - MARGIN_X * 2; // 483pt

const UKURAN_JUDUL = 12;
const UKURAN_SUBJUDUL = 10;
const UKURAN_META = 8;
const UKURAN_ISI = 10;
const JARAK_BARIS_ISI = 14;

const ABU = rgb(0.35, 0.35, 0.35);
const HITAM = rgb(0, 0, 0);

/**
 * Menata (dan opsional menggambar) header halaman lampiran.
 * Jika `page` null, fungsi hanya menghitung — dipakai untuk paginasi supaya
 * perhitungan kapasitas tidak pernah melenceng dari hasil gambarnya.
 *
 * @returns {number} koordinat Y tempat baris isi pertama mulai digambar
 */
function tataHeader(page, { nomor, judul, meta, lanjutan, font, fontBold }) {
  let y = TINGGI_HALAMAN - MARGIN_ATAS;

  const teksJudul = lanjutan ? `LAMPIRAN ${nomor} (lanjutan)` : `LAMPIRAN ${nomor}`;

  if (page) {
    page.drawText(teksJudul, {
      x: MARGIN_X,
      y,
      size: UKURAN_JUDUL,
      font: fontBold,
      color: HITAM,
    });
  }
  y -= 20;

  // Nama field yang dilampirkan, boleh lebih dari satu baris
  const barisSubjudul = wrapTextByWidth(
    judul,
    fontBold,
    UKURAN_SUBJUDUL,
    LEBAR_TEKS
  );

  barisSubjudul.forEach((baris, i) => {
    if (page) {
      page.drawText(baris, {
        x: MARGIN_X,
        y: y - i * 13,
        size: UKURAN_SUBJUDUL,
        font: fontBold,
        color: HITAM,
      });
    }
  });
  y -= Math.max(barisSubjudul.length, 1) * 13;

  // Baris identitas laporan supaya halaman lampiran tetap tertelusur
  // seandainya terpisah dari formulir induknya
  const barisMeta = [
    meta.uniqueId ? `Laporan No. ${meta.uniqueId}` : "",
    meta.nama ? `a.n. ${meta.nama}` : "",
  ]
    .filter(Boolean)
    .join(" - ");

  if (barisMeta) {
    if (page) {
      page.drawText(sanitizeWinAnsi(barisMeta), {
        x: MARGIN_X,
        y,
        size: UKURAN_META,
        font,
        color: ABU,
      });
    }
    y -= 14;
  }

  // Garis pemisah header dengan isi
  if (page) {
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: LEBAR_HALAMAN - MARGIN_X, y },
      thickness: 0.7,
      color: ABU,
    });
  }

  return y - 22;
}

function gambarFooter(page, { nomor, halamanKe, totalHalaman, font }) {
  const teks = `Lampiran ${nomor} - Halaman ${halamanKe} dari ${totalHalaman}`;
  const lebar = font.widthOfTextAtSize(teks, UKURAN_META);

  page.drawText(teks, {
    x: LEBAR_HALAMAN - MARGIN_X - lebar,
    y: MARGIN_BAWAH - 20,
    size: UKURAN_META,
    font,
    color: ABU,
  });
}

/**
 * Penampung lampiran untuk satu dokumen laporan.
 *
 * Dipakai dua tahap karena nomor lampiran harus sudah diketahui sebelum
 * field pada halaman formulir digambar:
 *   1. `add()` saat menyiapkan field  -> mengembalikan nomor lampiran
 *   2. `render()` setelah formulir digambar -> menempelkan halaman lampiran
 */
export function createLampiranBuilder({ pdfDoc, font, fontBold, meta = {} }) {
  const daftar = [];

  return {
    /**
     * Daftarkan satu teks panjang sebagai lampiran.
     * @returns {number} nomor lampiran (mulai dari 1)
     */
    add(judul, teks) {
      daftar.push({ judul, teks });

      return daftar.length;
    },

    get jumlah() {
      return daftar.length;
    },

    render() {
      daftar.forEach(({ judul, teks }, index) => {
        const nomor = index + 1;
        const semuaBaris = wrapTextByWidth(teks, font, UKURAN_ISI, LEBAR_TEKS);

        // Paginasi dulu (tanpa menggambar), supaya "Halaman i dari j" akurat
        const halaman = [];
        let sisa = semuaBaris;

        while (sisa.length || !halaman.length) {
          const lanjutan = halaman.length > 0;
          const yMulai = tataHeader(null, {
            nomor,
            judul,
            meta,
            lanjutan,
            font,
            fontBold,
          });
          const kapasitas = Math.max(
            1,
            Math.floor((yMulai - MARGIN_BAWAH) / JARAK_BARIS_ISI) + 1
          );

          halaman.push(sisa.slice(0, kapasitas));
          sisa = sisa.slice(kapasitas);

          // Jangan mulai halaman baru dengan baris kosong sisa jeda paragraf
          while (sisa.length && !sisa[0]) sisa = sisa.slice(1);
        }

        halaman.forEach((baris, i) => {
          const page = pdfDoc.addPage([LEBAR_HALAMAN, TINGGI_HALAMAN]);
          const yMulai = tataHeader(page, {
            nomor,
            judul,
            meta,
            lanjutan: i > 0,
            font,
            fontBold,
          });

          baris.forEach((line, j) => {
            if (!line) return;
            page.drawText(line, {
              x: MARGIN_X,
              y: yMulai - j * JARAK_BARIS_ISI,
              size: UKURAN_ISI,
              font,
              color: HITAM,
            });
          });

          gambarFooter(page, {
            nomor,
            halamanKe: i + 1,
            totalHalaman: halaman.length,
            font,
          });
        });
      });
    },
  };
}
