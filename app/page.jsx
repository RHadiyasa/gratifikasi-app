"use client";
import { ShieldCheckIcon } from "@/components/icons";
import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { useEffect } from "react";

const title = (color) =>
  `tracking-tight inline font-semibold text-3xl sm:text-4xl md:text-5xl lg:text-7xl ${
    color === "violet" ? "text-violet-500" : "text-black dark:text-white"
  }`;

const subtitle = (extra = "") =>
  `w-full md:w-3/4 lg:w-2/3 my-2 text-base sm:text-lg md:text-xl text-default-600 block max-w-full ${extra}`;

export default function Home() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log(token ? "Ada token" : "Tidak ada token");
  }, []);

  return (
    <section className="relative flex flex-col min-h-screen items-center justify-center text-center w-full overflow-hidden">
      <p className="text-center font-semibold text-xl z-10">Inspektorat V</p>

      <div className="inline-block max-w-5xl z-10">
        <h1 className={title()}>Membangun Budaya&nbsp;</h1>
        <h1 className={title("violet")}>Sadar Gratifikasi</h1>
        <h2 className={subtitle("mt-4 mx-auto")}>
          Laporkan setiap pemberian yang tidak wajar untuk mewujudkan lingkungan
          kerja yang bersih, transparan, dan berintegritas.
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 z-10">
        <Link
          href="/lapor"
          className="flex items-center justify-center gap-2 px-6 py-3 text-white bg-violet-600 rounded-full font-semibold shadow-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-50 transition-colors"
        >
          <ShieldCheckIcon size={20} />
          Lapor Gratifikasi
        </Link>

        <Link
          href="/panduan"
          className="flex items-center justify-center px-6 py-3 rounded-full font-semibold border-2 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Lihat Panduan
        </Link>
      </div>

      <div className="mt-8 z-10">
        <Snippet hideCopyButton hideSymbol variant="flat" color="warning">
          <span className="text-yellow-800 dark:text-yellow-200 text-xs sm:text-sm">
            #UntungAdaItjen | Jaga Integritas, Tolak Gratifikasi.
          </span>
        </Snippet>
      </div>
    </section>
  );
}
