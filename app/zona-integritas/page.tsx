import type { LkeSubmission as ILke } from "@/types/zi";

import {
  Award,
  CheckCircle2,
  BarChart3,
  Search,
  FileSpreadsheet,
  ArrowRight,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  ShieldCheck,
  Star,
  BookOpen,
  ClipboardCheck,
  ListChecks,
} from "lucide-react";
import { Button } from "@heroui/button";
import NextLink from "next/link";

import { VisaCredit } from "@/components/visa-brand";
import { StatCard } from "@/components/StatCard";
import { TargetBadge } from "@/components/TargetBadge";
import { connect } from "@/config/dbconfig";
import LkeSubmission from "@/modules/models/LkeSubmission";
import { TARGET_THRESHOLD } from "@/types/zi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STEPS = [
  {
    icon: BookOpen,
    title: "Pahami Target",
    desc: "Tentukan target WBK atau WBBM, lalu baca ambang minimal nilai total, pengungkit, dan hasil yang harus dipenuhi.",
  },
  {
    icon: FileSpreadsheet,
    title: "Input LKE",
    desc: "Masukkan LKE melalui link Google Sheet atau isi manual langsung di aplikasi. Keduanya dipakai untuk monitoring yang sama.",
  },
  {
    icon: Search,
    title: "Cek Bukti Dukung",
    desc: "Gunakan checker untuk membaca narasi, bukti, dan tautan dokumen agar kekurangan terlihat sejak penilaian mandiri.",
  },
  {
    icon: BarChart3,
    title: "Pantau Kesenjangan",
    desc: "Bandingkan nilai unit dengan batas minimal WBK/WBBM, lalu prioritaskan area yang masih berada di bawah standar.",
  },
];

const KOMPONEN_PENGUNGKIT = [
  { kode: "MP", label: "Manajemen Perubahan", maks: 8.0 },
  { kode: "TT", label: "Penataan Tatalaksana", maks: 7.0 },
  { kode: "SDM", label: "Penataan SDM", maks: 10.0 },
  { kode: "AK", label: "Penguatan Akuntabilitas", maks: 10.0 },
  { kode: "PW", label: "Penguatan Pengawasan", maks: 15.0 },
  { kode: "PP", label: "Peningkatan Pelayanan", maks: 10.0 },
];

const EDUCATION_CARDS = [
  {
    icon: ClipboardCheck,
    title: "Fokus Pengajuan",
    desc: "Halaman ini merangkum syarat nilai, komponen LKE, dan langkah praktis sebelum unit diajukan ke proses evaluasi.",
  },
  {
    icon: FileSpreadsheet,
    title: "Input Fleksibel",
    desc: "Unit dapat memakai link Google Sheet atau input manual di aplikasi. Proses LKE tidak bergantung pada penjelasan struktur kolom di halaman ini.",
  },
  {
    icon: ShieldCheck,
    title: "Ambang Minimal",
    desc: "WBK membutuhkan nilai total minimal 75, sedangkan WBBM minimal 85, disertai ambang sub-komponen yang harus ikut terpenuhi.",
  },
];

const MINIMUM_REQUIREMENTS = [
  { syarat: "Nilai total", wbk: ">= 75", wbbm: ">= 85" },
  { syarat: "Nilai minimal pengungkit", wbk: "40", wbbm: "48" },
  {
    syarat: "Bobot minimal per area pengungkit",
    wbk: "60%",
    wbbm: "75%",
  },
  {
    syarat: "Hasil: Pemerintah yang Bersih dan Akuntabel",
    wbk: "18,25",
    wbbm: "19,50",
  },
  {
    syarat: "Sub-komponen IPAK",
    wbk: "15,75 / survei 3,60",
    wbbm: "15,75 / survei 3,60",
  },
  {
    syarat: "Sub-komponen Kinerja Lebih Baik",
    wbk: "2,50",
    wbbm: "3,75",
  },
  {
    syarat: "Hasil: Pelayanan Publik yang Prima",
    wbk: "14,00 / survei 3,20",
    wbbm: "15,75 / survei 3,60",
  },
  {
    syarat: "Predikat sebelumnya",
    wbk: "-",
    wbbm: "Telah mendapat predikat Menuju WBK",
  },
];

const READINESS_CHECKS = [
  "Pastikan enam area pengungkit memiliki bukti nyata, bukan hanya narasi kegiatan.",
  "Gunakan ambang minimal sebagai pintu awal; target internal sebaiknya dibuat lebih tinggi.",
  "Perkuat survei IPAK dan pelayanan publik sejak awal karena komponen hasil dapat menggugurkan pengajuan.",
  "Pastikan dokumen bukti mudah dibuka, relevan, dan diberi konteks di narasi LKE.",
  "Sinkronkan LKE dari link atau input manual sebelum finalisasi pembahasan TPI.",
];

