import { ID_DETAIL_MAP } from "./constants.js";

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

export function calculateNilaiLkeAi(results, target) {
  const r2 = (v) => Math.round(v * 100) / 100;
  const accum = {
    mp: 0, tt: 0, sdm: 0, ak: 0, pw: 0, pp: 0,
    ipak: 0, capaian_kinerja: 0, prima: 0,
  };

  for (const r of results) {
    const detail = ID_DETAIL_MAP[parseInt(r.id)];
    if (!detail) continue;
    const w = getAnswerWeight(r.verdict?.color, detail.answer_type);
    accum[detail.komponen] += w * detail.bobot;
  }

  const toK = (key) => ({ nilai: r2(accum[key]), persen: null });

  const mp = toK("mp");
  const tt = toK("tt");
  const sdm = toK("sdm");
  const ak = toK("ak");
  const pw = toK("pw");
  const pp = toK("pp");
  const ipak = toK("ipak");
  const ck = toK("capaian_kinerja");
  const prima = toK("prima");

  const totalPeng = {
    nilai: r2(mp.nilai + tt.nilai + sdm.nilai + ak.nilai + pw.nilai + pp.nilai),
    persen: null,
  };
  const bbTotal = { nilai: r2(ipak.nilai + ck.nilai), persen: null };
  const ppTotal = { nilai: r2(prima.nilai), persen: null };
  const totalHasil = { nilai: r2(bbTotal.nilai + ppTotal.nilai), persen: null };
  const nilaiAkhir = r2(totalPeng.nilai + totalHasil.nilai);
  const threshold = target === "WBBM" ? 75 : 60;

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
