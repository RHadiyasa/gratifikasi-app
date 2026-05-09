import { ID_DETAIL_MAP } from "./constants.js";

export function isDetailKriteria(kriteria) {
  return (
    kriteria?.answer_type === "jumlah" &&
    kriteria?.parent_question_id != null
  );
}

export function buildScoringDetailMap(kriteriaList = []) {
  return buildScoringDetailMapWithConfig(kriteriaList, null);
}

function toSubKey(k) {
  const sub = (k.sub_komponen || "").trim();
  if (!sub) return `${k.komponen}||${k.seksi || "pemenuhan"}||qid:${Number(k.question_id)}`;
  return `${k.komponen}||${k.seksi || "pemenuhan"}||${sub}`;
}

function round4(v) {
  return Math.round(v * 10000) / 10000;
}

function splitWeightPrecisely(total, n) {
  if (!n || n <= 0) return [];
  const scale = 10000;
  const totalInt = Math.round((Number(total) || 0) * scale);
  const base = Math.floor(totalInt / n);
  let rem = totalInt - base * n;
  const out = Array.from({ length: n }, () => base);
  let i = out.length - 1;
  while (rem > 0 && i >= 0) {
    out[i] += 1;
    rem -= 1;
    i -= 1;
  }
  return out.map((v) => v / scale);
}

