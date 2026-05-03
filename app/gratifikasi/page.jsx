"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ShieldCheck, ArrowRight, FileText, CheckCircle, Send,
  ClipboardCheck, BadgeCheck, Search, Loader2,
  TrendingUp, Users, Clock, Lock, Zap, Eye,
} from "lucide-react";
import { VisaCredit } from "@/components/visa-brand";

// ── Charts (dynamic — SSR disabled, seluruh komponen diimport bersama) ───
const TrendChart    = dynamic(() => import("@/components/HomeCharts").then((m) => m.TrendChart),    { ssr: false });
const StatusPieChart = dynamic(() => import("@/components/HomeCharts").then((m) => m.StatusPieChart), { ssr: false });


// ── Flow steps ────────────────────────────────────────────────────────────
const flowSteps = [
  { icon: FileText,      label: "Isi Form",        desc: "Data pelapor, pemberi & objek gratifikasi",  color: "bg-blue-500/15 border-blue-500/30 text-blue-500"    },
  { icon: ClipboardCheck,label: "Konfirmasi",      desc: "Tinjau ringkasan laporan sebelum dikirim",   color: "bg-violet-500/15 border-violet-500/30 text-violet-500"},
  { icon: Send,          label: "Kirim",            desc: "Submit — sistem proses otomatis",            color: "bg-primary/15 border-primary/30 text-primary"        },
  { icon: BadgeCheck,    label: "Unique ID",        desc: "Terima nomor pelacakan laporan Anda",        color: "bg-amber-500/15 border-amber-500/30 text-amber-500"  },
  { icon: Search,        label: "Verifikasi UPG",  desc: "Tim UPG periksa & validasi laporan",         color: "bg-orange-500/15 border-orange-500/30 text-orange-500"},
  { icon: CheckCircle,   label: "Selesai",          desc: "Laporan diteruskan & status final ditetapkan", color: "bg-green-500/15 border-green-500/30 text-green-500" },
];

// ── Counter ───────────────────────────────────────────────────────────────
function Counter({ to, suffix = "", prefix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const step = to / 80;
    const timer = setInterval(() => {
      current += step;
      if (current >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, to]);

  return <span ref={ref}>{prefix}{count.toLocaleString("id-ID")}{suffix}</span>;
}

// ── Connector line ────────────────────────────────────────────────────────
function Connector({ inView, delay }) {
  return (
    <div className="hidden lg:flex items-center w-12 xl:w-16 shrink-0 relative">
      <div className="h-px w-full bg-default-200" />
      <motion.div
        className="absolute left-0 top-0 h-px bg-gradient-to-r from-primary to-primary/30"
        initial={{ width: 0 }}
        animate={inView ? { width: "100%" } : { width: 0 }}
        transition={{ duration: 0.5, delay }}
      />
      <motion.div
        className="absolute right-0 w-1.5 h-1.5 rounded-full bg-primary"
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ delay: delay + 0.4, duration: 0.3 }}
      />
    </div>
  );
}

