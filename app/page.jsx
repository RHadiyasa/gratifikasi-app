"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck,
  BookOpen,
  FileText,
  BarChart2,
  ArrowRight,
  ChevronRight,
  Scale,
  Users,
} from "lucide-react";
import { VisaCredit } from "@/components/visa-brand";

const features = [
  {
    icon: ShieldCheck,
    title: "Pelaporan Gratifikasi",
    description:
      "Laporkan penerimaan gratifikasi secara aman, anonim, dan terlacak. Proses digital selesai dalam hitungan menit.",
    href: "/gratifikasi",
    color: "text-primary",
    bg: "bg-primary/8 border-primary/20",
    cta: "Lihat Fitur",
  },
  {
    icon: BookOpen,
    title: "E-Learning",
    description:
      "Tingkatkan pemahaman tentang pencegahan korupsi melalui modul pembelajaran interaktif bersertifikat.",
    href: "/e-learning",
    color: "text-violet-500",
    bg: "bg-violet-500/8 border-violet-500/20",
    cta: "Mulai Belajar",
  },
  {
    icon: FileText,
    title: "Panduan & Regulasi",
    description:
      "Akses peraturan, panduan teknis, dan referensi hukum terkait gratifikasi dan integritas pegawai.",
    href: "/docs",
    color: "text-blue-500",
    bg: "bg-blue-500/8 border-blue-500/20",
    cta: "Baca Panduan",
  },
  {
    icon: BarChart2,
    title: "Dashboard",
    description:
      "Pantau statistik dan perkembangan laporan gratifikasi secara real-time di lingkungan Kementerian ESDM.",
    href: "/dashboard",
    color: "text-amber-500",
    bg: "bg-amber-500/8 border-amber-500/20",
    cta: "Lihat Data",
  },
];

const stats = [
  { value: "100%", label: "Anonim & Aman" },
  { value: "30", label: "Hari Batas Lapor" },
  { value: "24/7", label: "Sistem Online" },
  { value: "5K+", label: "Pegawai Terlindungi" },
];

const pillars = [
  {
    icon: Scale,
    title: "Transparansi",
    desc: "Setiap laporan tercatat dan dapat dipantau dengan nomor pelacakan unik.",
  },
  {
    icon: ShieldCheck,
    title: "Integritas",
    desc: "Mendorong perilaku jujur dan bertanggung jawab di seluruh jajaran ESDM.",
  },
  {
    icon: Users,
    title: "Akuntabilitas",
    desc: "Memastikan setiap tindakan dapat dipertanggungjawabkan kepada publik.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-36 md:py-44 overflow-hidden">

        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,hsl(var(--heroui-primary)/0.07),transparent)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-default-200 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5"
        >
          <VisaCredit size="md" className="mx-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary border border-primary/25 rounded-full px-4 py-1.5">
            <ShieldCheck size={11} /> Inspektorat V · Kementerian ESDM
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.65, ease: [0.33, 1, 0.68, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6 max-w-3xl"
        >
          Sistem{" "}
          <span className="text-primary">Pencegahan</span>
          <br />
          Korupsi Digital
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.6 }}
          className="text-default-500 text-base md:text-lg max-w-lg leading-relaxed mb-10"
        >
          Platform terintegrasi untuk pelaporan gratifikasi, edukasi antikorupsi,
          dan pemantauan integritas di lingkungan Kementerian ESDM.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 mb-16"
        >
          <Link
            href="/lapor"
            className="flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-white rounded-full font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:-translate-y-0.5 transition-all text-sm"
          >
            <ShieldCheck size={16} /> Lapor Gratifikasi
          </Link>
          <Link
            href="#fitur"
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold border border-default-200 text-foreground hover:bg-default-100 transition-all text-sm"
          >
            Jelajahi Fitur <ArrowRight size={15} />
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-x-10 gap-y-3"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-primary">{s.value}</p>
              <p className="text-xs text-default-400">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="fitur" className="px-6 py-24 border-t border-default-100">
        <div className="max-w-5xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Fitur
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Semua yang Anda Butuhkan
            </h2>
            <p className="text-default-500 max-w-md mx-auto text-sm leading-relaxed">
              Satu platform untuk mendukung budaya integritas dan transparansi
              di seluruh lingkungan Kementerian ESDM.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <Link
                    href={f.href}
                    className="group flex flex-col h-full p-7 rounded-2xl border border-default-200 bg-background hover:border-default-300 hover:shadow-lg hover:shadow-default-200/40 dark:hover:shadow-none hover:-translate-y-1 transition-all duration-200"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${f.bg}`}
                    >
                      <Icon size={20} className={f.color} />
                    </div>
                    <h3 className="font-bold text-base mb-2">{f.title}</h3>
                    <p className="text-sm text-default-500 leading-relaxed flex-1">
                      {f.description}
                    </p>
                    <div
                      className={`flex items-center gap-1 mt-5 text-xs font-semibold ${f.color}`}
                    >
                      {f.cta}
                      <ChevronRight
                        size={13}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── THREE PILLARS ────────────────────────────────────────────────── */}
      <section className="px-6 py-20 border-t border-default-100 bg-default-50/50 dark:bg-default-100/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="text-center px-4 py-8"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-sm mb-2">{p.title}</h3>
                  <p className="text-xs text-default-500 leading-relaxed">{p.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ABOUT ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-default-100">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Tentang
            </p>
            <h2 className="text-3xl font-bold mb-5 leading-tight">
              Membangun Integritas
              <br />
              dari Dalam
            </h2>
            <p className="text-default-500 text-sm leading-relaxed mb-4">
              Sistem ini dikembangkan oleh{" "}
              <strong className="text-foreground">Inspektorat V</strong> sebagai
              upaya nyata dalam mencegah korupsi di lingkungan Kementerian
              Energi dan Sumber Daya Mineral.
            </p>
            <p className="text-default-500 text-sm leading-relaxed">
              Melalui digitalisasi proses pelaporan, edukasi berkelanjutan, dan
              transparansi data, kami berkomitmen mewujudkan birokrasi yang
              bersih dan berintegritas.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 gap-4"
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-default-200 bg-background p-6 text-center"
              >
                <p className="text-3xl font-black text-primary mb-1">{s.value}</p>
                <p className="text-xs text-default-400">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="px-6 py-28 border-t border-default-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative max-w-2xl mx-auto text-center rounded-3xl border border-primary/20 bg-primary/5 p-14 md:p-20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_110%,hsl(var(--heroui-primary)/0.1),transparent)] pointer-events-none" />

          <ShieldCheck size={36} className="text-primary mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
            Bersama Kita
            <br />
            Cegah Korupsi
          </h2>
          <p className="text-default-500 mb-10 text-sm leading-relaxed max-w-sm mx-auto">
            Integritas bukan hanya tanggung jawab pimpinan — setiap pegawai
            berperan dalam membangun budaya bebas korupsi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/lapor"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-full font-bold shadow-xl shadow-primary/25 hover:bg-primary/90 hover:-translate-y-0.5 transition-all text-sm"
            >
              <ShieldCheck size={16} /> Lapor Gratifikasi
            </Link>
            <Link
              href="/e-learning"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold border border-default-200 hover:bg-default-100 transition-all text-sm"
            >
              Pelajari Antikorupsi <ArrowRight size={15} />
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