function toPercentPolicyMap(config = null) {
  const map = new Map();
  for (const p of config?.percent_policies || []) {
    map.set(Number(p.question_id), {
      type: p.type || "direct_percent",
      numerator_key: p.numerator_key || "",
      denominator_key: p.denominator_key || "",
      previous_key: p.previous_key || "",
      current_key: p.current_key || "",
      cap_at_100: p.cap_at_100 !== false,
      zero_division: p.zero_division || "full_score",
    });
  }
  return map;
}

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeZeroDivision(policy, ratio) {
  if (ratio !== null) return ratio;
  if (policy.zero_division === "zero") return 0;
  if (policy.zero_division === "ignore") return null;
  return 1;
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
      out.push(values[Number(token.ref)] ?? 0);
    } else if (token.kind === "op") {
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        prec[ops[ops.length - 1]] >= prec[token.op]
      ) {
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

function getDecreaseFormulaRefs(tokens = []) {
  if (
    tokens.length === 7 &&
    tokens[0]?.kind === "open_paren" &&
    tokens[1]?.kind === "operand" &&
    tokens[2]?.kind === "op" &&
    tokens[2]?.op === "-" &&
    tokens[3]?.kind === "operand" &&
    tokens[4]?.kind === "close_paren" &&
    tokens[5]?.kind === "op" &&
    tokens[5]?.op === "/" &&
    tokens[6]?.kind === "operand" &&
    Number(tokens[1]?.ref) === Number(tokens[6]?.ref)
  ) {
    return {
      previousRef: Number(tokens[1]?.ref),
      currentRef: Number(tokens[3]?.ref),
    };
  }

  return null;
}

function clampPercent(value, min = 0, max = 100) {
  return Math.min(Number(max), Math.max(Number(min), value));
}

function hasMetricValue(metrics, item) {
  if (!item) return false;
  const qidKey = `qid_${Number(item.question_id)}`;
  if (Object.prototype.hasOwnProperty.call(metrics, qidKey)) return true;
  const key = String(item.sub_komponen || "").trim();
  return Boolean(key && Object.prototype.hasOwnProperty.call(metrics, key));
}

function metricValue(metrics, item) {
  if (!item) return 0;
  const qidValue = safeNum(metrics[`qid_${Number(item.question_id)}`]);
  if (qidValue !== null) return qidValue;
  const key = String(item.sub_komponen || "").trim();
  if (!key) return 0;
  return safeNum(metrics[key]) ?? 0;
}

function computeFormulaItemValues(items, metrics) {
  const byUrutan = {};
  for (const item of items) byUrutan[Number(item.urutan)] = item;

  const visited = new Set();
  const sorted = [];
  function visit(urutan) {
    if (visited.has(urutan)) return;
    visited.add(urutan);
    const item = byUrutan[urutan];
    if (item?.is_computed && item.formula_tokens?.length) {
      for (const token of item.formula_tokens) {
        if (token.kind === "operand") visit(Number(token.ref));
      }
    }
    if (item) sorted.push(item);
  }

  for (const item of items) visit(Number(item.urutan));

  const values = {};
  for (const item of sorted) {
    const urutan = Number(item.urutan);
    if (item.is_computed && item.formula_tokens?.length) {
      values[urutan] = evalTokens(item.formula_tokens, values);
    } else {
      values[urutan] = metricValue(metrics, item);
    }
  }
  return values;
}

function getFormulaRatio(result, detail) {
  const metrics = result?.metrics || {};
  const items = detail?.formula_items || [];
  const tokens = detail?.formula_tokens || [];
  if (!tokens.length || !items.length) return null;
  if (!items.some((item) => hasMetricValue(metrics, item))) return null;

  const min = Number(detail.formula_min ?? 0);
  const max = Number(detail.formula_max ?? 100);
  const values = computeFormulaItemValues(items, metrics);
  const formula = evalTokensDetailed(tokens, values);
  if (formula.hasDivisionByZero && detail.formula_zero_division_full_score) {
    const decreaseRefs = getDecreaseFormulaRefs(tokens);
    if (decreaseRefs) {
      const current = Number(values[decreaseRefs.currentRef] ?? 0);
      return current === 0 ? clampPercent(max, min, max) / 100 : clampPercent(0, min, max) / 100;
    }
    return clampPercent(max, min, max) / 100;
  }

  const percent = formula.value * 100;
  if (!Number.isFinite(percent)) return null;
  return clampPercent(percent, min, max) / 100;
}

function getPolicyRatio(result, policy) {
  const metrics = result?.metrics || {};
  const cap = (v) => {
    const raw = Math.max(0, v);
    return policy.cap_at_100 ? Math.min(1, raw) : raw;
  };

  if (policy.type === "ratio") {
    const num = safeNum(metrics[policy.numerator_key]);
    const den = safeNum(metrics[policy.denominator_key]);
    if (num === null || den === null) return normalizeZeroDivision(policy, null);
    if (den <= 0) return normalizeZeroDivision(policy, null);
    return cap(num / den);
  }

  if (policy.type === "decrease_ratio") {
    const prev = safeNum(metrics[policy.previous_key]);
    const cur = safeNum(metrics[policy.current_key]);
    if (prev === null || cur === null) return normalizeZeroDivision(policy, null);
    if (prev <= 0) {
      if (cur <= 0) return normalizeZeroDivision(policy, null);
      return 0;
    }
    return cap((prev - cur) / prev);
  }

  return null;
}

export function buildScoringDetailMapWithConfig(kriteriaList = [], config = null) {
  const primary = kriteriaList.filter((k) => k?.aktif !== false && !isDetailKriteria(k));
  const policyMap = toPercentPolicyMap(config);
  const childrenByParent = new Map();

  for (const k of kriteriaList) {
    if (k?.aktif === false || !isDetailKriteria(k)) continue;
    const parentId = Number(k.parent_question_id);
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(k);
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0));
  }

  const subTotals = new Map();
  for (const item of config?.subcomponent_weights || []) {
    if (item?.aktif === false) continue;
    const key = `${item.komponen}||${item.seksi || "pemenuhan"}||${item.sub_komponen || ""}`;
    subTotals.set(key, Number(item.bobot_total) || 0);
  }

  const grouped = new Map();
  for (const k of primary) {
    const key = toSubKey(k);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(k);
  }

  const entries = [];
  for (const [subKey, items] of grouped.entries()) {
    const configuredTotal = subTotals.has(subKey) ? subTotals.get(subKey) : null;
    const total = configuredTotal ?? items.reduce((sum, x) => sum + (Number(x.bobot) || 0), 0);
    const shares = splitWeightPrecisely(total, items.length);
    items
      .slice()
      .sort((a, b) => Number(a.question_id) - Number(b.question_id))
      .forEach((k, idx) => {
        const qid = Number(k.question_id);
        const formulaItems = (childrenByParent.get(qid) || []).map((child) => ({
          question_id: Number(child.question_id),
          sub_komponen: child.sub_komponen || "",
          urutan: Number(child.urutan || 0),
          is_computed: Boolean(child.is_computed),
          formula_tokens: child.formula_tokens || null,
        }));
        entries.push([
          qid,
          {
            komponen: k.komponen,
            bobot: round4(shares[idx] ?? 0),
            answer_type: k.answer_type,
            formula_tokens: k.formula_tokens || null,
            formula_items: formulaItems,
            formula_min: k.formula_min ?? 0,
            formula_max: k.formula_max ?? 100,
            formula_zero_division_full_score: Boolean(k.formula_zero_division_full_score),
            persen_policy: policyMap.get(qid) || null,
          },
        ]);
      });
  }

  return Object.fromEntries(entries);
}

export function getAnswerWeight(verdictColor, answerType) {
  if (verdictColor === "HIJAU") return 1.0;
  if (verdictColor === "MERAH") return 0.0;
  // KUNING = opsi B (partial)
  switch (answerType) {
    case "ya_tidak": return 0.5;
    case "abc":      return 0.5;
    case "abcd":     return 0.67;
    case "abcde":    return 0.75;
    case "persen":   return 0.5;
    case "nilai_04": return 0.5;
    default:         return 0.5;
  }
}

export function parsePercentageRatio(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw
    .replace("%", "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!normalized) return null;

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return null;

  const percent = Math.max(0, Math.min(100, numeric));
  return percent / 100;
}

export function parseNilai04Ratio(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!normalized) return null;

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return null;

  const nilai = Math.max(0, Math.min(4, numeric));
  return nilai / 4;
}

