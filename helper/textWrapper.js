import { rgb } from "pdf-lib";

// StandardFonts.Helvetica hanya mendukung WinAnsi. Satu karakter hasil paste
// dari Word (kutip melengkung, en/em dash, ellipsis) membuat drawText melempar
// error sehingga seluruh request gagal. Petakan ke padanan ASCII, buang sisanya.
// Ditulis dengan escape \u agar tidak bergantung pada encoding file ini.
const GANTI_KARAKTER = {
  "‘": "'", // kutip tunggal kiri
  "’": "'", // kutip tunggal kanan
  "‚": "'",
  "‛": "'",
  "“": '"', // kutip ganda kiri
  "”": '"', // kutip ganda kanan
  "„": '"',
  "–": "-", // en dash
  "—": "-", // em dash
  "−": "-", // minus
  "…": "...", // ellipsis
  "•": "-", // bullet
  "·": "-", // middle dot
  "‹": "<",
  "›": ">",
  "«": "<<",
  "»": ">>",
  "™": "(TM)",
  " ": " ", // non-breaking space
  "​": "", // zero width space
  "﻿": "", // BOM
};

const POLA_GANTI = new RegExp(`[${Object.keys(GANTI_KARAKTER).join("")}]`, "g");

export function sanitizeWinAnsi(text) {
  if (text === null || text === undefined) return "";

  return String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .replace(POLA_GANTI, (ch) => GANTI_KARAKTER[ch])
    // Sisakan hanya newline + rentang yang pasti tersedia di WinAnsi/Helvetica
    .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, "");
}

const lebar = (font, text, size) => font.widthOfTextAtSize(text, size);

// Pecah satu kata yang lebih lebar dari maxWidth secara paksa per karakter.
function pecahKataPanjang(word, font, size, maxWidth) {
  const potongan = [];
  let buffer = "";

  for (const ch of word) {
    if (buffer && lebar(font, buffer + ch, size) > maxWidth) {
      potongan.push(buffer);
      buffer = ch;
    } else {
      buffer += ch;
    }
  }
  if (buffer) potongan.push(buffer);

  return potongan;
}

/**
 * Pemenggalan baris berbasis lebar font sungguhan (bukan jumlah karakter),
 * sehingga keputusan "muat / tidak muat" pada kotak formulir bisa dipercaya.
 * Newline eksplisit dari <Textarea> dihormati sebagai jeda paragraf.
 */
export function wrapTextByWidth(text, font, size, maxWidth) {
  const bersih = sanitizeWinAnsi(text);

  if (!bersih.trim()) return [];

  const lines = [];

  for (const paragraf of bersih.split("\n")) {
    if (!paragraf.trim()) {
      lines.push("");
      continue;
    }

    let currentLine = "";

    for (const word of paragraf.trim().split(/\s+/)) {
      const kandidat = currentLine ? `${currentLine} ${word}` : word;

      if (lebar(font, kandidat, size) <= maxWidth) {
        currentLine = kandidat;
        continue;
      }

      if (currentLine) lines.push(currentLine);

      if (lebar(font, word, size) > maxWidth) {
        const potongan = pecahKataPanjang(word, font, size, maxWidth);

        lines.push(...potongan.slice(0, -1));
        currentLine = potongan[potongan.length - 1] || "";
      } else {
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
  }

  // Buang baris kosong di ujung agar tidak memakan jatah baris
  while (lines.length && !lines[lines.length - 1]) lines.pop();

  return lines;
}

/**
 * Gambar paragraf pada koordinat tertentu, maksimal `maxLines` baris.
 * Mengembalikan baris yang tergambar beserta sisa yang tidak muat.
 */
export function drawParagraph(
  page,
  { text, x, y, size = 10, font, maxWidth, lineHeight = 18, maxLines }
) {
  const semuaBaris = wrapTextByWidth(text, font, size, maxWidth);
  const batas = maxLines || semuaBaris.length;
  const terpakai = semuaBaris.slice(0, batas);
  const sisa = semuaBaris.slice(batas);

  terpakai.forEach((line, i) => {
    if (!line) return;
    page.drawText(line, {
      x,
      y: y - i * lineHeight,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  });

  return { lines: terpakai, sisa, overflow: sisa.length > 0 };
}

/**
 * Menggambar sekumpulan field ke satu halaman.
 *
 * Bentuk tuple: [value, x, y, size, opts]
 *   - opts tidak diisi -> teks satu baris
 *   - opts = { maxWidth, maxLines, lineHeight } -> paragraf; sisa yang tidak
 *     muat dipotong dan ditandai "..." supaya terlihat, bukan hilang diam-diam
 */
export const drawFields = (page, fields, font) => {
  fields.forEach(([value, x, y, size, opts]) => {
    if (value === null || value === undefined || value === "") return;

    if (opts && opts.maxWidth) {
      const ukuran = size || 10;
      const jarakBaris = opts.lineHeight || 18;
      const { lines, overflow } = drawParagraph(page, {
        text: value,
        x,
        y,
        size: ukuran,
        font,
        maxWidth: opts.maxWidth,
        lineHeight: jarakBaris,
        maxLines: opts.maxLines,
      });

      // Tandai pemotongan pada baris terakhir yang tergambar
      if (overflow && lines.length) {
        const i = lines.length - 1;
        const lebarTitik = font.widthOfTextAtSize("...", ukuran);
        const geser = Math.min(
          font.widthOfTextAtSize(lines[i], ukuran),
          opts.maxWidth - lebarTitik
        );

        page.drawText("...", {
          x: x + Math.max(geser, 0),
          y: y - i * jarakBaris,
          size: ukuran,
          font,
          color: rgb(0, 0, 0),
        });
      }

      return;
    }

    const teks = sanitizeWinAnsi(value);

    if (!teks) return;

    page.drawText(teks, {
      x,
      y,
      size: size || 10,
      font,
      color: rgb(0, 0, 0),
    });
  });
};
