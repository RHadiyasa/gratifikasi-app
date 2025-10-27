import { rgb } from "pdf-lib";


export function wrapText(text, maxCharsPerLine) {
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }

  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines;
}

export const drawFields = (page, fields, font) => {
    
    fields.forEach(([value, x, y, size, type]) => {
      if (!value) return;

      if (type === "wrap") {
        // Pecah teks panjang jadi beberapa baris
        const lines = wrapText(String(value), 120); // 50 karakter per baris
        lines.forEach((line, i) => {
          page.drawText(line, {
            x,
            y: y - i * 18, // jarak antarbaris 12pt
            size: size || 10,
            font,
            color: rgb(0, 0, 0),
          });
        });
      } else if (type === "wrapShort") {
        const lines = wrapText(String(value), 72); // 50 karakter per baris
        lines.forEach((line, i) => {
          page.drawText(line, {
            x,
            y: y - i * 18, // jarak antarbaris 12pt
            size: size || 10,
            font,
            color: rgb(0, 0, 0),
          });
        });
      } else {
        // Teks normal (satu baris)
        page.drawText(String(value), {
          x,
          y,
          size: size || 10,
          font,
          color: rgb(0, 0, 0),
        });
      }
    });
  };