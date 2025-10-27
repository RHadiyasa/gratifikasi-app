import { rgb } from "pdf-lib";

export function drawCheck(page, condition, x, y, font, size = 12) {
  if (condition) {
    page.drawText("v", {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }
}

export const drawOptionCheck = (page, value, options, coordinates, font) => {
  options.forEach((opt, index) => {
    const [x, y] = coordinates[index];
    const isChecked = value === opt;
    drawCheck(page, isChecked, x, y, font);
  });
};