import { Button } from "@heroui/button";
import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";

const ReportStep = () => {
  const AnimatedSection = ({ children, delay = 0 }: any) => (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay }}
      className="w-full"
    >
      {children}
    </motion.section>
  );
  return (
    <div>
      <AnimatedSection delay={0.15}>
        <section className="relative overflow-hidden">
          <h2 className="text-2xl font-bold mb-10 text-center">
            Cara Melapor
          </h2>

          {/* GARIS TIMELINE */}
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-10 md:gap-6 border-t-4 border-primary/30 pt-10 pb-6 md:pt-14">
            {/* STEP 1 */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col items-center text-center flex-1 min-w-[180px]"
            >
              <div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md mb-3">
                📝
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base">
                Isi Data Pelaporan
              </h4>
              <p className="text-xs md:text-sm text-gray-600">
                Buka halaman <strong>Lapor Gratifikasi</strong> dan isi
                identitas serta uraian kejadian.
              </p>
            </motion.div>

            {/* STEP 2 */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col items-center text-center flex-1 min-w-[180px]"
            >
              <div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md mb-3">
                📦
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base">
                Serahkan Barang
              </h4>
              <p className="text-xs md:text-sm text-gray-600">
                Jika objek gratifikasi berupa barang, titipkan ke UPG sesuai
                prosedur.
              </p>
            </motion.div>

            {/* STEP 3 */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex flex-col items-center text-center flex-1 min-w-[180px]"
            >
              <div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md mb-3">
                📤
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base">
                Kirim ke UPG
              </h4>
              <p className="text-xs md:text-sm text-gray-600">
                Sistem otomatis meneruskan laporan ke Unit Pengendali
                Gratifikasi (UPG).
              </p>
            </motion.div>

            {/* STEP 4 */}
            <motion.div
              initial={{ opacity: 0, y: -60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex flex-col items-center text-center flex-1 min-w-[180px]"
            >
              <div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md mb-3">
                🔍
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base">
                Verifikasi oleh UPG
              </h4>
              <p className="text-xs md:text-sm text-gray-600">
                UPG akan memverifikasi, mengadministrasikan, dan menganalisis
                laporan Anda.
              </p>
            </motion.div>

            {/* STEP 5 */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="flex flex-col items-center text-center flex-1 min-w-[180px]"
            >
              <div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md mb-3">
                🏛️
              </div>
              <h4 className="font-semibold mb-1 text-sm md:text-base">
                Diteruskan ke KPK
              </h4>
              <p className="text-xs md:text-sm text-gray-600">
                Jika diperlukan, laporan Anda akan diteruskan ke KPK untuk
                penetapan status kepemilikan.
              </p>
            </motion.div>
          </div>

          {/* CTA Button */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link href="/lapor" className="no-underline">
              <Button size="lg">Laporkan Sekarang</Button>
            </Link>
            <a href="#faq" className="no-underline">
              <Button variant="shadow" size="lg">
                Lihat FAQ
              </Button>
            </a>
          </div>
        </section>
      </AnimatedSection>
    </div>
  );
};

export default ReportStep;
