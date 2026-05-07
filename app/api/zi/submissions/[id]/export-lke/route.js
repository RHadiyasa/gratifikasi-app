import ExcelJS from "exceljs";
import path from "path";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import LkeJawaban from "@/modules/models/LkeJawaban";
import LkeKriteria from "@/modules/models/LkeKriteria";

export const dynamic = "force-dynamic";

const TEMPLATE_PATH = path.join(process.cwd(), "reference", "Export_Template_LKE.xlsx");

const SOURCE_CONFIG = {
  unit: {
    label: "Unit",
    sheet: "Unit",
    answerCol: "K",
    noteCol: "L",
    scoreCol: "W",
    pctCol: "X",
    noteField: "narasi",
    answerField: "jawaban_unit",
  },
  tpiUnit: {
    label: "TPI Unit",
    sheet: "TPI Unit",
    answerCol: "O",
    noteCol: "R",
    scoreCol: "P",
    pctCol: "Q",
    noteField: "catatan_tpi_unit",
    answerField: "jawaban_tpi_unit",
  },
  tpiItjen: {
    label: "TPI Itjen",
    sheet: "TPI Itjen",
    answerCol: "S",
    noteCol: "V",
    scoreCol: "T",
    pctCol: "U",
    noteField: "catatan_tpi_itjen",
    answerField: "jawaban_tpi_itjen",
  },
};

const KOMPONEN_LABEL = {
  mp: "MANAJEMEN PERUBAHAN",
  tt: "PENATAAN TATALAKSANA",
  sdm: "PENATAAN SISTEM MANAJEMEN SDM APARATUR",
  ak: "PENGUATAN AKUNTABILITAS",
  pw: "PENGUATAN PENGAWASAN",
  pp: "PENINGKATAN KUALITAS PELAYANAN PUBLIK",
};

const KOMPONEN_ORDER = ["mp", "tt", "sdm", "ak", "pw", "pp"];
const HASIL_KEYS = ["ipak", "capaian_kinerja", "prima"];
const REVIEW_SOURCE_KEYS = ["tpiUnit", "tpiItjen"];
const REFORM_ID_MIN = 123;
const REFORM_ID_MAX = 194;

const SUMMARY_COMPONENT_ROWS = [
  { key: "mp", label: KOMPONEN_LABEL.mp, bobot: 8, pemenuhanId: 4, reformId: 123, row: 6 },
  { key: "tt", label: KOMPONEN_LABEL.tt, bobot: 7, pemenuhanId: 21, reformId: 135, row: 7 },
  { key: "sdm", label: KOMPONEN_LABEL.sdm, bobot: 10, pemenuhanId: 34, reformId: 145, row: 8 },
  { key: "ak", label: KOMPONEN_LABEL.ak, bobot: 10, pemenuhanId: 59, reformId: 155, row: 9 },
  { key: "pw", label: KOMPONEN_LABEL.pw, bobot: 15, pemenuhanId: 73, reformId: 164, row: 10 },
  { key: "pp", label: KOMPONEN_LABEL.pp, bobot: 10, pemenuhanId: 97, reformId: 187, row: 11 },
];

const STRUCTURAL_SCORE_ROWS = [
  { id: 3, kind: "pemenuhanTotal", max: 30 },
  { id: 122, kind: "reformTotal", max: 30 },
  { id: 195, kind: "pengungkitTotal", max: 60 },
  { id: 198, kind: "birokrasiBersihTotal", max: 22.5 },
  { id: 201, kind: "primaTotal", max: 17.5 },
  { id: 203, kind: "hasilTotal", max: 40 },
  { id: 204, kind: "finalTotal", max: 100 },
];

const COMPONENT_STRUCTURAL_ROWS = SUMMARY_COMPONENT_ROWS.flatMap((row) => [
  { id: row.pemenuhanId, key: row.key, section: "pemenuhan", max: row.bobot / 2 },
  { id: row.reformId, key: row.key, section: "reform", max: row.bobot / 2 },
]);

