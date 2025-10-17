"use client";

import { motion } from "framer-motion";
import { Button, Card } from "@heroui/react";
import Link from "next/link";
import DefinitionSection from "./content/definition";
import DasarHukum from "./content/dasarHukum";
import ReportStep from "./content/report";
import WhistleblowerProtection from "./content/whistleblowerProtection";

const AnimatedSection = ({ children, delay = 0 }: any) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.6, delay }}
    className="w-full"
  >
    {children}
  </motion.section>
);

/**
 * Konten diringkas & disederhanakan dari:
 * "Draft Juknis Pengendalian Gratifikasi (V.1)" (dokumen user).
 * Semua istilah penting tetap dipertahankan (definisi, kewajiban, objek, mekanisme, UPG, sanksi).
 */

export const SosialisasiPage = () => {
  return (
    <main className="min-h-screen bg-background text-foreground mx-auto">
      {/* HERO */}
      <header className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1"
          >
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Waspada Gratifikasi
            </h1>
            <p className="text-lg mb-6 leading-relaxed">
              Pelajari apa itu gratifikasi, kapan harus dilaporkan, siapa yang
              memproses laporan, dan bagaimana cara pelaporannya menurut
              Petunjuk Teknis Pengendalian Gratifikasi di lingkungan Kementerian
              Energi dan Sumber Daya Mineral.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/lapor" className="no-underline">
                <Button size="lg">Laporkan Gratifikasi</Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9 }}
            className="flex-1"
          >
            <Card className="p-6 shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Ingat</h3>
              <p className="leading-relaxed">
                Gratifikasi bukan selalu tindak pidana — namun bila berkaitan
                dengan jabatan dan berlawanan dengan tugas, wajib dilaporkan.
                Jika ragu, laporkan ke Unit Pengendali Gratifikasi (UPG) atau
                langsung ke KPK.
              </p>
            </Card>
          </motion.div>
        </div>
        {/* subtle decorative background */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0.08 }}
          animate={{ opacity: 0.08 }}
          className="absolute inset-0 pointer-events-none"
        />
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-14">
        {/* DEFINISI */}
        <DefinitionSection />

        {/* DASAR HUKUM */}
        <DasarHukum />

        {/* CONTOH GRATIFIKASI */}
        <AnimatedSection delay={0.1}>
          <section>
            <h2 className="text-2xl font-bold mb-4">
              Contoh: Yang Wajib & Tidak Wajib Dilaporkan
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-5">
                <h4 className="font-semibold mb-3">✅ Yang Wajib Dilaporkan</h4>
                <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
                  <li>
                    Hadiah/uang yang berkaitan dengan jabatan dan bertentangan
                    tugas.
                  </li>
                  <li>
                    Komisi, rabat/diskon khusus yang mempengaruhi keputusan
                    kedinasan.
                  </li>
                  <li>
                    Fasilitas perjalanan/akomodasi yang berhubungan dengan tugas
                    yang dapat menimbulkan benturan kepentingan.
                  </li>
                </ul>
              </Card>

              <Card className="p-5">
                <h4 className="font-semibold mb-3">
                  ❌ Yang Tidak Wajib Dilaporkan
                </h4>
                <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
                  <li>
                    Pemberian dari keluarga dekat (selama tidak ada benturan
                    kepentingan).
                  </li>
                  <li>
                    Perangkat seminar peserta yang bersifat umum dan tidak
                    khusus untuk pejabat.
                  </li>
                  <li>
                    Hadiah promosi atau suvenir berlogo tanpa nilai khusus,
                    asalkan tidak menimbulkan benturan kepentingan.
                  </li>
                  <li>
                    Hadiah kecil antar rekan kerja dengan batasan nilai yang
                    ditetapkan juknis.
                  </li>
                </ul>
              </Card>
            </div>
          </section>
        </AnimatedSection>

        {/* CARA MELAPOR */}
        <ReportStep />

        {/* PERLINDUNGAN PELAPOR */}
        <WhistleblowerProtection />

        {/* FAQ */}
        <AnimatedSection delay={0.22}>
          <section id="faq">
            <h2 className="text-2xl font-bold mb-4">FAQ — Pertanyaan Umum</h2>

            <div className="space-y-3">
              <details className="p-4 bg-white rounded-lg shadow">
                <summary className="font-semibold cursor-pointer text-background">
                  Apakah semua gratifikasi harus dilaporkan?
                </summary>
                <div className="mt-2 text-sm leading-relaxed text-background">
                  Tidak semua — tetapi jika gratifikasi berkaitan dengan jabatan
                  dan dapat mempengaruhi pelaksanaan tugas, wajib dilaporkan.
                  Jika ragu, laporkan ke UPG.
                </div>
              </details>

              <details className="p-4 bg-white rounded-lg shadow">
                <summary className="font-semibold cursor-pointer text-background">
                  Berapa lama waktu saya untuk melapor?
                </summary>
                <div className="mt-2 text-sm leading-relaxed text-background">
                  Laporan harus disampaikan paling lama 10 hari kerja sejak
                  tanggal penerimaan ke UPG; atau paling lama 30 hari kerja
                  langsung ke KPK.
                </div>
              </details>

              <details className="p-4 bg-white rounded-lg shadow">
                <summary className="font-semibold cursor-pointer text-background">
                  Apa konsekuensi jika tidak melapor?
                </summary>
                <div className="mt-2 text-sm leading-relaxed text-background">
                  Pegawai yang tidak melaporkan bisa dikenai sanksi disiplin
                  dan/atau pidana sesuai peraturan perundang-undangan.
                </div>
              </details>
            </div>
          </section>
        </AnimatedSection>

        {/* CTA */}
        <AnimatedSection delay={0.26}>
          <section className="text-center py-8">
            <h3 className="text-2xl font-bold mb-3">
              Jaga Integritas — Laporkan Gratifikasi
            </h3>
            <p className="mb-6 text-sm leading-relaxed max-w-2xl mx-auto">
              Dengan melaporkan gratifikasi, Anda membantu menjaga tata kelola
              yang bersih, transparan, dan akuntabel. Setiap laporan akan
              diproses oleh UPG sesuai prosedur.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/lapor" className="no-underline">
                <Button size="lg">Laporkan Sekarang</Button>
              </Link>
              <Button variant="ghost" size="lg">
                Pelajari Lagi
              </Button>
            </div>
          </section>
        </AnimatedSection>

        {/* Footer note */}
        <footer className="text-center text-xs text-gray-500 py-6">
          Dokumen sumber: Draft Petunjuk Teknis Pengendalian Gratifikasi —
          Keputusan Inspektur Jenderal (ringkasan untuk tujuan sosialisasi)
        </footer>
      </div>
    </main>
  );
};
