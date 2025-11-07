"use client";
import { Card } from "@heroui/card";
import { motion } from "framer-motion";
import React from "react";

const DasarHukum = () => {
  const AnimatedSection = ({ children, delay = 0 }) => (
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
      <AnimatedSection delay={0.05}>
        <section className="relative">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Dasar Hukum & Rujukan
          </h2>

          {/* Garis timeline di tengah */}
          <div className="relative border-l-4 border-primary/30 ml-6 space-y-12">
            {/* Milestone 1 */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative pl-8"
            >
              <div className="absolute -left-[22px] top-0 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md">
                🧩
              </div>
              <Card className="p-4 shadow-md">
                <h4 className="font-semibold mb-1">
                  2021 – Peraturan Menteri ESDM No. 3
                </h4>
                <p className="text-sm leading-relaxed">
                  Tentang Pengendalian Gratifikasi di lingkungan Kementerian
                  Energi dan Sumber Daya Mineral, sebagai panduan utama
                  pencegahan korupsi berbasis pelaporan gratifikasi.
                </p>
              </Card>
            </motion.div>

            {/* Milestone 2 */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="relative pl-8"
            >
              <div className="absolute -left-[22px] top-0 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md">
                ⚖️
              </div>
              <Card className="p-4 shadow-md">
                <h4 className="font-semibold mb-1">
                  2019 – Peraturan KPK No. 2
                </h4>
                <p className="text-sm leading-relaxed">
                  Mengatur mekanisme pelaporan gratifikasi secara nasional,
                  termasuk format dan tata cara pelaporan yang digunakan oleh
                  UPG.
                </p>
              </Card>
            </motion.div>

            {/* Milestone 3 */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative pl-8"
            >
              <div className="absolute -left-[22px] top-0 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md">
                🏛️
              </div>
              <Card className="p-4 shadow-md">
                <h4 className="font-semibold mb-1">
                  Undang-Undang Tipikor (UU No. 31 Tahun 1999 jo. UU No. 20
                  Tahun 2001)
                </h4>
                <p className="text-sm leading-relaxed">
                  Menjadi dasar hukum bagi gratifikasi yang dianggap suap
                  apabila tidak dilaporkan dan memiliki kaitan dengan jabatan.
                </p>
              </Card>
            </motion.div>

            {/* Milestone 4 */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="relative pl-8"
            >
              <div className="absolute -left-[22px] top-0 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md">
                🧰
              </div>
              <Card className="p-4 shadow-md">
                <h4 className="font-semibold mb-1">
                  Unit Pengendali Gratifikasi (UPG)
                </h4>
                <p className="text-sm leading-relaxed">
                  UPG berperan menerima, menganalisis, dan meneruskan laporan
                  gratifikasi ke KPK serta menjaga bukti titipan sesuai
                  prosedur.
                </p>
              </Card>
            </motion.div>
          </div>
        </section>
      </AnimatedSection>
    </div>
  );
};

export default DasarHukum;