// ── Tracking widget ───────────────────────────────────────────────────────
function TrackingWidget() {
  const [id, setId]         = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]  = useState(null);

  const statusMeta = {
    Diajukan:           { color: "text-amber-500",  bg: "bg-amber-500/10  border-amber-500/30",  dot: "bg-amber-500"  },
    Diverifikasi:       { color: "text-blue-500",   bg: "bg-blue-500/10   border-blue-500/30",   dot: "bg-blue-500"   },
    "Diteruskan ke KPK":{ color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/30", dot: "bg-violet-500" },
    Selesai:            { color: "text-green-500",  bg: "bg-green-500/10  border-green-500/30",  dot: "bg-green-500"  },
    error:              { color: "text-red-500",    bg: "bg-red-500/10    border-red-500/30",    dot: "bg-red-500"    },
  };

  const handle = async () => {
    if (!id.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res  = await fetch(`/api/tracking?uniqueId=${id.trim()}`);
      const data = await res.json();
      setResult(data.success
        ? { type: data.status, status: data.status, createdAt: data.createdAt, deskripsi: data.deskripsi }
        : { type: "error", status: "Tidak ditemukan" }
      );
    } catch {
      setResult({ type: "error", status: "Kesalahan server" });
    }
    setLoading(false);
  };

  const m = result ? (statusMeta[result.type] || statusMeta.error) : null;

  return (
    <div className="w-full max-w-lg">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Contoh: UPG-20251127-861"
          value={id}
          onChange={(e) => setId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handle()}
          className="flex-1 px-4 py-3 rounded-xl border border-default-200 bg-default-50 dark:bg-default-100/5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        <button
          onClick={handle}
          disabled={!id.trim() || loading}
          className="px-5 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Lacak
        </button>
      </div>

      <AnimatePresence>
        {result && m && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mt-3 p-4 rounded-xl border ${m.bg}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${m.dot} animate-pulse`} />
              <span className={`font-bold text-sm ${m.color}`}>{result.status}</span>
            </div>
            {result.createdAt && (
              <p className="text-xs text-default-500 mt-1">
                Dilaporkan:{" "}
                {new Date(result.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
              </p>
            )}
            {result.deskripsi && (
              <p className="text-xs text-default-500 mt-0.5">Ket: {result.deskripsi}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const flowRef  = useRef(null);
  const flowInView = useInView(flowRef, { once: true, margin: "-100px" });

  // Parallax for hero orbs
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 600], [0, -80]);
  const y2 = useTransform(scrollY, [0, 600], [0, -120]);
  const badgeY = useTransform(scrollY, [0, 400], [0, -60]);
  const badgeOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">

        {/* Animated orbs (parallax) */}
        <motion.div style={{ y: y1 }}
          className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] -z-10 pointer-events-none" />
        <motion.div style={{ y: y2 }}
          className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-[100px] -z-10 pointer-events-none" />
        <div className="absolute top-[30%] left-[60%] w-[200px] h-[200px] rounded-full bg-blue-500/8 blur-[80px] -z-10 pointer-events-none animate-pulse" />

        {/* Floating badges — pojok bawah, parallax saat scroll */}
        <motion.div
          initial={{ opacity: 0, x: -30, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          style={{ y: badgeY, opacity: badgeOpacity }}
          transition={{ delay: 1.2, duration: 0.7 }}
          className="absolute left-6 md:left-14 bottom-24 hidden md:flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold px-3 py-2 rounded-full backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          100% Anonim & Aman
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          style={{ y: badgeY, opacity: badgeOpacity }}
          transition={{ delay: 1.4, duration: 0.7 }}
          className="absolute right-6 md:right-14 bottom-24 hidden md:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold px-3 py-2 rounded-full backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Dilindungi Hukum
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5"
        >
          <VisaCredit size="md" className="mx-auto" />
        </motion.div>

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary border border-primary/25 rounded-full px-4 py-1.5 mb-8">
            <ShieldCheck size={11} /> Inspektorat V · Kementerian ESDM
          </span>
        </motion.div>

        {/* Headline — word-by-word stagger */}
        <div className="overflow-hidden mb-4">
          {["Membangun", "Budaya", "Sadar", "Gratifikasi"].map((word, i) => (
            <motion.span
              key={word}
              initial={{ y: "110%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
              className={`inline-block mr-3 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight ${
                i >= 2 ? "text-primary" : ""
              }`}
            >
              {word}
            </motion.span>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="text-default-500 text-base md:text-lg max-w-xl leading-relaxed mb-10"
        >
          Laporkan setiap pemberian yang tidak wajar. Sistem digital yang aman,
          cepat, dan transparan untuk mewujudkan ESDM yang berintegritas.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 mb-14 w-full max-w-sm sm:max-w-none sm:w-auto"
        >
          <Link
            href="/lapor"
            className="flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-white rounded-full font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 text-sm"
          >
            <ShieldCheck size={17} /> Lapor Gratifikasi
          </Link>
          <Link
            href="#alur"
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold border border-default-200 text-foreground hover:bg-default-100 transition-all text-sm"
          >
            Lihat Cara Kerja <ArrowRight size={15} />
          </Link>
        </motion.div>

        {/* Stats ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-x-10 gap-y-3"
        >
          {[
            { label: "Laporan Masuk",   to: 128, suffix: "+" },
            { label: "Tingkat Keamanan", to: 100, suffix: "%" },
            { label: "Batas Lapor (hr)", to: 30  },
            { label: "Pegawai Terlindungi", to: 5000, suffix: "+" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-primary">
                <Counter to={s.to} suffix={s.suffix ?? ""} />
              </p>
              <p className="text-xs text-default-400">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
            <div className="w-6 h-9 rounded-full border-2 border-default-300 flex justify-center pt-1.5 mx-auto">
              <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-1 h-2 bg-default-400 rounded-full" />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          ALUR PELAPORAN — Animated flow
      ════════════════════════════════════════════════════════════════ */}
      <section id="alur" className="px-6 py-24 border-t border-default-100">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Cara Kerja</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Alur Pelaporan Gratifikasi</h2>
            <p className="text-default-500 max-w-lg mx-auto leading-relaxed">
              Proses pelaporan selesai dalam hitungan menit. Sistem menangani
              segalanya — dari pengisian form hingga PDF otomatis dan Tracking ID.
            </p>
          </motion.div>

          {/* Flow */}
          <div ref={flowRef} className="flex flex-col lg:flex-row items-start lg:items-center justify-center gap-0 lg:gap-0">
            {flowSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex lg:flex-row flex-col items-center lg:items-center">
                  {/* Step card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={flowInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                    transition={{ delay: i * 0.12, duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                    className="flex flex-row lg:flex-col items-center lg:items-center gap-4 lg:gap-3 w-full lg:w-auto lg:text-center"
                  >
                    {/* Vertical connector (mobile) */}
                    {i > 0 && (
                      <div className="lg:hidden flex flex-col items-center w-6 shrink-0 self-stretch -mt-4 -mb-4">
                        <div className="w-px flex-1 bg-default-200 relative overflow-hidden">
                          <motion.div
                            className="absolute top-0 left-0 right-0 bg-primary"
                            initial={{ height: 0 }}
                            animate={flowInView ? { height: "100%" } : { height: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.12 }}
                          />
                        </div>
                      </div>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl border-2 flex items-center justify-center shrink-0 ${step.color}`}
                    >
                      <Icon size={22} strokeWidth={1.8} />
                    </motion.div>
                    <div className="lg:max-w-[100px]">
                      <p className="font-bold text-sm">{step.label}</p>
                      <p className="text-xs text-default-400 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>

                  {/* Horizontal connector (desktop) */}
                  {i < flowSteps.length - 1 && (
                    <Connector inView={flowInView} delay={i * 0.12 + 0.35} />
                  )}
                </div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.4 }}
            className="text-center mt-12"
          >
            <Link
              href="/lapor"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Mulai Laporan Sekarang <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          VISUALISASI / CHARTS
      ════════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 border-t border-default-100 bg-default-50/50 dark:bg-default-100/[0.02]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Statistik</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tren Pelaporan Gratifikasi</h2>
            <p className="text-default-500 max-w-md mx-auto text-sm leading-relaxed">
              Data ilustratif tren pelaporan bulanan dan distribusi status laporan di lingkungan Kementerian ESDM.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Area Chart — 2/3 width */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="lg:col-span-2 rounded-3xl border border-default-200 bg-background p-6"
            >
              <p className="font-bold text-sm mb-0.5">Tren Laporan Bulanan</p>
              <p className="text-xs text-default-400 mb-6">Jumlah laporan masuk per bulan (2025)</p>
              <TrendChart />
            </motion.div>

            {/* Pie + legend — 1/3 width */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}
              className="rounded-3xl border border-default-200 bg-background p-6 flex flex-col"
            >
              <p className="font-bold text-sm mb-0.5">Status Laporan</p>
              <p className="text-xs text-default-400 mb-4">Distribusi keseluruhan</p>
              <StatusPieChart />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FITUR UNGGULAN
      ════════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 border-t border-default-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Keunggulan</p>
            <h2 className="text-3xl md:text-4xl font-bold">Mengapa Gunakan Sistem Ini?</h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: Lock,       color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/20", title: "100% Anonim",       desc: "Identitas dapat dilindungi sepenuhnya. Data hanya diakses petugas UPG berwenang." },
              { icon: Zap,        color: "text-amber-500",  bg: "bg-amber-500/10  border-amber-500/20",  title: "Proses Cepat",      desc: "Laporan masuk, Unique ID dan PDF tergenerate otomatis dalam hitungan detik." },
              { icon: Eye,        color: "text-green-500",  bg: "bg-green-500/10  border-green-500/20",  title: "Tracking Real-Time", desc: "Pantau status laporan kapan saja menggunakan Tracking ID yang Anda terima." },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="rounded-2xl border border-default-200 bg-background p-7 cursor-default"
                >
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${f.bg}`}>
                    <Icon size={20} className={f.color} />
                  </div>
                  <h3 className="font-bold text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-default-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          TRACKING WIDGET
      ════════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 border-t border-default-100 bg-default-50/50 dark:bg-default-100/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Lacak Laporan</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                Pantau Status<br />Laporan Anda
              </h2>
              <p className="text-default-500 leading-relaxed mb-8 text-sm">
                Gunakan Tracking ID (format <span className="font-mono font-semibold text-foreground">UPG-YYYYMMDD-XXX</span>) yang
                Anda terima saat mengajukan laporan untuk melihat perkembangan terkini.
              </p>

              {/* Status legend */}
              <div className="space-y-2">
                {[
                  { label: "Diajukan",           color: "bg-amber-500",  desc: "Laporan diterima sistem" },
                  { label: "Diverifikasi",        color: "bg-blue-500",   desc: "UPG sedang memeriksa" },
                  { label: "Diteruskan ke KPK",   color: "bg-violet-500", desc: "Laporan resmi ke KPK" },
                  { label: "Selesai",             color: "bg-green-500",  desc: "Proses telah selesai" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                    <span className="font-semibold w-40 shrink-0">{s.label}</span>
                    <span className="text-default-500 text-xs">{s.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-3xl border border-default-200 bg-background p-8 shadow-xl shadow-default-200/50 dark:shadow-none"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Search size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">Lacak Status Laporan</p>
                  <p className="text-xs text-default-400">Masukkan nomor pelaporan Anda</p>
                </div>
              </div>
              <TrackingWidget />
              <p className="text-xs text-default-300 mt-4 text-center">
                Belum punya laporan?{" "}
                <Link href="/lapor" className="text-primary hover:underline font-medium">
                  Lapor sekarang
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-28 border-t border-default-100">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative rounded-3xl border border-primary/20 bg-primary/5 p-12 md:p-20 overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,hsl(var(--heroui-primary)/0.12),transparent)] pointer-events-none" />

            <ShieldCheck size={40} className="text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
              Sudah Terima<br />Gratifikasi?
            </h2>
            <p className="text-default-500 max-w-md mx-auto mb-10 leading-relaxed">
              Kewajiban melapor dalam <strong className="text-foreground">30 hari kerja</strong> sejak diterima.
              Proses pelaporan hanya membutuhkan beberapa menit dan identitas Anda sepenuhnya terlindungi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/lapor"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-full font-bold shadow-xl shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 transition-all text-sm"
              >
                <ShieldCheck size={17} /> Lapor Sekarang
              </Link>
              <Link
                href="/e-learning"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold border border-default-200 hover:bg-default-100 transition-all text-sm"
              >
                Pelajari Gratifikasi <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
