"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card } from "@heroui/card";
import { Code } from "@heroui/code";

const gratification = (props: any) => {
  const colorClass =
    props?.color === "blue"
      ? "text-blue-400"
      : "text-black dark:text-white";
  return `tracking-tight inline font-bold text-4xl ${colorClass}`;
};

const DefinitionSection = () => {
  const AnimatedSection = ({ children, delay = 0 }: any) => (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay }}
      className="w-full"
    >
      {children}
    </motion.section>
  );
  return (
    <div>
      <AnimatedSection>
        <div className="md:flex text-center w-full mx-auto item-center justify-center pb-4">
          <h1 className="text-4xl font-bold mb-3">Apa itu&nbsp;</h1>
          <h1 className={gratification({ color: "blue" })}>Gratifikasi?</h1>
        </div>
        <div id="definisi" className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="mb-3 leading-relaxed">
              Gratifikasi mencakup uang, barang, rabat/diskon, komisi, pinjaman
              tanpa bunga, tiket perjalanan, fasilitas penginapan, perjalanan
              wisata, pengobatan gratis, dan fasilitas lainnya. Gratifikasi bisa
              diberikan di dalam atau luar negeri, secara elektronik atau
              non-elektronik.
            </p>

            <p className="leading-relaxed">
              Tidak semua gratifikasi berlebihan atau melanggar hukum — tapi
              bila berkaitan dengan jabatan dan bertentangan dengan tugas, maka
              menjadi potensi korupsi dan
              <Code color="warning" className="font-semibold">
                Wajib dilaporkan!
              </Code>
            </p>
          </div>

          <div className="space-y-3">
            <Card className="p-4">
              <h4 className="font-semibold">Kapan wajib melapor?</h4>
              <p className="text-sm leading-relaxed mt-2">
                Jika gratifikasi berhubungan dengan jabatan dan berlawanan
                dengan kewajiban atau tugas Anda — laporkan ke UPG/KPK.
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold">Batas waktu pelaporan</h4>
              <p className="text-sm leading-relaxed mt-2">
                Laporan harus disampaikan paling lama 10 hari kerja sejak
                tanggal gratifikasi diterima ke UPG; atau paling lama 30 hari
                kerja ke KPK bila langsung ke KPK.
              </p>
            </Card>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
};

export default DefinitionSection;
