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

// Max bobot per komponen (sum of all bobot in that komponen)
const MAX_BOBOT = {
  mp: 8.00, tt: 7.00, sdm: 10.00, ak: 10.00, pw: 15.00, pp: 10.00,
  ipak: 17.50, capaian_kinerja: 5.00, prima: 17.50,
};
const MAX_PENGUNGKIT = 60;
const MAX_HASIL = 40;
const MAX_TOTAL = 100;

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

  const toK = (key) => ({
    nilai: r2(accum[key]),
    persen: r2((accum[key] / MAX_BOBOT[key]) * 100),
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
  const bbTotal = { nilai: bbNilai, persen: r2((bbNilai / (MAX_BOBOT.ipak + MAX_BOBOT.capaian_kinerja)) * 100) };
  const ppNilai = r2(prima.nilai);
  const ppTotal = { nilai: ppNilai, persen: r2((ppNilai / MAX_BOBOT.prima) * 100) };
  const totalHasilNilai = r2(bbTotal.nilai + ppTotal.nilai);
  const totalHasil = { nilai: totalHasilNilai, persen: r2((totalHasilNilai / MAX_HASIL) * 100) };
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