export function getScoringWeight(result, detail) {
  if (detail?.answer_type === "persen") {
    // Persen is a quantitative answer: 40% with bobot 1 must score 0.4.
    // A MERAH verdict still zeros the score because the evidence/link is invalid.
    if (result?.verdict?.color === "MERAH") return 0;

    const formulaRatio = getFormulaRatio(result, detail);
    if (formulaRatio !== null) return formulaRatio;

    const policyRatio = detail?.persen_policy
      ? getPolicyRatio(result, detail.persen_policy)
      : null;
    if (policyRatio !== null) return policyRatio;

    const ratio = parsePercentageRatio(
      result?.percentage ??
      result?.persen ??
      result?.jawaban_unit ??
      result?.jawabanUnit ??
      result?.value,
    );
    if (ratio !== null) return ratio;
  }

  if (detail?.answer_type === "nilai_04") {
    const ratio = parseNilai04Ratio(
      result?.nilai ??
      result?.nilai_04 ??
      result?.jawaban_unit ??
      result?.jawabanUnit ??
      result?.value,
    );
    if (ratio !== null) return ratio;
  }

  return getAnswerWeight(result?.verdict?.color, detail?.answer_type);
}

function buildDynamicMaxBobot(detailMap = ID_DETAIL_MAP) {
  const max = {
    mp: 0, tt: 0, sdm: 0, ak: 0, pw: 0, pp: 0,
    ipak: 0, capaian_kinerja: 0, prima: 0,
  };
  for (const detail of Object.values(detailMap || {})) {
    if (!detail?.komponen) continue;
    if (!(detail.komponen in max)) continue;
    max[detail.komponen] += Number(detail.bobot) || 0;
  }
  Object.keys(max).forEach((k) => {
    max[k] = round4(max[k]);
  });
  return max;
}

export function calculateNilaiLkeAi(results, target, detailMap = ID_DETAIL_MAP) {
  const r2 = (v) => Math.round(v * 100) / 100;
  const maxBobot = buildDynamicMaxBobot(detailMap);
  const MAX_PENGUNGKIT = round4(
    maxBobot.mp + maxBobot.tt + maxBobot.sdm + maxBobot.ak + maxBobot.pw + maxBobot.pp,
  );
  const MAX_HASIL = round4(maxBobot.ipak + maxBobot.capaian_kinerja + maxBobot.prima);
  const accum = {
    mp: 0, tt: 0, sdm: 0, ak: 0, pw: 0, pp: 0,
    ipak: 0, capaian_kinerja: 0, prima: 0,
  };

  for (const r of results) {
    const detail = detailMap[parseInt(r.id)];
    if (!detail) continue;
    const w = getScoringWeight(r, detail);
    accum[detail.komponen] += w * detail.bobot;
  }

  const toK = (key) => ({
    nilai: r2(accum[key]),
    persen: maxBobot[key] > 0 ? r2((accum[key] / maxBobot[key]) * 100) : 0,
  });

  const mp = toK("mp");
  const tt = toK("tt");
  const sdm = toK("sdm");
  const ak = toK("ak");
  const pw = toK("pw");
  const pp = toK("pp");
  const ipak = toK("ipak");
  const ck = toK("capaian_kinerja");
  const prima = toK("prima");

  const totalPengNilai = r2(mp.nilai + tt.nilai + sdm.nilai + ak.nilai + pw.nilai + pp.nilai);
  const totalPeng = {
    nilai: totalPengNilai,
    persen: r2((totalPengNilai / MAX_PENGUNGKIT) * 100),
  };
  const bbNilai = r2(ipak.nilai + ck.nilai);
  const bbDen = maxBobot.ipak + maxBobot.capaian_kinerja;
  const bbTotal = { nilai: bbNilai, persen: bbDen > 0 ? r2((bbNilai / bbDen) * 100) : 0 };
  const ppNilai = r2(prima.nilai);
  const ppTotal = { nilai: ppNilai, persen: maxBobot.prima > 0 ? r2((ppNilai / maxBobot.prima) * 100) : 0 };
  const totalHasilNilai = r2(bbTotal.nilai + ppTotal.nilai);
  const totalHasil = { nilai: totalHasilNilai, persen: r2((totalHasilNilai / MAX_HASIL) * 100) };
  const nilaiAkhir = r2(totalPeng.nilai + totalHasil.nilai);
  const threshold = target === "WBBM" ? 85 : 75;

  return {
    pengungkit: {
      manajemen_perubahan: mp,
      penataan_tatalaksana: tt,
      penataan_sdm: sdm,
      penguatan_akuntabilitas: ak,
      penguatan_pengawasan: pw,
      peningkatan_pelayanan: pp,
      total: totalPeng,
    },
    hasil: {
      birokrasi_bersih: { ipak, capaian_kinerja: ck, total: bbTotal },
      pelayanan_prima: { ipkp: prima, total: ppTotal },
      total: totalHasil,
    },
    nilai_akhir: nilaiAkhir,
    target_tercapai: nilaiAkhir >= threshold,
  };
}