const EXPORT_MINIMUMS = {
  komponenPengungkitRatio: { WBK: 0.6, WBBM: 0.75 },
  totalPengungkit: { WBK: 40, WBBM: 48 },
  birokrasiBersih: { WBK: 18.25, WBBM: 19.5 },
  ipak: { WBK: 15.75, WBBM: 15.75 },
  capaianKinerja: { WBK: 2.5, WBBM: 3.75 },
  pelayananPrima: { WBK: 14, WBBM: 15.75 },
  nilaiTotal: { WBK: 75, WBBM: 85 },
};

function r2(value) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function safeFileName(value) {
  return String(value || "unit")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 48);
}

function isDetailKriteria(kriteria) {
  return kriteria?.answer_type === "jumlah" && kriteria?.parent_question_id != null;
}

function getEffectiveSeksi(kriteria) {
  if (HASIL_KEYS.includes(kriteria?.komponen)) return "hasil";
  const id = Number(kriteria?.parent_question_id ?? kriteria?.question_id);
  if (id >= REFORM_ID_MIN && id <= REFORM_ID_MAX) return "reform";
  if (kriteria?.seksi === "reform") return "reform";
  if (kriteria?.seksi === "hasil") return "hasil";
  return "pemenuhan";
}

function parseNumeric(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw
    .replace("%", "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function getAnswerRatio(answerType, value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();

  if (answerType === "ya_tidak") {
    if (upper === "YA" || upper === "YES") return 1;
    if (upper === "TIDAK" || upper === "NO") return 0;
    return null;
  }
  if (answerType === "abc") {
    if (upper === "A") return 1;
    if (upper === "B") return 0.5;
    if (upper === "C") return 0;
    return null;
  }
  if (answerType === "abcd") {
    if (upper === "A") return 1;
    if (upper === "B") return 0.67;
    if (upper === "C") return 0.33;
    if (upper === "D") return 0;
    return null;
  }
  if (answerType === "abcde") {
    if (upper === "A") return 1;
    if (upper === "B") return 0.75;
    if (upper === "C") return 0.5;
    if (upper === "D") return 0.25;
    if (upper === "E") return 0;
    return null;
  }
  if (answerType === "persen") {
    const numeric = parseNumeric(raw);
    if (numeric === null) return null;
    return Math.max(0, Math.min(100, numeric)) / 100;
  }
  if (answerType === "nilai_04") {
    const numeric = parseNumeric(raw);
    if (numeric === null) return null;
    return Math.max(0, Math.min(4, numeric)) / 4;
  }
  return null;
}

function getSourceAnswerValue(jawaban, sourceKey) {
  return jawaban?.[SOURCE_CONFIG[sourceKey].answerField] ?? "";
}

function evalTokensDetailed(tokens, values) {
  if (!tokens?.length) return { value: 0, hasDivisionByZero: false };
  const prec = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const out = [];
  const ops = [];
  let hasDivisionByZero = false;

  function applyOp(op) {
    const b = out.pop() ?? 0;
    const a = out.pop() ?? 0;
    if (op === "+") out.push(a + b);
    else if (op === "-") out.push(a - b);
    else if (op === "*") out.push(a * b);
    else if (op === "/") {
      if (b === 0) {
        hasDivisionByZero = true;
        out.push(0);
      } else {
        out.push(a / b);
      }
    }
  }

  for (const token of tokens) {
    if (token.kind === "operand") {
      out.push(values[token.ref] ?? 0);
    } else if (token.kind === "op") {
      while (ops.length && ops[ops.length - 1] !== "(" && prec[ops[ops.length - 1]] >= prec[token.op]) {
        applyOp(ops.pop());
      }
      ops.push(token.op);
    } else if (token.kind === "open_paren") {
      ops.push("(");
    } else if (token.kind === "close_paren") {
      while (ops.length && ops[ops.length - 1] !== "(") applyOp(ops.pop());
      ops.pop();
    }
  }
  while (ops.length) applyOp(ops.pop());
  return { value: out[0] ?? 0, hasDivisionByZero };
}

function evalTokens(tokens, values) {
  return evalTokensDetailed(tokens, values).value;
}

function computeSubItemValues(subItems, jawabanById, sourceKey) {
  const byUrutan = {};
  for (const item of subItems) byUrutan[item.urutan] = item;

  const visited = new Set();
  const sorted = [];
  function visit(urutan) {
    if (visited.has(urutan)) return;
    visited.add(urutan);
    const item = byUrutan[urutan];
    if (item?.is_computed && item.formula_tokens?.length) {
      for (const token of item.formula_tokens) {
        if (token.kind === "operand") visit(token.ref);
      }
    }
    if (item) sorted.push(item);
  }
  for (const item of subItems) visit(item.urutan);

  const values = {};
  for (const item of sorted) {
    if (item.is_computed && item.formula_tokens?.length) {
      values[item.urutan] = evalTokens(item.formula_tokens, values);
    } else {
      values[item.urutan] = parseNumeric(getSourceAnswerValue(jawabanById.get(item.question_id), sourceKey)) ?? 0;
    }
  }
  return values;
}

function hasSubItemInput(subItems, jawabanById, sourceKey) {
  return subItems.some((item) => String(getSourceAnswerValue(jawabanById.get(item.question_id), sourceKey) ?? "").trim() !== "");
}

function computePersenValue(kriteria, subItems, jawabanById, sourceKey) {
  const direct = getSourceAnswerValue(jawabanById.get(kriteria.question_id), sourceKey);
  if (!kriteria.formula_tokens?.length || !subItems.length || !hasSubItemInput(subItems, jawabanById, sourceKey)) {
    const ratio = getAnswerRatio("persen", direct);
    return ratio === null ? null : ratio * 100;
  }

  const values = computeSubItemValues(subItems, jawabanById, sourceKey);
  const min = kriteria.formula_min ?? 0;
  const max = kriteria.formula_max ?? 100;
  const result = evalTokensDetailed(kriteria.formula_tokens, values);
  if (result.hasDivisionByZero && kriteria.formula_zero_division_full_score) {
    return Math.min(max, Math.max(min, max));
  }
  const raw = result.value * 100;
  if (!Number.isFinite(raw)) return null;
  return Math.min(max, Math.max(min, raw));
}

function getDisplayAnswer(kriteria, jawabanById, subItemsByParent, sourceKey) {
  const jawaban = jawabanById.get(kriteria.question_id);
  if (kriteria.answer_type === "persen") {
    const persen = computePersenValue(kriteria, subItemsByParent.get(kriteria.question_id) ?? [], jawabanById, sourceKey);
    return persen === null ? "" : { value: persen / 100, numFmt: "0.00%" };
  }

  if (kriteria.answer_type === "jumlah" && kriteria.is_computed && kriteria.parent_question_id != null) {
    const siblings = subItemsByParent.get(kriteria.parent_question_id) ?? [];
    const values = computeSubItemValues(siblings, jawabanById, sourceKey);
    return values[kriteria.urutan] ?? "";
  }

  return getSourceAnswerValue(jawaban, sourceKey);
}

function isBlankDisplayAnswer(display) {
  if (display && typeof display === "object" && "value" in display) {
    return String(display.value ?? "").trim() === "";
  }
  return String(display ?? "").trim() === "";
}

function findMissingReviewAnswers(kriteriaList, jawabanById, subItemsByParent, template) {
  const missing = [];

  for (const kriteria of kriteriaList) {
    const rowNumber = getTemplateRowNumber(kriteria, template, subItemsByParent);
    if (!rowNumber) continue;

    for (const sourceKey of REVIEW_SOURCE_KEYS) {
      const display = getDisplayAnswer(kriteria, jawabanById, subItemsByParent, sourceKey);
      if (!isBlankDisplayAnswer(display)) continue;

      missing.push({
        source: SOURCE_CONFIG[sourceKey].label,
        questionId: Number(kriteria.question_id),
        rowNumber,
        column: SOURCE_CONFIG[sourceKey].answerCol,
        pertanyaan: kriteria.pertanyaan || "",
      });
    }
  }

  return missing.sort((a, b) => a.rowNumber - b.rowNumber || a.source.localeCompare(b.source));
}

function getQuestionScore(kriteria, jawabanById, subItemsByParent, sourceKey) {
  if (!kriteria || kriteria.answer_type === "jumlah") return { score: null, ratio: null };

  let ratio = null;
  if (kriteria.answer_type === "persen") {
    const persen = computePersenValue(kriteria, subItemsByParent.get(kriteria.question_id) ?? [], jawabanById, sourceKey);
    ratio = persen === null ? null : Math.max(0, Math.min(100, persen)) / 100;
  } else {
    const value = getSourceAnswerValue(jawabanById.get(kriteria.question_id), sourceKey);
    ratio = getAnswerRatio(kriteria.answer_type, value);
  }

  if (ratio === null) return { score: null, ratio: null };
  return {
    score: r2(ratio * (Number(kriteria.bobot) || 0)),
    ratio: r2(ratio),
  };
}

function initAccum() {
  const obj = {
    pemenuhan: {},
    reform: {},
    hasil: { ipak: 0, capaian_kinerja: 0, prima: 0 },
  };
  for (const key of KOMPONEN_ORDER) {
    obj.pemenuhan[key] = 0;
    obj.reform[key] = 0;
  }
  return obj;
}

function buildAccum(kriteriaList, jawabanById, subItemsByParent, sourceKey) {
  const accum = initAccum();
  for (const kriteria of kriteriaList) {
    if (isDetailKriteria(kriteria)) continue;
    const { score } = getQuestionScore(kriteria, jawabanById, subItemsByParent, sourceKey);
    const value = score ?? 0;

    if (KOMPONEN_ORDER.includes(kriteria.komponen)) {
      const section = getEffectiveSeksi(kriteria);
      if (section === "reform") accum.reform[kriteria.komponen] += value;
      else accum.pemenuhan[kriteria.komponen] += value;
    } else if (HASIL_KEYS.includes(kriteria.komponen)) {
      accum.hasil[kriteria.komponen] += value;
    }
  }

  for (const key of KOMPONEN_ORDER) {
    accum.pemenuhan[key] = r2(accum.pemenuhan[key]);
    accum.reform[key] = r2(accum.reform[key]);
  }
  for (const key of HASIL_KEYS) accum.hasil[key] = r2(accum.hasil[key]);
  return accum;
}

function buildAllSummaries(kriteriaList, jawabanById, subItemsByParent) {
  return Object.fromEntries(
    Object.keys(SOURCE_CONFIG).map((sourceKey) => [
      sourceKey,
      buildAccum(kriteriaList, jawabanById, subItemsByParent, sourceKey),
    ]),
  );
}

function getTotal(summary, kind) {
  if (kind === "pemenuhanTotal") return KOMPONEN_ORDER.reduce((sum, key) => sum + summary.pemenuhan[key], 0);
  if (kind === "reformTotal") return KOMPONEN_ORDER.reduce((sum, key) => sum + summary.reform[key], 0);
  if (kind === "pengungkitTotal") return getTotal(summary, "pemenuhanTotal") + getTotal(summary, "reformTotal");
  if (kind === "birokrasiBersihTotal") return summary.hasil.ipak + summary.hasil.capaian_kinerja;
  if (kind === "primaTotal") return summary.hasil.prima;
  if (kind === "hasilTotal") return summary.hasil.ipak + summary.hasil.capaian_kinerja + summary.hasil.prima;
  if (kind === "finalTotal") return getTotal(summary, "pengungkitTotal") + getTotal(summary, "hasilTotal");
  return 0;
}

function setScorePct(ws, rowNumber, sourceKey, score, maxBobot, writeBlank = false) {
  const config = SOURCE_CONFIG[sourceKey];
  const scoreCell = ws.getCell(`${config.scoreCol}${rowNumber}`);
  const pctCell = ws.getCell(`${config.pctCol}${rowNumber}`);
  if (writeBlank && (score === null || score === undefined)) {
    scoreCell.value = null;
    pctCell.value = null;
    return;
  }
  const safeScore = r2(score ?? 0);
  scoreCell.value = safeScore;
  scoreCell.numFmt = "0.00";
  pctCell.value = maxBobot > 0 ? safeScore / maxBobot : 0;
  pctCell.numFmt = "0.00%";
}

function cloneCellStyle(style = {}) {
  const cloned = { ...style };
  if (style.font) cloned.font = { ...style.font };
  if (style.alignment) cloned.alignment = { ...style.alignment };
  return cloned;
}

function makePlainFont(font = {}) {
  const plain = { ...font };
  delete plain.color;
  delete plain.underline;
  return plain;
}

function setValue(cell, value, options = {}) {
  cell.style = cloneCellStyle(cell.style);
  cell.value = value;
  if (options.numFmt) cell.numFmt = options.numFmt;
  cell.alignment = { ...(cell.alignment ?? {}), vertical: "top", wrapText: true };
}

function setPlainUrl(cell, url) {
  cell.style = cloneCellStyle(cell.style);
  cell.value = url || "";
  cell.font = makePlainFont(cell.font);
  cell.alignment = { ...(cell.alignment ?? {}), vertical: "top", wrapText: true };
}

function readTemplateStructure(ws) {
  const rowById = new Map();
  const typeById = new Map();
  const subRowsByParent = new Map();
  let currentPersenId = null;

  for (let rowNumber = 1; rowNumber <= ws.rowCount; rowNumber++) {
    const id = Number(ws.getCell(`A${rowNumber}`).value);
    if (!Number.isFinite(id)) continue;

    const answerType = String(ws.getCell(`J${rowNumber}`).value ?? "")
      .replace(/\s+/g, " ")
      .trim();

    rowById.set(id, rowNumber);
    typeById.set(id, answerType);

    if (answerType === "%") {
      currentPersenId = id;
      continue;
    }

    if (answerType === "Jumlah" && currentPersenId != null) {
      if (!subRowsByParent.has(currentPersenId)) subRowsByParent.set(currentPersenId, []);
      subRowsByParent.get(currentPersenId).push({ templateId: id, rowNumber });
      continue;
    }

    if (answerType) currentPersenId = null;
  }

  return { rowById, typeById, subRowsByParent };
}

function getTemplateRowNumber(kriteria, template, subItemsByParent) {
  const qid = Number(kriteria.question_id);
  if (!isDetailKriteria(kriteria)) return template.rowById.get(qid);

  const parentId = Number(kriteria.parent_question_id);
  const templateSubRows = template.subRowsByParent.get(parentId) ?? [];
  const siblings = subItemsByParent.get(parentId) ?? [];
  const siblingIndex = siblings.findIndex((item) => Number(item.question_id) === qid);
  if (siblingIndex >= 0 && templateSubRows[siblingIndex]) {
    return templateSubRows[siblingIndex].rowNumber;
  }

  // Fallback hanya boleh ke row template yang memang bertipe Jumlah.
  // Ini mencegah sub-detail legacy ID 2/3 menimpa row header template ID 2/3.
  if (template.typeById.get(qid) === "Jumlah") return template.rowById.get(qid);
  return null;
}

function writeJawabanSheet(ws, kriteriaList, jawabanById, subItemsByParent, allSummaries, template) {
  ws.getCell("W1").value = "Nilai Unit";
  ws.getCell("X1").value = "% Unit";
  ws.getCell("W1").style = { ...ws.getCell("P1").style };
  ws.getCell("X1").style = { ...ws.getCell("Q1").style };
  ws.getColumn("W").hidden = true;
  ws.getColumn("X").hidden = true;

  const rowById = template.rowById;
  const kriteriaById = new Map(kriteriaList.map((item) => [Number(item.question_id), item]));

  for (const kriteria of kriteriaList) {
    const rowNumber = getTemplateRowNumber(kriteria, template, subItemsByParent);
    if (!rowNumber) continue;
    const jawaban = jawabanById.get(kriteria.question_id) ?? {};

    for (const sourceKey of Object.keys(SOURCE_CONFIG)) {
      const config = SOURCE_CONFIG[sourceKey];
      const display = getDisplayAnswer(kriteria, jawabanById, subItemsByParent, sourceKey);
      const answerCell = ws.getCell(`${config.answerCol}${rowNumber}`);
      if (display && typeof display === "object" && "value" in display) {
        setValue(answerCell, display.value, { numFmt: display.numFmt });
      } else {
        setValue(answerCell, display ?? "");
      }

      if (config.noteCol) {
        setValue(ws.getCell(`${config.noteCol}${rowNumber}`), jawaban[config.noteField] ?? "");
      }

      const { score, ratio } = getQuestionScore(kriteria, jawabanById, subItemsByParent, sourceKey);
      if (kriteria.answer_type === "jumlah") {
        setScorePct(ws, rowNumber, sourceKey, null, Number(kriteria.bobot) || 0, true);
      } else {
        const scoreCell = ws.getCell(`${config.scoreCol}${rowNumber}`);
        const pctCell = ws.getCell(`${config.pctCol}${rowNumber}`);
        if (score === null) {
          scoreCell.value = null;
          pctCell.value = null;
        } else {
          scoreCell.value = score;
          scoreCell.numFmt = "0.00";
          pctCell.value = ratio;
          pctCell.numFmt = "0.00%";
        }
      }
    }

    setValue(ws.getCell(`L${rowNumber}`), jawaban.narasi ?? "");
    setValue(ws.getCell(`M${rowNumber}`), jawaban.bukti ?? "");
    setPlainUrl(ws.getCell(`N${rowNumber}`), jawaban.link_drive ?? "");

    if (kriteriaById.has(kriteria.question_id) && !String(ws.getCell(`G${rowNumber}`).value ?? "").trim()) {
      setValue(ws.getCell(`G${rowNumber}`), kriteria.pertanyaan ?? "");
    }
  }

  for (const sourceKey of Object.keys(SOURCE_CONFIG)) {
    const summary = allSummaries[sourceKey];

    for (const item of COMPONENT_STRUCTURAL_ROWS) {
      const rowNumber = rowById.get(item.id);
      if (!rowNumber) continue;
      const value = summary[item.section][item.key] ?? 0;
      setScorePct(ws, rowNumber, sourceKey, value, item.max);
    }

    for (const item of STRUCTURAL_SCORE_ROWS) {
      const rowNumber = rowById.get(item.id);
      if (!rowNumber) continue;
      const value = getTotal(summary, item.kind);
      setScorePct(ws, rowNumber, sourceKey, value, item.max);
    }
  }
}

function getTargetMinimum(target, minimums) {
  return target === "WBBM" ? minimums.WBBM : minimums.WBK;
}

function statusRatio(ratio, target, minimums) {
  const min = getTargetMinimum(target, minimums);
  return ratio >= min ? "Lulus" : "Tidak Lulus";
}

function statusValue(value, target, minimums) {
  const min = getTargetMinimum(target, minimums);
  return value >= min ? "Lulus" : "Tidak Lulus";
}

function writeSummaryNumber(ws, address, value, numFmt = "0.00") {
  const cell = ws.getCell(address);
  cell.value = r2(value);
  cell.numFmt = numFmt;
  return cell.value;
}

function writeSummaryPercent(ws, address, ratio) {
  const cell = ws.getCell(address);
  cell.value = Number.isFinite(ratio) ? ratio : 0;
  cell.numFmt = "0.00%";
}

function writeSummarySheet(ws, sourceKey, summary, submission) {
  ws.getCell("B1").value = submission.eselon2 || "[NAMA UNIT]";
  ws.getCell("B2").value = submission.target || "WBK";

  for (const item of SUMMARY_COMPONENT_ROWS) {
    const pemenuhan = summary.pemenuhan[item.key] ?? 0;
    const reform = summary.reform[item.key] ?? 0;
    const nilai = r2(pemenuhan + reform);
    const ratio = item.bobot > 0 ? nilai / item.bobot : 0;
    writeSummaryNumber(ws, `I${item.row}`, pemenuhan);
    writeSummaryNumber(ws, `J${item.row}`, reform);
    writeSummaryNumber(ws, `K${item.row}`, nilai);
    writeSummaryPercent(ws, `L${item.row}`, ratio);
    ws.getCell(`M${item.row}`).value = statusRatio(
      ratio,
      submission.target,
      EXPORT_MINIMUMS.komponenPengungkitRatio,
    );
  }

  const pengungkit = r2(SUMMARY_COMPONENT_ROWS.reduce(
    (sum, item) => sum + (summary.pemenuhan[item.key] ?? 0) + (summary.reform[item.key] ?? 0),
    0,
  ));
  writeSummaryNumber(ws, "K12", pengungkit);
  writeSummaryPercent(ws, "L12", pengungkit / 60);
  ws.getCell("M12").value = statusValue(pengungkit, submission.target, EXPORT_MINIMUMS.totalPengungkit);

  const ipak = summary.hasil.ipak ?? 0;
  const ck = summary.hasil.capaian_kinerja ?? 0;
  const prima = summary.hasil.prima ?? 0;
  const birokrasi = r2(ipak + ck);
  const hasil = r2(birokrasi + prima);
  const akhir = r2(pengungkit + hasil);

  writeSummaryNumber(ws, "K15", birokrasi);
  writeSummaryPercent(ws, "L15", birokrasi / 22.5);
  ws.getCell("M15").value = statusValue(birokrasi, submission.target, EXPORT_MINIMUMS.birokrasiBersih);

  writeSummaryNumber(ws, "K16", ipak);
  writeSummaryPercent(ws, "L16", ipak / 17.5);
  ws.getCell("M16").value = statusValue(ipak, submission.target, EXPORT_MINIMUMS.ipak);

  writeSummaryNumber(ws, "K17", ck);
  writeSummaryPercent(ws, "L17", ck / 5);
  ws.getCell("M17").value = statusValue(ck, submission.target, EXPORT_MINIMUMS.capaianKinerja);

  writeSummaryNumber(ws, "K18", prima);
  writeSummaryPercent(ws, "L18", prima / 17.5);
  ws.getCell("M18").value = statusValue(prima, submission.target, EXPORT_MINIMUMS.pelayananPrima);

  writeSummaryNumber(ws, "K19", prima);
  writeSummaryPercent(ws, "L19", prima / 17.5);
  ws.getCell("M19").value = statusValue(prima, submission.target, EXPORT_MINIMUMS.pelayananPrima);

  writeSummaryNumber(ws, "K20", hasil);
  writeSummaryPercent(ws, "L20", hasil / 40);

  writeSummaryNumber(ws, "K22", akhir);
  ws.getCell("M22").value = statusValue(akhir, submission.target, EXPORT_MINIMUMS.nilaiTotal);
}

function writeExportInfoSheet(wb, submission, kriteriaList, rowById, missingReviewAnswers) {
  const ws = wb.addWorksheet("Export Info");
  ws.addRow(["Export LKE", submission.eselon2 || ""]);
  ws.addRow(["Target", submission.target || "WBK"]);
  ws.addRow(["Tanggal Export", new Date().toLocaleString("id-ID")]);
  ws.addRow([]);
  ws.addRow(["Catatan", "Mapping berdasarkan ID pada kolom A sheet Jawaban."]);
  ws.addRow(["Data utama aktif", kriteriaList.filter((k) => !isDetailKriteria(k)).length]);
  const missing = kriteriaList
    .filter((k) => !isDetailKriteria(k) && !rowById.has(Number(k.question_id)))
    .map((k) => k.question_id)
    .sort((a, b) => a - b);
  ws.addRow(["ID master tidak ada di template", missing.length ? missing.join(", ") : "-"]);
  ws.addRow([]);
  ws.addRow(["Nilai review kosong", missingReviewAnswers.length ? `${missingReviewAnswers.length} sel` : "-"]);
  ws.addRow([
    "Catatan review",
    "Export tetap dilanjutkan. Nilai TPI Unit dan TPI Itjen tidak memakai fallback ke sumber lain.",
  ]);

  if (missingReviewAnswers.length) {
    ws.addRow([]);
    const header = ws.addRow(["Sumber", "ID Kriteria", "Row Jawaban", "Kolom", "Pertanyaan"]);
    header.eachCell((cell) => {
      cell.font = { bold: true };
    });
    for (const item of missingReviewAnswers) {
      ws.addRow([item.source, item.questionId, item.rowNumber, item.column, item.pertanyaan]);
    }
  }

  ws.columns = [{ width: 28 }, { width: 34 }, { width: 14 }, { width: 10 }, { width: 90 }];
  ws.eachRow((row) => {
    row.getCell(1).font = { bold: true };
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: "top" };
    });
  });
}

