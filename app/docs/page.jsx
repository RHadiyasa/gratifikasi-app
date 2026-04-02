"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import {
  Target,
  Workflow,
  ClipboardList,
  ShieldCheck,
  FileText,
  BarChart2,
  Scale,
  Phone,
  ArrowRight,
  CheckCircle2,
  Circle,
  Info,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const sections = [
  { id: "tujuan",     label: "Tujuan Fitur",           icon: Target },
  { id: "alur",       label: "Alur Pelaporan",          icon: Workflow },
  { id: "form",       label: "Pengisian Form",          icon: ClipboardList },
  { id: "konfirmasi", label: "Konfirmasi Laporan",      icon: ShieldCheck },
  { id: "pdf",        label: "Hasil PDF",               icon: FileText },
  { id: "status",     label: "Status Laporan",          icon: BarChart2 },
  { id: "hak",        label: "Hak Pelapor",             icon: Scale },
  { id: "bantuan",    label: "Bantuan",                 icon: Phone },
];

const alurSteps = [
  {
    title: "Isi Form Pelaporan",
    desc: "Lengkapi data pelapor, pemberi, objek gratifikasi, dan kronologi kejadian sesuai juknis KPK.",
  },
  {
    title: "Tinjau Ringkasan",
    desc: "Sistem menampilkan modal konfirmasi berisi seluruh data yang telah diinput untuk ditinjau ulang.",
  },
  {
    title: "Submit Laporan",
    desc: "Tekan tombol Submit jika data sudah benar. Laporan langsung diproses oleh sistem.",
  },
  {
    title: "Simpan & PDF Otomatis",
    desc: "Sistem membuat Unique ID, menyimpan laporan ke database, dan mencetak PDF format KPK.",
  },
  {
    title: "Notifikasi Berhasil",
    desc: "Tracking ID muncul sebagai konfirmasi. Simpan ID ini untuk memantau perkembangan laporan.",
  },
];

const formSections = [
  {
    tag: "A",
    title: "Jenis Laporan",
    desc: "Pilih Laporan Penerimaan atau Laporan Penolakan. Aktifkan opsi Rahasia jika identitas ingin dilindungi.",
  },
  {
    tag: "B",
    title: "Data Pelapor",
    desc: "Isi nama, NIP, TTL, instansi, jabatan, email, nomor telepon, dan alamat lengkap.",
  },
  {
    tag: "C",
    title: "Data Pemberi",
    desc: "Isi identitas pihak pemberi: nama, instansi, alamat, relasi, dan alasan pemberian.",
  },
  {
    tag: "D",
    title: "Objek Gratifikasi",
    desc: "Pilih jenis dan lokasi objek, isi perkiraan nilai dalam rupiah, dan uraikan secara rinci.",
  },
  {
    tag: "E",
    title: "Kronologi",
    desc: "Catat tanggal penerimaan, tanggal lapor, tempat, dan uraian lengkap peristiwa.",
  },
  {
    tag: "F",
    title: "Pernyataan Kompensasi",
    desc: "Pilih kesediaan menyerahkan kompensasi sesuai Surat Keputusan Pimpinan KPK.",
  },
];

