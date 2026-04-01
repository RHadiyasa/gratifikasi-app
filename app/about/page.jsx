"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Search,
  FileText,
  Users,
  Scale,
  ClipboardList,
  Building2,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

const functions = [
  {
    icon: Search,
    title: "Pengawasan Tujuan Tertentu",
    desc: "Melaksanakan pengawasan investigatif atas penugasan Menteri ESDM terhadap hal-hal yang berpotensi merugikan negara.",
  },
  {
    icon: ShieldCheck,
    title: "Pencegahan Korupsi & Gratifikasi",
    desc: "Pencegahan dan pengendalian praktik gratifikasi serta penyalahgunaan wewenang di lingkungan Kementerian ESDM.",
  },
  {
    icon: FileText,
    title: "Pengelolaan LHKASN",
    desc: "Mengelola Laporan Harta Kekayaan Aparatur Sipil Negara (LHKASN) sebagai instrumen transparansi dan akuntabilitas.",
  },
  {
    icon: BadgeCheck,
    title: "Reformasi Birokrasi & Zona Integritas",
    desc: "Koordinasi penilaian mandiri reformasi birokrasi dan pembangunan Zona Integritas menuju WBK/WBBM.",
  },
  {
    icon: ClipboardList,
    title: "Evaluasi Akuntabilitas Kinerja",
    desc: "Evaluasi Sistem Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) di seluruh unit kerja Kementerian ESDM.",
  },
  {
    icon: Scale,
    title: "Koordinasi Penegak Hukum",
    desc: "Koordinasi pengawasan dengan KPK, Kejaksaan, Kepolisian, dan instansi pengawas lain dalam penanganan perkara.",
  },
  {
    icon: Users,
    title: "Telaah Sejawat",
    desc: "Koordinasi pelaksanaan telaah sejawat (peer review) internal dan eksternal untuk peningkatan kualitas pengawasan.",
  },
  {
    icon: Building2,
    title: "Maturitas SPIP & Manajemen Risiko",
    desc: "Pemantauan dan evaluasi maturitas Sistem Pengendalian Intern Pemerintah serta manajemen risiko organisasi.",
  },
];

const stats = [
  { value: "5", label: "Unit Kelompok Kerja" },
  { value: "Itjen", label: "Unit Eselon I" },
  { value: "WBK", label: "Target Zona Integritas" },
  { value: "SPIP", label: "Standar Pengendalian Intern" },
];

const kelompokKerja = [
  {
    no: "Korkel 1",
    focus: "Pengawasan untuk tujuan tertentu & investigasi khusus",
  },
  {
    no: "Korkel 2",
    focus: "Pencegahan korupsi, gratifikasi & benturan kepentingan",
  },
  {
    no: "Korkel 3",
    focus: "Reformasi birokrasi & pembangunan zona integritas (WBK/WBBM)",
  },
  {
    no: "Korkel 4",
    focus: "Evaluasi SAKIP & maturitas SPIP",
  },
  {
    no: "Korkel 5",
    focus: "Koordinasi aparat penegak hukum & telaah sejawat",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative px-6 py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
          >
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary border border-primary/30 rounded-full px-4 py-1.5 mb-6">
              Inspektorat Jenderal · Kementerian ESDM
            </span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight"
          >
            Inspektorat V
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="text-default-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Unit pengawasan fungsional lintas sektor yang berfokus pada
            pencegahan korupsi, penguatan integritas, dan reformasi birokrasi di
            lingkungan Kementerian Energi dan Sumber Daya Mineral.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="flex items-center justify-center gap-2 mt-8 text-sm text-default-400"
          >
            <span>Dasar Hukum: Permen ESDM No. 9 Tahun 2024</span>
            <ArrowRight size={14} />
            <span>Organisasi & Tata Kerja Kementerian ESDM</span>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                variants={fadeUp}
                className="rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5 p-6 text-center"
              >
                <p className="text-3xl font-bold text-primary mb-1">{s.value}</p>
                <p className="text-xs text-default-500 uppercase tracking-wide">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tugas Pokok */}
      <section className="px-6 py-16 border-t border-default-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-12"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Tugas Pokok
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Apa yang kami lakukan?
            </h2>
            <p className="text-default-500 max-w-2xl leading-relaxed">
              Inspektorat V melaksanakan pengawasan untuk tujuan tertentu atas
              penugasan Menteri, kegiatan pencegahan dan pengendalian yang
              berpotensi menimbulkan kerugian negara dan penyalahgunaan
              wewenang, serta pengawasan atas pelaksanaan reformasi birokrasi.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {functions.map((fn, i) => {
              const Icon = fn.icon;
              return (
                <motion.div
                  key={fn.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className="flex gap-4 p-5 rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5 hover:border-primary/40 transition-colors"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">{fn.title}</p>
                    <p className="text-xs text-default-500 leading-relaxed">
                      {fn.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Kelompok Kerja */}
      <section className="px-6 py-16 border-t border-default-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-12"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Struktur
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Kelompok Kerja
            </h2>
            <p className="text-default-500 max-w-2xl leading-relaxed">
              Inspektorat V terdiri dari lima Kelompok Kerja (Korkel) yang
              masing-masing menangani bidang pengawasan yang spesifik dan
              saling melengkapi.
            </p>
          </motion.div>

          <div className="space-y-3">
            {kelompokKerja.map((k, i) => (
              <motion.div
                key={k.no}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="flex items-center gap-5 p-5 rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5 hover:border-primary/40 transition-colors"
              >
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary text-center leading-tight">
                    {k.no}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-default-600 leading-relaxed">
                    {k.focus}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Konteks dalam Itjen */}
      <section className="px-6 py-16 border-t border-default-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-10"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Posisi dalam Organisasi
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Inspektorat Jenderal ESDM
            </h2>
            <p className="text-default-500 max-w-2xl leading-relaxed">
              Inspektorat V adalah salah satu dari lima inspektorat di bawah
              Inspektorat Jenderal Kementerian ESDM. Berbeda dengan Inspektorat
              I–IV yang bersifat sektoral, Inspektorat V berfokus pada
              pengawasan fungsional lintas sektor.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-3">
            {["I", "II", "III", "IV", "V"].map((num, i) => (
              <motion.div
                key={num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className={`p-5 rounded-2xl border text-center transition-colors ${
                  num === "V"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-default-200 bg-default-50 dark:bg-default-100/5 text-default-500"
                }`}
              >
                <p
                  className={`text-2xl font-bold mb-1 ${num === "V" ? "text-primary" : ""}`}
                >
                  {num}
                </p>
                <p className="text-xs">
                  {num === "V" ? "Fungsional Lintas Sektor" : "Sektoral"}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-default-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-3xl border border-primary/20 bg-primary/5 p-10 md:p-14 text-center"
          >
            <ShieldCheck size={36} className="text-primary mx-auto mb-5" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Laporkan Gratifikasi
            </h2>
            <p className="text-default-500 max-w-xl mx-auto mb-8 leading-relaxed">
              Inspektorat V membuka kanal pelaporan gratifikasi bagi seluruh
              pegawai Kementerian ESDM. Laporan dapat disampaikan secara
              rahasia dan dilindungi oleh mekanisme whistleblower protection.
            </p>
            <a
              href="/lapor"
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3 rounded-full hover:bg-primary/90 transition-colors text-sm"
            >
              Lapor Sekarang
              <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
