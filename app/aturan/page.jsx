import React from "react";
import { Wrench } from "lucide-react"; // Menggunakan ikon kunci pas dari Lucide React
import { Button } from "@heroui/button";
import Link from "next/link";

const RulesPage = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      {/* Container Pesan */}
      <div className="mt-30 p-10 text-center max-w-lg w-full">
        {/* Ikon Kunci Pas */}
        <div className="flex justify-center mb-6">
          <Wrench className="w-16 h-16 text-yellow-700 dark:text-yellow-400 animate-bounce" />
        </div>

        {/* Judul Utama */}
        <h1 className="text-4xl font-extrabold text-foreground mb-4">
          🚧 Sorry ya ges yaaa 🚧
        </h1>

        {/* Deskripsi */}
        <p className="text-lg text-foreground">Still under construction</p>

        {/* Opsional: Tombol Kembali */}
        <Button
          as={Link}
          href="/"
          className="mt-8 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300"
        >
          Kembali ke Halaman Sebelumnya
        </Button>
      </div>
    </div>
  );
};

export default RulesPage;
