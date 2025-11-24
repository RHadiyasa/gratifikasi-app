import { Button } from "@heroui/button";
import { Wrench } from "lucide-react";
import Link from "next/link";
import React from "react";

const UnderConstruction = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      {/* Container Pesan */}
      <div className="mt-30 p-10 text-center w-full">
        <div className="flex justify-center mb-6">
          <Wrench className="w-16 h-16 text-yellow-500 dark:text-yellow-400 animate-bounce" />
        </div>

        <h1 className="text-4xl font-extrabold text-foreground mb-4">
          🚧 Sorry bgt ya ges yaaa 🚧
        </h1>

        <p className="text-lg text-foreground">Still under construction</p>

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

export default UnderConstruction;
