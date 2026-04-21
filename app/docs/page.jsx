"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useSpring, AnimatePresence } from "framer-motion";
import {
  Target,
  Workflow,
  ClipboardList,
  ShieldCheck,
  FileText,
  BarChart2,
  Scale,
  Phone,
  Info,
  FileSpreadsheet,
  Search,
  ListChecks,
  Layers,
  Play,
  Eye,
  Table2,
  Activity,
  Zap,
  HelpCircle,
  Wrench,
} from "lucide-react";

import PanduanPelaporan, { pelaporanSections } from "@/components/content/panduanPelaporan";
import PanduanLkeChecker, { lkeCheckerSections } from "@/components/content/panduanLkeChecker";

// ─── Icon maps for sidebar ──────────────────────────────────────────────────

const pelaporanIcons = {
  tujuan: Target,
  alur: Workflow,
  form: ClipboardList,
  konfirmasi: ShieldCheck,
  pdf: FileText,
  status: BarChart2,
  hak: Scale,
  bantuan: Phone,
};

const lkeCheckerIcons = {
  "lke-apa": Info,
  "lke-alur": Workflow,
  "lke-input": ClipboardList,
  "lke-preprocessing": Wrench,
  "lke-struktur": Layers,
  "lke-jalankan": Play,
  "lke-hasil": Eye,
  "lke-visa": Table2,
  "lke-status": Activity,
  "lke-fitur": Zap,
  "lke-faq": HelpCircle,
};

// ─── Tabs config ─────────────────────────────────────────────────────────────

const tabs = [
  {
    key: "pelaporan",
    label: "Panduan Pelaporan",
    shortLabel: "Pelaporan",
    desc: "Cara melapor gratifikasi",
    icon: ShieldCheck,
    heroTitle: <>Panduan Pelaporan<br /><span className="text-primary">Gratifikasi</span></>,
    heroDesc: "Panduan lengkap penggunaan sistem pelaporan gratifikasi Inspektorat V \u2014 dari pengisian form hingga pemantauan status laporan.",
  },
  {
    key: "lke",
    label: "Panduan LKE Checker",
    shortLabel: "LKE Checker",
    desc: "Cara cek data dukung ZI",
    icon: FileSpreadsheet,
    heroTitle: <>Panduan Pengecekan<br /><span className="text-primary">Data Dukung LKE</span></>,
    heroDesc: "Panduan lengkap penggunaan AI Checker untuk memeriksa kelengkapan dan kesesuaian dokumen Zona Integritas \u2014 dari input sheet hingga membaca hasil.",
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState("pelaporan");
  const [activeSection, setActiveSection] = useState("");

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  const currentTab = tabs.find((t) => t.key === activeTab);
  const sections = activeTab === "pelaporan" ? pelaporanSections : lkeCheckerSections;
  const iconMap = activeTab === "pelaporan" ? pelaporanIcons : lkeCheckerIcons;

  // Intersection observer for active section
  useEffect(() => {
    setActiveSection(sections[0]?.id || "");
    const observers = [];
    // Small delay to let DOM render
    const timer = setTimeout(() => {
      sections.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const obs = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) setActiveSection(id);
          },
          { rootMargin: "-30% 0px -60% 0px" },
        );
        obs.observe(el);
        observers.push(obs);
      });
    }, 100);
    return () => {
      clearTimeout(timer);
      observers.forEach((o) => o.disconnect());
    };
  }, [activeTab]);

  return (
    <>
      {/* Reading progress bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-0.5 bg-primary origin-left z-50"
      />

      <div className="min-h-screen">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative px-6 pt-16 pb-8 overflow-hidden border-b border-default-100">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--heroui-primary)/0.12),transparent)]" />
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary border border-primary/25 rounded-full px-3 py-1 mb-5">
                <Info size={11} /> Dokumentasi
              </span>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                    {currentTab.heroTitle}
                  </h1>
                  <p className="text-default-500 text-lg max-w-xl leading-relaxed">
                    {currentTab.heroDesc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* ── Tab Switcher ──────────────────────────────────── */}
            <div className="flex gap-3 mt-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`
                      relative flex items-center gap-2.5 px-5 py-3 rounded-2xl border text-sm font-medium
                      transition-all duration-200 outline-none
                      ${isActive
                        ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                        : "bg-default-50 dark:bg-default-100/5 border-default-200 text-default-500 hover:text-foreground hover:border-default-300 hover:bg-default-100/60"
                      }
                    `}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute -bottom-px left-4 right-4 h-0.5 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Layout ────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[220px_1fr] gap-12">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-default-400 mb-4 px-3">
                Daftar Isi
              </p>
              {sections.map(({ id, label }) => {
                const active = activeSection === id;
                const Icon = iconMap[id] || Search;
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-default-500 hover:text-foreground hover:bg-default-100/60"
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span>{label}</span>
                    {active && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="ml-auto w-1 h-1 rounded-full bg-primary"
                      />
                    )}
                  </a>
                );
              })}
            </div>
          </aside>

          {/* ── Content ─────────────────────────────────────────── */}
          <main>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === "pelaporan" ? <PanduanPelaporan /> : <PanduanLkeChecker />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
}