async function getDashboardData() {
  try {
    await connect();
    const docs = (await LkeSubmission.find(
      {},
      {
        status: 1,
        target: 1,
        nilai_lke_ai: 1,
        eselon2: 1,
        eselon1: 1,
        _id: 1,
        source: 1,
      },
    ).lean()) as unknown as ILke[];

    const withNilai = docs.filter((d) => d.nilai_lke_ai?.nilai_akhir != null);
    const wbkTercapai = withNilai.filter(
      (d) =>
        d.target === "WBK" &&
        d.nilai_lke_ai!.nilai_akhir! >= TARGET_THRESHOLD.WBK,
    ).length;
    const wbbmTercapai = withNilai.filter(
      (d) =>
        d.target === "WBBM" &&
        d.nilai_lke_ai!.nilai_akhir! >= TARGET_THRESHOLD.WBBM,
    ).length;
    const rata =
      withNilai.length > 0
        ? withNilai.reduce((sum, d) => sum + d.nilai_lke_ai!.nilai_akhir!, 0) /
          withNilai.length
        : null;
    const topPerformers = [...withNilai]
      .sort(
        (a, b) => b.nilai_lke_ai!.nilai_akhir! - a.nilai_lke_ai!.nilai_akhir!,
      )
      .slice(0, 5);

    return {
      total: docs.length,
      selesai: docs.filter((d) => d.status === "Selesai").length,
      sedang: docs.filter((d) => d.status === "Sedang Dicek").length,
      perluRevisi: docs.filter((d) => d.status === "Perlu Revisi").length,
      belum: docs.filter((d) => d.status === "Belum Dicek").length,
      wbkTercapai,
      wbbmTercapai,
      rata,
      withNilaiCount: withNilai.length,
      topPerformers,
    };
  } catch {
    return null;
  }
}

