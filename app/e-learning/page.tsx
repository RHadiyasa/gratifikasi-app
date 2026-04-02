"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@heroui/button";
import Link from "next/link";
import {
  ShieldAlert,
  Scale,
  TrendingDown,
  BookOpen,
  UserPlus,
  ClipboardList,
  GraduationCap,
  Download,
  Lock,
  RefreshCcw,
  KeyRound,
  UserX,
  WifiOff,
  Upload,
  MonitorCheck,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Gavel,
  Eye,
  Heart,
  ExternalLink,
} from "lucide-react";

// ── Animated counter ───────────────────────────────────────────────────────

function Counter({ to, suffix = "", duration = 2 }: { to: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, to, duration]);

  return <span ref={ref}>{count.toLocaleString("id-ID")}{suffix}</span>;
}

// ── Accordion item ─────────────────────────────────────────────────────────

function AccordionItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="border border-default-200 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-default-50 dark:hover:bg-default-100/5 transition-colors"
      >
        <span className="font-semibold text-sm pr-4">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={16} className="text-default-400 shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <p className="px-5 pb-5 text-sm text-default-500 leading-relaxed border-t border-default-100 pt-4">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────

const whyCards = [
  {
    icon: Gavel,
    title: "Kewajiban Hukum",
    desc: "UU No. 20 Tahun 2001 mewajibkan setiap pegawai melaporkan penerimaan gratifikasi kepada KPK dalam 30 hari kerja. Tidak melapor = gratifikasi dianggap sebagai suap.",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: TrendingDown,
    title: "Korupsi Berawal dari Sini",
    desc: "Gratifikasi yang tidak dilaporkan menciptakan konflik kepentingan yang menggerus objektivitas pengambilan keputusan dan membuka pintu praktik korupsi yang lebih besar.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: Heart,
    title: "Integritas Institusi",
    desc: "Kementerian ESDM mengelola sumber daya energi strategis bangsa. Integritas setiap pegawainya berdampak langsung pada kepercayaan publik dan tata kelola energi nasional.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Eye,
    title: "Transparansi & Akuntabilitas",
    desc: "Pelaporan gratifikasi adalah bentuk nyata komitmen pegawai terhadap prinsip good governance. Setiap laporan memperkuat budaya antikorupsi di lingkungan ESDM.",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
];

const stats = [
  { value: 30, suffix: " hari",    label: "Batas waktu pelaporan ke KPK sejak diterima" },
  { value: 10, suffix: " tahun",   label: "Ancaman pidana bagi yang tidak melapor" },
  { value: 500, suffix: " juta",   label: "Nilai gratifikasi bisa ditetapkan milik negara (Rp)" },
  { value: 100, suffix: "%",       label: "Identitas pelapor dilindungi sistem & peraturan" },
];

const faqItems = [
  {
    q: "Apa yang dimaksud dengan gratifikasi?",
    a: "Gratifikasi adalah pemberian dalam arti luas, meliputi uang, barang, rabat, komisi, pinjaman tanpa bunga, tiket perjalanan, fasilitas penginapan, perjalanan wisata, pengobatan cuma-cuma, dan fasilitas lainnya yang diterima di dalam negeri maupun di luar negeri yang berhubungan dengan jabatan atau kewenangan yang dimiliki penerima.",
  },
  {
    q: "Kapan gratifikasi wajib dilaporkan?",
    a: "Gratifikasi wajib dilaporkan dalam 30 hari kerja sejak diterima. Gratifikasi yang tidak dilaporkan dan terbukti berhubungan dengan jabatan, maka secara hukum dianggap sebagai suap dan dapat dijerat pasal suap.",
  },
  {
    q: "Apa saja yang tidak termasuk gratifikasi?",
    a: "Gratifikasi yang tidak perlu dilaporkan antara lain: pemberian dari keluarga (bukan mitra kerja) tanpa konflik kepentingan, hadiah dalam hubungan adat/budaya dengan nilai wajar, serta penghargaan resmi dari lembaga negara.",
  },
  {
    q: "Apakah identitas pelapor akan terbuka?",
    a: "Tidak. Identitas pelapor dilindungi sepenuhnya oleh sistem dan peraturan perundang-undangan. Pelapor berhak memilih opsi laporan rahasia yang menjamin anonimitas identitasnya.",
  },
  {
    q: "Apa yang terjadi setelah laporan dikirim?",
    a: "Laporan akan masuk ke sistem UPG (Unit Pengendalian Gratifikasi) Inspektorat V, kemudian diverifikasi, dan jika memenuhi syarat akan diteruskan ke KPK. KPK kemudian menetapkan apakah gratifikasi menjadi milik negara atau dikembalikan kepada pelapor.",
  },
  {
    q: "Bagaimana cara mendapatkan Enrolment Key e-learning?",
    a: "Enrolment Key disediakan oleh pengelola UPG Inspektorat V ESDM. Hubungi UPG instansi Anda untuk mendapatkan kunci pendaftaran kelas gratifikasi di platform ACLC-KPK.",
  },
];

const elearningSteps = [
  { icon: BookOpen,      title: "Akses Portal ACLC-KPK",     desc: "Buka newlearning.kpk.go.id untuk mengakses platform e-learning resmi KPK." },
  { icon: UserPlus,      title: "Buat Akun",                 desc: "Klik Register, isi formulir, dan konfirmasi akun melalui email yang didaftarkan." },
  { icon: ClipboardList, title: "Daftar Kelas",              desc: "Masuk ke Kursus → Semua Kursus → Korupsi & Penegakan Hukum, masukkan Enrolment Key dari UPG." },
  { icon: GraduationCap, title: "Ikuti Pembelajaran",        desc: "Selesaikan seluruh modul (video, artikel, latihan, tes akhir) secara berurutan." },
  { icon: Download,      title: "Unduh Sertifikat",          desc: "Buka Tab Penutup, klik Unduh Sertifikat Kelulusan, lalu upload ke sistem UPG." },
];

const issues = [
  { icon: Lock,       title: "Tidak Dapat Login",           desc: "Pastikan konfirmasi email sudah dilakukan dan username/password yang diketik benar." },
  { icon: RefreshCcw, title: "Lupa Password",               desc: "Gunakan fitur Forgot Password dan ikuti tautan reset yang dikirim ke email." },
  { icon: KeyRound,   title: "Enrolment Key Tidak Valid",   desc: "Periksa penulisan huruf besar-kecil dan pastikan kelas yang dipilih sudah benar." },
  { icon: UserX,      title: "Kendala Pembuatan Akun",      desc: "Perhatikan pesan error merah pada form. Username tidak boleh sama dengan pengguna lain." },
  { icon: WifiOff,    title: "Aktivitas Tidak Bisa Dibuka", desc: "Pastikan koneksi stabil dan prasyarat modul sebelumnya sudah diselesaikan." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function ELearningPage() {
  const { isLoggedIn } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"steps" | "issues">("steps");

  return (
    <div className="min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90dvh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[hsl(var(--heroui-primary)/0.08)] via-transparent to-transparent" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--heroui-primary)/0.15),transparent)]" />

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary border border-primary/25 rounded-full px-4 py-1.5 mb-6">
            <ShieldAlert size={11} /> Inspektorat V · Kementerian ESDM
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl mb-6"
        >
          Pahami Gratifikasi,{" "}
          <span className="text-primary">Cegah Korupsi</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-default-500 text-base md:text-lg max-w-2xl leading-relaxed mb-10"
        >
          Setiap pegawai Kementerian ESDM wajib memahami batas antara pemberian
          wajar dan gratifikasi. Pengetahuan ini adalah garis pertama
          pertahanan Anda dari jerat hukum korupsi.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm sm:max-w-none sm:w-auto"
        >
          <Button
            as={Link}
            href="/e-learning/upload"
            color="primary"
            variant="shadow"
            size="lg"
            startContent={<Upload size={17} />}
            className="w-full sm:w-auto font-semibold"
          >
            Upload Sertifikat
          </Button>

          <Button
            as={Link}
            href={isLoggedIn ? "/e-learning/tracker" : "/e-learning/participants"}
            variant="bordered"
            size="lg"
            startContent={<MonitorCheck size={17} />}
            endContent={<ArrowRight size={15} />}
            className="w-full sm:w-auto font-semibold"
          >
            {isLoggedIn ? "Tracking Peserta (Admin)" : "Lihat Data Peserta"}
          </Button>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ChevronDown size={22} className="text-default-300" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Why Report ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 border-t border-default-100">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Mengapa Penting?</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Kenapa Gratifikasi Harus Dilaporkan?</h2>
            <p className="text-default-500 max-w-xl mx-auto leading-relaxed">
              Tidak semua pemberian bersifat ikhlas. Di balik amplop atau bingkisan itu,
              ada risiko hukum yang nyata bagi Anda sebagai penyelenggara negara.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {whyCards.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.title}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  custom={i} variants={fadeUp}
                  className={`group p-6 rounded-2xl border ${c.border} ${c.bg} hover:scale-[1.02] transition-transform duration-300 cursor-default`}
                >
                  <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-4`}>
                    <Icon size={18} className={c.color} />
                  </div>
                  <h3 className={`font-bold text-base mb-2 ${c.color}`}>{c.title}</h3>
                  <p className="text-sm text-default-600 leading-relaxed">{c.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 bg-primary border-y border-primary">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              custom={i} variants={fadeUp}
            >
              <p className="text-4xl font-black mb-2">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="text-xs text-white/70 leading-relaxed">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FAQ / Accordion ───────────────────────────────────────────────── */}
      <section className="px-6 py-20 border-b border-default-100">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-12"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Pahami Lebih Dalam</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pertanyaan yang Sering Diajukan</h2>
            <p className="text-default-500 leading-relaxed">
              Klik setiap pertanyaan untuk membaca penjelasannya.
            </p>
          </motion.div>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} index={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Legal basis callout ───────────────────────────────────────────── */}
      <section className="px-6 py-16 border-b border-default-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 md:p-12"
          >
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Scale size={22} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-amber-600 dark:text-amber-400">Dasar Hukum yang Harus Diketahui</h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ["UU No. 31 Tahun 1999", "Tentang Pemberantasan Tindak Pidana Korupsi"],
                    ["UU No. 20 Tahun 2001", "Perubahan atas UU Tipikor — mengatur gratifikasi secara eksplisit"],
                    ["PP No. 53 Tahun 2010", "Disiplin Pegawai Negeri Sipil — termasuk larangan menerima gratifikasi"],
                    ["Peraturan KPK No. 2/2019", "Tata cara pelaporan dan penanganan gratifikasi"],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-2">
                      <CheckCircle2 size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">{title}</p>
                        <p className="text-default-500 text-xs">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── E-Learning Guide ──────────────────────────────────────────────── */}
      <section className="px-6 py-20 border-b border-default-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mb-10"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">ACLC-KPK</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Panduan E-Learning Gratifikasi</h2>
            <p className="text-default-500 max-w-xl mx-auto leading-relaxed">
              KPK menyediakan platform e-learning gratis untuk meningkatkan
              pemahaman gratifikasi seluruh ASN. Ikuti 5 langkah berikut.
            </p>
          </motion.div>

          {/* Tab toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-default-100 dark:bg-default-50/10 rounded-2xl p-1 gap-1">
              {(["steps", "issues"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-background shadow text-foreground"
                      : "text-default-400 hover:text-foreground"
                  }`}
                >
                  {tab === "steps" ? "Langkah Pendaftaran" : "Kendala Umum"}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "steps" ? (
              <motion.div
                key="steps"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="space-y-0"
              >
                {elearningSteps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex gap-5">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 z-10">
                          <Icon size={16} className="text-primary" />
                        </div>
                        {i < elearningSteps.length - 1 && (
                          <div className="w-px flex-1 bg-default-200 my-1" />
                        )}
                      </div>
                      <div className="pb-8">
                        <p className="font-bold text-sm mt-2 mb-1">{s.title}</p>
                        <p className="text-sm text-default-500 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-2 pt-2 flex flex-col sm:flex-row gap-3">
                  <Button
                    as="a"
                    href="https://newlearning.kpk.go.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="primary"
                    variant="shadow"
                    endContent={<ExternalLink size={14} />}
                    className="font-semibold"
                  >
                    Buka Portal ACLC-KPK
                  </Button>
                  <Button
                    as={Link}
                    href="/e-learning/upload"
                    variant="bordered"
                    startContent={<Upload size={15} />}
                    className="font-semibold"
                  >
                    Upload Sertifikat Saya
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="issues"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid sm:grid-cols-2 gap-3"
              >
                {issues.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex gap-4 p-5 rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-default-100 dark:bg-default-200/10 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-default-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-1">{item.title}</p>
                        <p className="text-xs text-default-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="rounded-3xl border border-primary/20 bg-primary/5 p-10 md:p-16 text-center"
          >
            <AlertTriangle size={36} className="text-primary mx-auto mb-5" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Sudah Menerima Gratifikasi?
            </h2>
            <p className="text-default-500 max-w-lg mx-auto mb-8 leading-relaxed">
              Jangan tunda. Laporkan dalam 30 hari kerja. Sistem pelaporan kami
              aman, mudah, dan identitas Anda dapat dilindungi sepenuhnya.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                as={Link}
                href="/lapor"
                color="primary"
                variant="shadow"
                size="lg"
                endContent={<ArrowRight size={16} />}
                className="font-semibold"
              >
                Lapor Sekarang
              </Button>
              <Button
                as={Link}
                href="/docs"
                variant="bordered"
                size="lg"
                className="font-semibold"
              >
                Baca Panduan
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
