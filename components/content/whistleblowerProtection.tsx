"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardBody, CardHeader } from "@heroui/card";

const WhistleblowerProtection = () => {
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
    <AnimatedSection delay={0.18}>
      <section className="py-10">
        <h2 className="text-4xl font-bold mb-4">Perlindungan Pelapor</h2>
        <p className="leading-relaxed mb-3 text-lg">
          Pelapor yang beritikad baik berhak mendapatkan:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-left">
          <Card>
            <CardHeader>
              Penjelasan hak & kewajiban terkait pelaporan.
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>Informasi perkembangan laporan.</CardHeader>
          </Card>
          <Card>
            <CardHeader>
              Perlindungan sesuai ketentuan peraturan perundang-undangan.
            </CardHeader>
          </Card>
        </ul>
      </section>
    </AnimatedSection>
  );
};

export default WhistleblowerProtection;