export default async function ZonaIntegritasPage() {
  const data = await getDashboardData();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-14">
      {/* Hero */}
      <div className="text-center space-y-4">
        <VisaCredit className="mx-auto" size="md" />
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 mb-2">
          <Award className="text-violet-600 dark:text-violet-400" size={32} />
        </div>
        <h1 className="text-3xl font-bold">Zona Integritas</h1>
        <p className="text-default-500 max-w-xl mx-auto text-sm leading-relaxed">
          Halaman edukasi untuk membantu unit kerja memahami syarat minimal,
          komponen LKE, dan langkah persiapan menuju <strong>WBK</strong> atau{" "}
          <strong>WBBM</strong>. Input LKE tetap bisa dilakukan melalui link
          Google Sheet atau pengisian manual di aplikasi.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            as={NextLink}
            color="primary"
            endContent={<ArrowRight size={16} />}
            href="/zona-integritas/lke-checker"
          >
            Buka LKE Checker
          </Button>
          <Button
            as={NextLink}
            endContent={<BarChart3 size={15} />}
            href="/zona-integritas/monitoring"
            variant="flat"
          >
            Lihat Monitoring
          </Button>
        </div>
      </div>

      {/* Live Stats */}
      {data && data.total > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-default-400 text-center">
            Statistik Terkini
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              color="default"
              icon={<Users size={18} />}
              label="Total Unit"
              size="sm"
              value={data.total}
            />
            <StatCard
              color="green"
              icon={<CheckCircle2 size={18} />}
              label="Selesai"
              size="sm"
              value={data.selesai}
            />
            <StatCard
              color="amber"
              icon={<Clock size={18} />}
              label="Sedang Dicek"
              size="sm"
              value={data.sedang}
            />
            <StatCard
              color="red"
              icon={<AlertCircle size={18} />}
              label="Perlu Revisi"
              size="sm"
              value={data.perluRevisi}
            />
            <StatCard
              color="blue"
              icon={<Award size={18} />}
              label="WBK Tercapai"
              size="sm"
              value={data.wbkTercapai}
            />
            <StatCard
              color="violet"
              icon={<Star size={18} />}
              label="WBBM Tercapai"
              size="sm"
              value={data.wbbmTercapai}
            />
          </div>
          {data.rata !== null && (
            <div className="rounded-xl border border-default-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-default-500 font-medium">
                  Rata-rata Nilai Akhir LKE
                </p>
                <p className="text-3xl font-bold tabular-nums mt-0.5">
                  {data.rata.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-default-400">
                  dari {data.withNilaiCount ?? data.selesai} unit dinilai
                </p>
                <TrendingUp
                  className="text-default-200 mt-1 ml-auto"
                  size={28}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Education Overview */}
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <BookOpen className="text-blue-500 mt-0.5 shrink-0" size={18} />
          <div>
            <h2 className="text-base font-semibold">
              Untuk Unit Yang Akan Mengajukan WBK/WBBM
            </h2>
            <p className="text-xs text-default-500 mt-0.5">
              Gunakan halaman ini sebagai briefing awal sebelum mengisi LKE,
              melengkapi bukti dukung, dan menyampaikan kesiapan unit.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EDUCATION_CARDS.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-xl border border-default-200 p-4 space-y-2"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon
                    className="text-blue-600 dark:text-blue-400"
                    size={17}
                  />
                </div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-default-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Minimum Requirements */}
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <ClipboardCheck
            className="text-green-500 mt-0.5 shrink-0"
            size={18}
          />
          <div>
            <h2 className="text-base font-semibold">
              Nilai Minimal Sesuai Ketentuan
            </h2>
            <p className="text-xs text-default-500 mt-0.5">
              Ambang ini menjadi filter awal kesiapan unit. Nilai total saja
              tidak cukup jika sub-komponen kunci masih di bawah batas.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-default-200">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-default-100">
              <tr>
                <th className="text-left py-2.5 px-4 font-semibold text-default-600">
                  Syarat
                </th>
                <th className="text-left py-2.5 px-4 font-semibold text-blue-600 dark:text-blue-400 w-56">
                  Menuju WBK
                </th>
                <th className="text-left py-2.5 px-4 font-semibold text-violet-600 dark:text-violet-400 w-64">
                  Menuju WBBM
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default-100">
              {MINIMUM_REQUIREMENTS.map((item) => (
                <tr key={item.syarat} className="hover:bg-default-50">
                  <td className="py-3 px-4 font-medium text-default-700">
                    {item.syarat}
                  </td>
                  <td className="py-3 px-4 text-default-600">{item.wbk}</td>
                  <td className="py-3 px-4 text-default-600">{item.wbbm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-500/5 p-4">
          <p className="text-xs text-default-600 leading-relaxed">
            Rujukan: Permen PANRB Nomor 90 Tahun 2021 sebagaimana diubah dengan
            Permen PANRB Nomor 5 Tahun 2024. Gunakan angka ini sebagai batas
            minimum; untuk pengajuan yang lebih aman, unit sebaiknya menargetkan
            nilai di atas ambang tersebut.
          </p>
          <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium">
            <a
              className="text-blue-600 hover:underline dark:text-blue-400"
              href="https://jdih.menpan.go.id/dokumen-hukum/peraturan-menteri-pendayagunaan-aparatur-negara-dan-reformasi-birokrasi-nomor-90-tahun-2021-tentang-1488"
              rel="noreferrer"
              target="_blank"
            >
              Permen PANRB 90/2021
            </a>
            <a
              className="text-blue-600 hover:underline dark:text-blue-400"
              href="https://jdih.menpan.go.id/dokumen-hukum/peraturan-menteri-pendayagunaan-aparatur-negara-dan-reformasi-birokrasi-nomor-5-tahun-2024-tentang-p-1853"
              rel="noreferrer"
              target="_blank"
            >
              Permen PANRB 5/2024
            </a>
          </div>
        </div>
      </div>

      {/* Alur Kerja */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-center">
          Cara Unit Menyiapkan Pengajuan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;

            return (
              <div
                key={i}
                className="rounded-xl border border-default-200 p-4 space-y-2 relative"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-default-400 w-5">
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Icon
                      className="text-violet-600 dark:text-violet-400"
                      size={16}
                    />
                  </div>
                </div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-default-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Komponen LKE */}
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="text-violet-500 mt-0.5 shrink-0" size={18} />
          <div>
            <h2 className="text-base font-semibold">Komponen Penilaian LKE</h2>
            <p className="text-xs text-default-500 mt-0.5">
              Nilai akhir terdiri dari Pengungkit (60 poin) dan Hasil (40 poin),
              total maksimal 100 poin.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pengungkit */}
          <div className="rounded-xl border border-default-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-violet-500/5 border-b border-default-100">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                Pengungkit
              </p>
              <p className="text-xs font-bold text-violet-600 dark:text-violet-400">
                Maks 60 poin
              </p>
            </div>
            <div className="divide-y divide-default-100">
              {KOMPONEN_PENGUNGKIT.map((k) => (
                <div
                  key={k.kode}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-5 flex items-center justify-center rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold shrink-0">
                      {k.kode}
                    </span>
                    <span className="text-sm">{k.label}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-default-600">
                    {k.maks.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5 bg-default-50">
                <span className="text-sm font-bold text-default-700">
                  Total Pengungkit
                </span>
                <span className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-400">
                  60.00
                </span>
              </div>
            </div>
          </div>

          {/* Hasil */}
          <div className="rounded-xl border border-default-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-blue-500/5 border-b border-default-100">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Hasil
              </p>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Maks 40 poin
              </p>
            </div>
            <div className="divide-y divide-default-100">
              {/* Birokrasi Bersih */}
              <div className="px-4 pt-2.5 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-default-400 mb-1.5">
                  Birokrasi Bersih - maks 22.50
                </p>
                <div className="space-y-1 pl-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-default-600">IPAK</span>
                    <span className="text-sm font-semibold tabular-nums text-default-600">
                      17.50
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-default-600">
                      Capaian Kinerja
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-default-600">
                      5.00
                    </span>
                  </div>
                </div>
              </div>
              {/* Pelayanan Prima */}
              <div className="px-4 pt-2.5 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-default-400 mb-1.5">
                  Pelayanan Prima - maks 17.50
                </p>
                <div className="space-y-1 pl-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-default-600">IPKP</span>
                    <span className="text-sm font-semibold tabular-nums text-default-600">
                      17.50
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-default-50">
                <span className="text-sm font-bold text-default-700">
                  Total Hasil
                </span>
                <span className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  40.00
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {data && data.topPerformers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <TrendingUp
                className="text-green-500 mt-0.5 shrink-0"
                size={18}
              />
              <div>
                <h2 className="text-base font-semibold">Nilai LKE Tertinggi</h2>
                <p className="text-xs text-default-500 mt-0.5">
                  Unit kerja dengan nilai akhir LKE terbaik saat ini.
                </p>
              </div>
            </div>
            <Button
              as={NextLink}
              endContent={<ArrowRight size={13} />}
              href="/zona-integritas/monitoring"
              size="sm"
              variant="light"
            >
              Semua Unit
            </Button>
          </div>
          <div className="rounded-xl border border-default-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-default-50">
                <tr>
                  <th className="text-center py-2 px-3 font-medium text-default-500 text-xs w-10">
                    #
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-default-500 text-xs">
                    Unit Kerja
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-default-500 text-xs w-24">
                    Target
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-default-500 text-xs w-24">
                    Nilai
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {data.topPerformers.map((unit, i) => {
                  const val = unit.nilai_lke_ai!.nilai_akhir!;
                  const threshold = TARGET_THRESHOLD[unit.target];
                  const achieved = val >= threshold;

                  return (
                    <tr
                      key={String(unit._id)}
                      className="hover:bg-default-50 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-[11px] font-bold ${
                            i === 0
                              ? "bg-amber-400/20 text-amber-600 dark:text-amber-400"
                              : i === 1
                                ? "bg-default-200 text-default-600"
                                : i === 2
                                  ? "bg-orange-400/15 text-orange-600 dark:text-orange-400"
                                  : "text-default-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-sm truncate max-w-[220px]">
                          {unit.eselon2}
                        </p>
                        <p className="text-xs text-default-400 truncate">
                          {unit.eselon1}
                        </p>
                      </td>
                      <td className="py-2.5 px-3">
                        <TargetBadge
                          showStatus
                          target={unit.target}
                          tercapai={achieved}
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        <span
                          className={`text-base font-bold ${achieved ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
                        >
                          {val.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Readiness Checks */}
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <ListChecks className="text-amber-500 mt-0.5 shrink-0" size={18} />
          <div>
            <h2 className="text-base font-semibold">
              Checklist Kesiapan Unit
            </h2>
            <p className="text-xs text-default-500 mt-0.5">
              Gunakan daftar ini sebelum rapat finalisasi atau submit pengajuan.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {READINESS_CHECKS.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-default-200 p-4 flex items-start gap-3"
            >
              <CheckCircle2
                className="text-green-500 mt-0.5 shrink-0"
                size={16}
              />
              <p className="text-sm text-default-600 leading-relaxed">
                {item}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            as={NextLink}
            color="primary"
            endContent={<ArrowRight size={15} />}
            href="/zona-integritas/lke-checker"
          >
            Input atau Cek LKE
          </Button>
          <Button
            as={NextLink}
            endContent={<BarChart3 size={15} />}
            href="/zona-integritas/monitoring"
            variant="flat"
          >
            Pantau Semua Unit
          </Button>
        </div>
      </div>
    </div>
  );
}
