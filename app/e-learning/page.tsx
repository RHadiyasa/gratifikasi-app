"use client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { motion } from "framer-motion";
import {
  BookOpen,
  UserPlus,
  ClipboardList,
  GraduationCap,
  Download,
  Lock,
  KeyRound,
  UserX,
  WifiOff,
  RefreshCcw,
  Upload,
} from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
  const { isLoggedIn, logout } = useAuthStore();
  const steps = [
    {
      title: "1. Masuk ke LMS ACLC-KPK",
      desc: "Buka laman https://newlearning.kpk.go.id untuk mengakses portal e-learning ACLC-KPK.",
      icon: BookOpen,
      color: "from-blue-500 to-indigo-500",
    },
    {
      title: "2. Membuat Akun",
      desc: "Klik tombol Login/Register di pojok kanan atas, lalu pilih Register. Isi formulir dengan benar sesuai petunjuk, dan lakukan konfirmasi melalui email.",
      icon: UserPlus,
      color: "from-teal-500 to-emerald-500",
    },
    {
      title: "3. Mendaftar Kelas e-Learning",
      desc: "Masuk ke menu Kursus → Semua Kursus, pilih kategori Korupsi dan Penegakan Hukum, lalu masukkan Enrolment Key yang diberikan oleh pengelola UPG.",
      icon: ClipboardList,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "4. Mengerjakan Kelas e-Learning",
      desc: "Setiap kelas terdiri dari beberapa modul berisi video, artikel, latihan, dan tes akhir. Selesaikan seluruh modul secara berurutan untuk membuka sertifikat.",
      icon: GraduationCap,
      color: "from-orange-500 to-red-500",
    },
    {
      title: "5. Mengunduh Sertifikat",
      desc: "Buka Tab Penutup, lalu klik link Unduh Sertifikat Kelulusan. Sertifikat akan otomatis terunduh ke folder ‘Download’.",
      icon: Download,
      color: "from-indigo-500 to-sky-500",
    },
  ];

  const issues = [
    {
      title: "1. Sulit Login atau Tidak Dapat Login",
      desc: "Pastikan sudah memiliki akun, konfirmasi email telah dilakukan, dan pengetikan username/password benar.",
      icon: Lock,
    },
    {
      title: "2. Lupa Password",
      desc: "Gunakan fitur Forgot Password, lalu reset melalui email dengan mengikuti tautan yang dikirimkan.",
      icon: RefreshCcw,
    },
    {
      title: "3. Enrolment Key Tidak Valid",
      desc: "Periksa kembali penulisan huruf besar-kecil dan pastikan kelas yang dipilih benar.",
      icon: KeyRound,
    },
    {
      title: "4. Proses Pembuatan Akun Terkendala",
      desc: "Perhatikan pesan kesalahan berwarna merah pada form. Username tidak boleh sama dengan pengguna lain.",
      icon: UserX,
    },
    {
      title: "5. Tidak Dapat Membuka Aktivitas",
      desc: "Pastikan koneksi stabil dan aktivitas prasyarat sudah diselesaikan terlebih dahulu.",
      icon: WifiOff,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="text-center py-5 min-h-screen flex flex-col itmes-center justify-center px-6 bg-gradient-to-r from-slate-600 via-white to-sky-500 bg-clip-text text-foreground dark:text-transparent">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl font-bold mb-6"
        >
          E-Learning Pemahaman Gratifikasi
        </motion.h1>
        <div className="text-foreground">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg max-w-4xl mx-auto leading-relaxed"
          >
            E-learning disusun oleh Direktorat Gratifikasi dan Pelayanan Publik
            KPK. Untuk meningkatkan pengetahuan dan pemahaman pegawai
            negeri/Penyelenggara Negara dan masyarakat khususnya terkait
            gratifikasi dan pencegahan korupsi.
          </motion.p>
        </div>
        <div className="py-5 animate-appearance-in duration-1000 flex items-center justify-center gap-4">
          <Button
            as={Link}
            href="/e-learning/upload"
            variant="shadow"
            color="primary"
          >
            <Upload />
            Upload Sertifikat
          </Button>
          {isLoggedIn ? (
            <Button
              variant="shadow"
              color="success"
              className="text-white"
              as={Link}
              href="/e-learning/tracker"
            >
              Tracking Peserta
            </Button>
          ) : (
            <></>
          )}
        </div>
      </section>

      {/* Steps Section */}
      <div className="flex items-center justify-center">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl font-bold "
        >
          5 Tahap Pendaftaran E-Learning
        </motion.h1>
      </div>
      <section className="max-w-7xl mx-auto px-8 lg:px-20 py-24 space-y-32">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className={`flex flex-col lg:flex-row items-center gap-12 ${
                index % 2 === 0 ? "" : "lg:flex-row-reverse"
              }`}
            >
              <div className="lg:w-1/2 flex justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 0.5, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className={`w-48 h-48 bg-gradient-to-br ${step.color} flex items-center justify-center rounded-3xl shadow-lg`}
                >
                  <Icon className="w-24 h-24" strokeWidth={1.5} />
                </motion.div>
              </div>
              <div className="lg:w-1/2 space-y-4">
                <h2 className="text-3xl font-semibold ">{step.title}</h2>
                <p className="text-lg leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Divider */}
      <div className="py-5 text-center">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="text-4xl font-bold"
        >
          Kendala yang Sering Ditemui
        </motion.h2>
        <p className="mt-4 text-lg">
          Berikut beberapa kendala umum dan cara mengatasinya selama proses
          e-learning.
        </p>
      </div>

      {/* Issues Section */}
      <section className="max-w-6xl mx-auto px-8 lg:px-20 grid md:grid-cols-2 lg:grid-cols-3 gap-10 py-20">
        {issues.map((issue, i) => {
          const Icon = issue.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="rounded-3xl shadow-md p-8 hover:shadow-xl border transition transform hover:-translate-y-1"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full">
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold">{issue.title}</h3>
              </div>
              <p className="leading-relaxed">{issue.desc}</p>
            </motion.div>
          );
        })}
      </section>

      {/* Footer Help */}
      <footer className="text-center py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-2xl font-semibold mb-2">
            Butuh Bantuan? Hubungi Helpdesk ACLC-KPK
          </p>
          <p className="text-sm">
            Layanan Online (08.00–16.00 WIB) atau Virtual (di luar jam kerja)
          </p>
        </motion.div>
      </footer>
    </div>
  );
}