const statusFlow = [
  { label: "Diajukan",          desc: "Laporan masuk ke sistem, menunggu tinjauan UPG.",                              color: "text-blue-500",   bg: "bg-blue-500/10",   border: "border-blue-500/30"   },
  { label: "Diverifikasi",      desc: "UPG memeriksa kelengkapan data dan keabsahan laporan.",                        color: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/30"  },
  { label: "Diteruskan ke KPK", desc: "Laporan memenuhi syarat dan dikirim resmi ke KPK.",                           color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  { label: "Selesai",           desc: "Tindak lanjut ditetapkan: milik negara, dikembalikan, atau diserahkan.", color: "text-green-500",  bg: "bg-green-500/10",  border: "border-green-500/30"  },
];

const rights = [
  { title: "Perlindungan Identitas",    desc: "Kerahasiaan identitas dijamin penuh sesuai peraturan. Data hanya diakses petugas berwenang." },
  { title: "Informasi Status Laporan",  desc: "Pelapor berhak memantau perkembangan laporan kapan saja menggunakan Tracking ID." },
  { title: "Kompensasi (jika disetujui)", desc: "Berhak mendapat kompensasi atas gratifikasi yang dilaporkan jika memenuhi syarat KPK." },
];

const duties = [
  { title: "Data Benar & Sah",    desc: "Seluruh data yang diinput harus benar, lengkap, dan dapat dipertanggungjawabkan." },
  { title: "Bersikap Kooperatif", desc: "Siap memberikan konfirmasi atau informasi tambahan jika diminta petugas UPG." },
];

// ─── Komponen Kecil ──────────────────────────────────────────────────────────

function SectionHeading({ number, title }) {
  return (
    <div className="flex items-baseline gap-4 mb-8">
      <span className="text-5xl font-black text-primary/15 leading-none select-none tabular-nums">
        {String(number).padStart(2, "0")}
      </span>
      <h2 className="text-2xl font-bold">{title}</h2>
    </div>
  );
}

function InfoCard({ children, variant = "default" }) {
  const styles = {
    default: "bg-default-50 dark:bg-default-100/5 border-default-200",
    accent:  "bg-primary/5 border-primary/20",
    warn:    "bg-amber-500/5 border-amber-500/20",
  };
  return (
    <div className={`rounded-2xl border p-5 ${styles[variant]}`}>
      {children}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("tujuan");
  const observerRefs = useRef({});

  // Reading progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  // Intersection observer untuk active section di sidebar
  useEffect(() => {
    const observers = [];
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <>
      {/* Reading progress bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-0.5 bg-primary origin-left z-50"
      />

      <div className="min-h-screen">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative px-6 pt-16 pb-12 overflow-hidden border-b border-default-100">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--heroui-primary)/0.12),transparent)]" />
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary border border-primary/25 rounded-full px-3 py-1 mb-5">
                <Info size={11} /> Dokumentasi
              </span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                Panduan Pelaporan<br />
                <span className="text-primary">Gratifikasi</span>
              </h1>
              <p className="text-default-500 text-lg max-w-xl leading-relaxed">
                Panduan lengkap penggunaan sistem pelaporan gratifikasi
                Inspektorat V — dari pengisian form hingga pemantauan status
                laporan.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Layout ────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[220px_1fr] gap-12">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-default-400 mb-4 px-3">
                Daftar Isi
              </p>
              {sections.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-default-500 hover:text-foreground hover:bg-default-100/60"
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span>{label}</span>
                    {active && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="ml-auto w-1 h-1 rounded-full bg-primary"
                      />
                    )}
                  </a>
                );
              })}
            </div>
          </aside>

          {/* ── Content ─────────────────────────────────────────── */}
          <main className="space-y-24 min-w-0">

            {/* 1. Tujuan */}
            <motion.section
              id="tujuan"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeading number={1} title="Tujuan Fitur Pelaporan" />
              <p className="text-default-600 leading-relaxed mb-6">
                Fitur pelaporan ini dirancang untuk mempermudah pegawai
                menyampaikan laporan penerimaan atau penolakan gratifikasi secara
                cepat, terstruktur, dan sesuai ketentuan KPK — tanpa perlu login
                maupun mendaftar akun.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ["Tanpa Login",           "Siapa pun dapat melapor tanpa perlu membuat akun."],
                  ["Laporan Anonim",        "Identitas dapat dirahasiakan melalui opsi Laporan Rahasia."],
                  ["Unique ID Otomatis",    "Setiap laporan mendapat ID unik sebagai kode pelacakan resmi."],
                  ["PDF Otomatis",          "Dokumen PDF format KPK dibuat instan setelah submit."],
                  ["Data Aman",             "Seluruh laporan tersimpan di database terenkripsi."],
                  ["Transparansi Proses",   "Status laporan dapat dipantau real-time via Tracking ID."],
                ].map(([title, desc]) => (
                  <InfoCard key={title}>
                    <div className="flex gap-3">
                      <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold mb-0.5">{title}</p>
                        <p className="text-xs text-default-500">{desc}</p>
                      </div>
                    </div>
                  </InfoCard>
                ))}
              </div>
            </motion.section>

            {/* 2. Alur */}
            <motion.section
              id="alur"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeading number={2} title="Alur Pelaporan" />
              <p className="text-default-600 leading-relaxed mb-8">
                Lima tahapan sederhana yang membawa laporan dari form kosong
                hingga tersimpan di sistem dan diterima UPG.
              </p>

              <div className="relative space-y-0">
                {alurSteps.map((step, i) => (
                  <div key={i} className="flex gap-5">
                    {/* Line + circle */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 z-10">
                        <span className="text-xs font-bold text-primary">{i + 1}</span>
                      </div>
                      {i < alurSteps.length - 1 && (
                        <div className="w-px flex-1 bg-default-200 my-1" />
                      )}
                    </div>
                    {/* Card */}
                    <div className={`pb-6 ${i === alurSteps.length - 1 ? "" : ""}`}>
                      <p className="font-semibold text-sm mb-1 mt-1.5">{step.title}</p>
                      <p className="text-xs text-default-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* 3. Form */}
            <motion.section
              id="form"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeading number={3} title="Pengisian Form Laporan" />
              <p className="text-default-600 leading-relaxed mb-6">
                Form pelaporan terdiri dari enam bagian yang harus diisi lengkap
                agar laporan dapat diproses oleh UPG.
              </p>
              <div className="space-y-3">
                {formSections.map((s, i) => (
                  <motion.div
                    key={s.tag}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    className="flex gap-4 p-4 rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100/5 hover:border-primary/30 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                      {s.tag}
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-0.5">{s.title}</p>
                      <p className="text-xs text-default-500 leading-relaxed">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* 4. Konfirmasi */}
            <motion.section
              id="konfirmasi"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeading number={4} title="Konfirmasi Sebelum Submit" />
              <p className="text-default-600 leading-relaxed mb-6">
                Setelah mengisi form, sistem menampilkan{" "}
                <strong>modal konfirmasi</strong> yang merangkum seluruh data
                sebelum dikirim — mencegah kesalahan input yang bisa
                memperlambat verifikasi UPG.
              </p>

              <InfoCard variant="accent">
                <p className="text-sm font-semibold mb-3 text-primary">
                  Data yang ditampilkan di modal konfirmasi:
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    "Data Pelapor",
                    "Data Pemberi",
                    "Objek Gratifikasi",
                    "Kronologi Kejadian",
                    "Pernyataan Kompensasi",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-default-600">
                      <ArrowRight size={12} className="text-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </InfoCard>

              <div className="mt-4">
                <InfoCard variant="warn">
                  <div className="flex gap-3">
                    <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-default-600 leading-relaxed">
                      Setelah tombol <strong>Submit</strong> ditekan, laporan
                      langsung diproses dan PDF dibuat otomatis. Pastikan semua
                      data sudah benar sebelum mengonfirmasi.
                    </p>
                  </div>
                </InfoCard>
              </div>
            </motion.section>

            {/* 5. PDF */}
            <motion.section
              id="pdf"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeading number={5} title="Pembuatan PDF Otomatis" />
              <p className="text-default-600 leading-relaxed mb-6">
                Setelah submit, sistem menjalankan empat proses secara berurutan
                dalam hitungan detik:
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {[
                  { n: "1", t: "Generate Unique ID",    d: "Format UPG-YYYYMMDD-XXX — menjadi kode pelacakan resmi laporan." },
                  { n: "2", t: "Simpan ke Database",    d: "Seluruh data dikirim ke server dan disimpan secara aman." },
                  { n: "3", t: "Cetak PDF Format KPK",  d: "Dokumen resmi sesuai standar KPK dibuat secara otomatis." },
                  { n: "4", t: "Tampilkan Tracking ID", d: "Notifikasi berhasil muncul beserta ID yang harus disimpan pelapor." },
                ].map((item) => (
                  <InfoCard key={item.n}>
                    <div className="flex gap-3">
                      <span className="text-2xl font-black text-primary/20 leading-none">{item.n}</span>
                      <div>
                        <p className="text-sm font-semibold mb-0.5">{item.t}</p>
                        <p className="text-xs text-default-500 leading-relaxed">{item.d}</p>
                      </div>
                    </div>
                  </InfoCard>
                ))}
              </div>

              <InfoCard variant="accent">
                <div className="flex gap-3">
                  <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-default-600 leading-relaxed">
                    <strong>Simpan Tracking ID Anda.</strong> ID ini adalah
                    satu-satunya cara memantau status laporan secara mandiri.
                    Tanpa ID ini, Anda perlu menghubungi UPG secara langsung.
                  </p>
                </div>
              </InfoCard>
            </motion.section>

            {/* 6. Status */}
            <motion.section
              id="status"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeading number={6} title="Pemantauan Status Laporan" />
              <p className="text-default-600 leading-relaxed mb-8">
                Gunakan Tracking ID untuk memantau posisi laporan Anda secara
                real-time. Terdapat empat tahapan status yang akan dilalui.
              </p>

              {/* Status pipeline */}
              <div className="relative">
                {/* Connecting line (desktop) */}
                <div className="hidden md:block absolute top-6 left-6 right-6 h-px bg-default-200 z-0" />
                <div className="grid md:grid-cols-4 gap-4 relative z-10">
                  {statusFlow.map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.4 }}
                      className={`p-4 rounded-2xl border ${s.bg} ${s.border}`}
                    >
                      <div className={`w-12 h-12 rounded-full ${s.bg} border ${s.border} flex items-center justify-center mb-3`}>
                        <span className={`text-lg font-black ${s.color}`}>{i + 1}</span>
                      </div>
                      <p className={`text-sm font-bold mb-1 ${s.color}`}>{s.label}</p>
                      <p className="text-xs text-default-500 leading-relaxed">{s.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* 7. Hak */}
            <motion.section
              id="hak"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeading number={7} title="Hak & Kewajiban Pelapor" />
              <p className="text-default-600 leading-relaxed mb-6">
                Setiap pelapor memiliki hak yang dilindungi dan kewajiban yang
                harus dipenuhi untuk memastikan proses pelaporan berjalan efektif
                dan sah.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Hak */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                    Hak Pelapor
                  </p>
                  {rights.map((r) => (
                    <InfoCard key={r.title} variant="accent">
                      <p className="text-sm font-semibold mb-1">{r.title}</p>
                      <p className="text-xs text-default-500 leading-relaxed">{r.desc}</p>
                    </InfoCard>
                  ))}
                </div>

                {/* Kewajiban */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-3">
                    Kewajiban Pelapor
                  </p>
                  {duties.map((d) => (
                    <InfoCard key={d.title}>
                      <p className="text-sm font-semibold mb-1">{d.title}</p>
                      <p className="text-xs text-default-500 leading-relaxed">{d.desc}</p>
                    </InfoCard>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* 8. Bantuan */}
            <motion.section
              id="bantuan"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeading number={8} title="Kontak Bantuan" />
              <p className="text-default-600 leading-relaxed mb-6">
                Jika menemui kendala atau membutuhkan klarifikasi, Unit
                Pengendalian Gratifikasi (UPG) siap membantu melalui saluran
                komunikasi resmi berikut.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <InfoCard variant="accent">
                  <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-2">Email</p>
                  <p className="font-mono text-sm font-semibold">upg@esdm.go.id</p>
                  <p className="text-xs text-default-500 mt-1">Disarankan untuk pertanyaan formal dan mendetail</p>
                </InfoCard>
                <InfoCard>
                  <p className="text-xs text-default-400 font-semibold uppercase tracking-widest mb-2">Telepon</p>
                  <p className="font-mono text-sm font-semibold">021-xxxx-xxxx</p>
                  <p className="text-xs text-default-500 mt-1">Tersedia pada jam kerja operasional</p>
                </InfoCard>
              </div>

              <InfoCard>
                <p className="text-sm font-semibold mb-3">Hubungi kami jika:</p>
                <div className="space-y-2">
                  {[
                    "Mengalami kendala saat pengisian formulir",
                    "Membutuhkan penjelasan tentang definisi objek gratifikasi",
                    "Memerlukan informasi terkait proses verifikasi laporan",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-xs text-default-500">
                      <Circle size={4} className="mt-1.5 shrink-0 fill-default-400 text-default-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </InfoCard>
            </motion.section>

            {/* CTA bottom */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-primary/20 bg-primary/5 p-10 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                Siap melaporkan?
              </p>
              <h3 className="text-2xl font-bold mb-3">Mulai Laporan Sekarang</h3>
              <p className="text-default-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                Proses pelaporan hanya membutuhkan beberapa menit. Identitas
                Anda dapat dilindungi sepenuhnya.
              </p>
              <a
                href="/lapor"
                className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors text-sm"
              >
                Lapor Gratifikasi <ArrowRight size={14} />
              </a>
            </motion.div>

          </main>
        </div>
      </div>
    </>
  );
}
