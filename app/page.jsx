"use client";
import { SosialisasiPage } from "@/components/sosialisasi";
import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { useEffect } from "react";

// Style utilities
const title = (props) => {
  const colorClass =
    props?.color === "violet"
      ? "text-violet-500"
      : "text-black dark:text-white";
  return `tracking-tight inline font-semibold text-3xl sm:text-4xl md:text-5xl lg:text-7xl ${colorClass}`;
};

const subtitle = (props) => {
  return `w-full md:w-3/4 lg:w-2/3 my-2 text-base sm:text-lg md:text-xl text-default-600 block max-w-full ${props?.class || ""}`;
};

// Icon
const ShieldCheckIcon = ({ size = 20, ...props }) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default function Home() {
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      console.log("Ada");
    } else {
      console.log("Ga ada ");
    }
  }, []);
  return (
    <section className="flex flex-col items-center justify-center text-center w-full ">
      <div className="min-h-screen flex flex-col items-center justify-center">
        {/* Hero Title */}
        <p className="text-center font-semibold text-xl">Inspektorat V</p>
        <div className="inline-block max-w-5xl">
          <h1 className={title()}>Membangun Budaya&nbsp;</h1>
          <h1 className={title({ color: "violet" })}>Sadar Gratifikasi</h1>

          <h2 className={subtitle({ class: "mt-4 mx-auto" })}>
            Laporkan setiap pemberian yang tidak wajar untuk mewujudkan
            lingkungan kerja yang bersih, transparan, dan berintegritas.
          </h2>
        </div>
        <div className="flex-row mt-4 items-center justify-center">
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center">
            <Link
              href="/lapor"
              className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto text-white bg-violet-600 rounded-full font-semibold shadow-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-50 transition-colors"
            >
              <ShieldCheckIcon size={20} />
              Lapor Gratifikasi
            </Link>

            <Link
              href="/panduan"
              className="flex items-center justify-center px-6 py-3 w-full sm:w-auto rounded-full font-semibold border-2 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Lihat Panduan
            </Link>
          </div>

          {/* Snippet */}
          <div className="mt-8">
            <Snippet hideCopyButton hideSymbol variant="flat" color="warning">
              <span className="text-yellow-800 dark:text-yellow-200 text-xs sm:text-sm">
                #UntungAdaItjen | Jaga Integritas, Tolak Gratifikasi.
              </span>
            </Snippet>
          </div>
        </div>
      </div>

      {/* Sosialisasi Section */}
      <div className="mt-16 w-full max-w-6xl">
        <SosialisasiPage />
      </div>
    </section>
  );
}