async function buildWorkbook(submissionId) {
  await connect();
  const [submission, kriteriaList, jawabanList] = await Promise.all([
    LkeSubmission.findById(submissionId).lean(),
    LkeKriteria.find({ aktif: true }).sort({ question_id: 1 }).lean(),
    LkeJawaban.find({ submission_id: submissionId }).lean(),
  ]);
  if (!submission) throw new Error("Submission tidak ditemukan.");

  const jawabanById = new Map(jawabanList.map((item) => [Number(item.question_id), item]));
  const subItemsByParent = new Map();
  for (const kriteria of kriteriaList) {
    if (isDetailKriteria(kriteria)) {
      const parentId = Number(kriteria.parent_question_id);
      if (!subItemsByParent.has(parentId)) subItemsByParent.set(parentId, []);
      subItemsByParent.get(parentId).push(kriteria);
    }
  }
  for (const subItems of subItemsByParent.values()) {
    subItems.sort((a, b) => Number(a.urutan) - Number(b.urutan));
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  workbook.creator = "ZI LKE Checker";
  workbook.lastModifiedBy = "ZI LKE Checker";
  workbook.created = new Date();
  workbook.modified = new Date();

  const jawabanSheet = workbook.getWorksheet("Jawaban");
  if (!jawabanSheet) throw new Error('Sheet "Jawaban" tidak ditemukan di template.');
  const template = readTemplateStructure(jawabanSheet);
  const allSummaries = buildAllSummaries(kriteriaList, jawabanById, subItemsByParent);

  writeJawabanSheet(jawabanSheet, kriteriaList, jawabanById, subItemsByParent, allSummaries, template);

  for (const sourceKey of Object.keys(SOURCE_CONFIG)) {
    const sheet = workbook.getWorksheet(SOURCE_CONFIG[sourceKey].sheet);
    if (sheet) writeSummarySheet(sheet, sourceKey, allSummaries[sourceKey], submission);
  }

  const missingReviewAnswers = findMissingReviewAnswers(kriteriaList, jawabanById, subItemsByParent, template);
  writeExportInfoSheet(workbook, submission, kriteriaList, template.rowById, missingReviewAnswers);
  return { workbook, submission, missingReviewAnswers };
}

export async function GET(req, context) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const { workbook, submission, missingReviewAnswers } = await buildWorkbook(id);
    if (searchParams.get("check") === "1") {
      return Response.json({
        count: missingReviewAnswers.length,
        missingReviewAnswers,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `export_lke_${safeFileName(submission.eselon2)}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error) {
    return new Response(error?.message || "Gagal export LKE.", { status: 500 });
  }
}
