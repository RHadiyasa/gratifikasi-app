"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Building2,
  User,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
  X,
  FileText,
  Mail,
  RotateCcw,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  RefreshCcw,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button, Input } from "@heroui/react";
import { VisaBrandMark } from "@/components/visa-brand";
import { fuzzyFind } from "@/lib/elearning/fuzzy-match";

// ────────────────────────────────────────────────────────────────────────────
// Animations
// ────────────────────────────────────────────────────────────────────────────

const stepVariants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};
const stepTransition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const MAX_SIZE_MB = 5;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatTanggal(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function PreviewCertButton({ nip, label = "Lihat Sertifikat Sebelumnya" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePreview = async () => {
    if (!nip) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/elearning/peserta-preview", { nip });
      const url = res.data?.url;
      if (!url) throw new Error("URL preview tidak tersedia.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Gagal memuat sertifikat.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="flat"
        color="primary"
        isDisabled={loading}
        startContent={
          loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Eye size={14} />
          )
        }
        endContent={!loading && <ExternalLink size={12} />}
        onPress={handlePreview}
      >
        {loading ? "Memuat..." : label}
      </Button>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  if (status === "Diverifikasi") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
        <ShieldCheck size={10} />
        Diverifikasi
      </span>
    );
  }
  if (status === "Sudah") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
        <CheckCircle2 size={10} />
        Sudah Upload
      </span>
    );
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Visa Persona — chat-style bubble
// ────────────────────────────────────────────────────────────────────────────

function VisaBubble({ children, tone = "default", typing = false }) {
  const toneClass = {
    default: "border-primary/20 bg-primary/5 text-foreground",
    success: "border-green-500/25 bg-green-500/5 text-foreground",
    warning: "border-amber-500/25 bg-amber-500/5 text-foreground",
    danger: "border-red-500/25 bg-red-500/5 text-foreground",
  }[tone];

  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-0.5">
        <div className="relative">
          <VisaBrandMark className="h-8 w-8 rounded-xl" imageClassName="rounded-xl" />
          <motion.span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-background"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`relative rounded-2xl rounded-tl-md border px-4 py-3 text-sm leading-relaxed ${toneClass}`}
      >
        <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-1 flex items-center gap-1">
          <Sparkles size={10} />
          Visa
        </div>
        <div>{children}</div>
        {typing && (
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary/60"
                animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stepper
// ────────────────────────────────────────────────────────────────────────────

function Stepper({ step }) {
  const labels = ["Unit", "Nama", "Upload"];
  return (
    <div className="flex items-center justify-center gap-2">
      {labels.map((label, i) => {
        const idx = i + 1;
        const active = step === idx;
        const done = step > idx;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <motion.div
                layout
                className={`flex items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                  done
                    ? "w-6 h-6 bg-emerald-500 text-white"
                    : active
                      ? "w-6 h-6 bg-primary text-primary-foreground ring-4 ring-primary/15"
                      : "w-6 h-6 bg-default-100 text-default-400"
                }`}
              >
                {done ? <CheckCircle2 size={12} /> : idx}
              </motion.div>
              <span
                className={`text-xs font-semibold ${
                  active ? "text-foreground" : "text-default-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className="w-6 h-px bg-default-200" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function UploadCertificate() {
  // Settings (feature flag + cohort label + admin contact)
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Peserta picker data (filtered to active cohort by server)
  const [data, setData] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(true);
  const [pickerInfo, setPickerInfo] = useState({
    hasActiveCohort: true,
    cohort: null,
    adminContact: "Hubungi Admin E-Learning Inspektorat V Itjen ESDM.",
    message: null,
  });

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedPeserta, setSelectedPeserta] = useState(null);

  // ── Effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/elearning/settings");
        setSettings(res.data?.data ?? null);
      } catch {
        setSettings({ uploadEnabled: true });
      } finally {
        setSettingsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/elearning/peserta-picker");
        const body = res.data ?? {};
        setPickerInfo({
          hasActiveCohort: body.hasActiveCohort,
          cohort: body.cohort ?? null,
          adminContact:
            body.adminContact ||
            "Hubungi Admin E-Learning Inspektorat V Itjen ESDM.",
          message: body.message ?? null,
        });
        setData(Array.isArray(body.data) ? body.data : []);
      } catch (err) {
        console.error("Gagal memuat data peserta:", err);
      } finally {
        setPickerLoading(false);
      }
    })();
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────
  const uploadEnabled = settings?.uploadEnabled !== false;
  const unitList = useMemo(() => {
    const set = new Set(
      data.map((p) => (p.unit_eselon_i ?? "").toString().trim()).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [data]);

  const cohortLabel =
    pickerInfo.cohort?.tahun && pickerInfo.cohort?.batch
      ? `Batch ${pickerInfo.cohort.batch} · ${pickerInfo.cohort.tahun}`
      : null;

  const pesertaInUnit = useMemo(
    () =>
      data.filter(
        (p) =>
          (p.unit_eselon_i ?? "").toString().trim() ===
          selectedUnit.toString().trim()
      ),
    [data, selectedUnit]
  );

  // ── Handlers ──────────────────────────────────────────────────────────
  const handlePickUnit = (unit) => {
    setSelectedUnit(unit);
    setSelectedPeserta(null);
    setStep(2);
  };
  const handlePickPeserta = (peserta) => {
    setSelectedPeserta(peserta);
    setStep(3);
  };
  const resetAll = () => {
    setSelectedUnit("");
    setSelectedPeserta(null);
    setStep(1);
  };

  // ── Loading / Disabled gates ──────────────────────────────────────────
  if (settingsLoading || pickerLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-32">
        <Loader2 className="w-8 h-8 animate-spin text-default-400" />
        <p className="text-sm text-default-400 mt-3">Memuat...</p>
      </div>
    );
  }

  if (!uploadEnabled) {
    return (
      <FullPageNotice
        icon={<Lock size={24} className="text-amber-500" />}
        title="Upload Sertifikat Tidak Tersedia"
        body={
          settings?.uploadDisabledMessage ||
          "Fitur upload sertifikat sedang tidak tersedia."
        }
        footer={
          settings?.deadlineUpload && (
            <p className="text-xs text-default-400 mt-4 flex items-center justify-center gap-1.5">
              <Calendar size={12} />
              Deadline:{" "}
              {new Date(settings.deadlineUpload).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )
        }
      />
    );
  }

  if (!pickerInfo.hasActiveCohort) {
    return (
      <FullPageNotice
        icon={<Lock size={24} className="text-amber-500" />}
        title="Belum Ada Batch Aktif"
        body={
          pickerInfo.message || "Cohort aktif belum ditetapkan oleh admin."
        }
      />
    );
  }

  // ── Render wizard ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8 space-y-3"
        >
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Upload Sertifikat
          </h1>
          {cohortLabel && (
            <p className="text-sm text-default-500">
              Cohort aktif:{" "}
              <span className="text-primary font-semibold">{cohortLabel}</span>
            </p>
          )}
          <Stepper step={step} />
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step1Unit
              key="step1"
              units={unitList}
              onPick={handlePickUnit}
              hasData={data.length > 0}
              adminContact={pickerInfo.adminContact}
            />
          )}
          {step === 2 && (
            <Step2Name
              key="step2"
              peserta={pesertaInUnit}
              selectedUnit={selectedUnit}
              adminContact={pickerInfo.adminContact}
              onConfirm={handlePickPeserta}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && selectedPeserta && (
            <Step3Upload
              key="step3"
              peserta={selectedPeserta}
              selectedUnit={selectedUnit}
              onBack={() => setStep(2)}
              onReset={resetAll}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FullPageNotice
// ────────────────────────────────────────────────────────────────────────────

function FullPageNotice({ icon, title, body, footer }) {
  return (
    <div className="flex flex-col items-center justify-center mt-32 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-xl w-full rounded-3xl border border-amber-500/30 bg-amber-500/5 p-10 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 mx-auto mb-5 flex items-center justify-center">
          {icon}
        </div>
        <h1 className="text-2xl font-bold mb-3">{title}</h1>
        <p className="text-default-500 leading-relaxed">{body}</p>
        {footer}
      </motion.div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 1 — Pilih Unit
// ────────────────────────────────────────────────────────────────────────────

function Step1Unit({ units, onPick, hasData, adminContact }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => u.toLowerCase().includes(q));
  }, [units, query]);

  return (
    <motion.section
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={stepTransition}
      className="space-y-5"
    >
      <VisaBubble>
        Hai 👋 Saya Visa, asisten e-learning kamu. Yuk mulai dengan{" "}
        <strong>memilih unit Eselon 1</strong>{" "}
        tempat kamu bertugas.
      </VisaBubble>

      <div className="rounded-3xl border border-default-200/60 bg-background p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building2 size={16} className="text-primary" />
          Unit Eselon 1
        </div>

        <Input
          placeholder="Cari unit..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          startContent={<Search size={14} className="text-default-400" />}
          variant="bordered"
          size="md"
        />

        {!hasData && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
            Belum ada peserta terdaftar pada cohort aktif. {adminContact}
          </div>
        )}

        <div className="max-h-[340px] overflow-y-auto space-y-1.5 -mx-1 px-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-default-400 text-center py-6">
              Tidak ada unit yang cocok dengan "{query}".
            </p>
          ) : (
            filtered.map((u, idx) => (
              <motion.button
                key={u}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                onClick={() => onPick(u)}
                className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-default-200 hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <span className="text-sm font-medium truncate">{u}</span>
                <ArrowRight
                  size={14}
                  className="text-default-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </motion.button>
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 2 — Tulis Nama (Visa verify)
// ────────────────────────────────────────────────────────────────────────────

function Step2Name({ peserta, selectedUnit, adminContact, onConfirm, onBack }) {
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searching, setSearching] = useState(false);

  // Debounce query for "typing" feel
  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQ("");
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      setDebouncedQ(query.trim());
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const candidates = useMemo(() => {
    if (!debouncedQ) return [];
    return fuzzyFind(debouncedQ, peserta, (p) => p.nama, { limit: 5 });
  }, [debouncedQ, peserta]);

  const exact = candidates.find((c) => c.matchKind === "exact");
  const hasResults = candidates.length > 0;
  const nothingFound = debouncedQ && !hasResults && !searching;

  // ── Visa bubble content based on state ───────────────────────────────
  let bubbleNode;
  let bubbleTone = "default";
  if (!query.trim()) {
    bubbleNode = (
      <>
        Pilih unit: <strong>{selectedUnit}</strong>. Sekarang{" "}
        <strong>ketik nama lengkap</strong> kamu — saya akan bantu cek
        apakah terdaftar.
      </>
    );
  } else if (searching) {
    bubbleNode = <>Sebentar, lagi cari nama "{query}"...</>;
  } else if (exact) {
    bubbleNode = (
      <>
        Ketemu! 🎉 Hai <strong>{exact.item.nama}</strong>, klik tombol{" "}
        <strong>Konfirmasi</strong> di bawah untuk lanjut ke upload sertifikat.
      </>
    );
    bubbleTone = "success";
  } else if (hasResults) {
    bubbleNode = (
      <>
        Hmm, saya tidak menemukan nama persis "{debouncedQ}". Mungkin maksudmu
        salah satu di bawah ini? Klik salah satu nama untuk memilih.
      </>
    );
    bubbleTone = "warning";
  } else if (nothingFound) {
    bubbleNode = (
      <>
        Maaf, saya tidak menemukan <strong>{debouncedQ}</strong> di unit{" "}
        <strong>{selectedUnit}</strong>. Coba periksa ejaan, atau hubungi admin
        kalau nama kamu memang belum terdaftar.
      </>
    );
    bubbleTone = "danger";
  }

  return (
    <motion.section
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={stepTransition}
      className="space-y-5"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={
            !query.trim()
              ? "idle"
              : searching
                ? "searching"
                : exact
                  ? "exact"
                  : hasResults
                    ? "suggest"
                    : "notfound"
          }
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <VisaBubble tone={bubbleTone} typing={searching}>
            {bubbleNode}
          </VisaBubble>
        </motion.div>
      </AnimatePresence>

      <div className="rounded-3xl border border-default-200/60 bg-background p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User size={16} className="text-primary" />
          Nama Lengkap
        </div>

        <Input
          autoFocus
          placeholder="Ketik nama lengkap kamu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          startContent={<Search size={14} className="text-default-400" />}
          endContent={
            searching ? (
              <Loader2 size={14} className="animate-spin text-default-400" />
            ) : null
          }
          variant="bordered"
          size="md"
        />

        {/* Suggestions list */}
        <AnimatePresence>
          {hasResults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-1.5 overflow-hidden"
            >
              {candidates.map((c, idx) => {
                const isExact = c.matchKind === "exact";
                const status = c.item.statusCourse;
                return (
                  <motion.button
                    key={c.item.nip || c.item._id || idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => onConfirm(c.item)}
                    className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all group ${
                      isExact
                        ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10"
                        : "border-default-200 hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">
                          {c.item.nama}
                        </p>
                        <StatusChip status={status} />
                      </div>
                      <p className="text-xs text-default-400 truncate mt-0.5">
                        NIP {c.item.nip}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isExact && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                          Cocok
                        </span>
                      )}
                      <ArrowRight
                        size={14}
                        className="text-default-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Not found — admin contact */}
        <AnimatePresence>
          {nothingFound && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex gap-3 items-start"
            >
              <Mail size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-red-600 dark:text-red-400 mb-1">
                  Nama tidak ditemukan
                </p>
                <p className="text-default-500 leading-relaxed">
                  {adminContact}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between">
        <Button
          variant="flat"
          startContent={<ArrowLeft size={14} />}
          onPress={onBack}
        >
          Ganti Unit
        </Button>
      </div>
    </motion.section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 3 — Upload
// ────────────────────────────────────────────────────────────────────────────

function Step3Upload({ peserta, selectedUnit, onBack, onReset }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  const initialStatus = peserta.statusCourse;
  // Gate: kalau status sudah Sudah & belum konfirmasi mau ganti → tampilkan banner
  const [confirmReplace, setConfirmReplace] = useState(
    initialStatus !== "Sudah"
  );

  // Locked total kalau sudah diverifikasi
  if (initialStatus === "Diverifikasi") {
    return (
      <motion.section
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={stepTransition}
        className="space-y-5"
      >
        <VisaBubble tone="default">
          Hai <strong>{peserta.nama}</strong>! Sertifikat kamu{" "}
          <strong>sudah diverifikasi</strong> oleh admin pada{" "}
          {formatTanggal(peserta.uploaded_at)}. Status final — tidak perlu
          upload ulang. 🎉
        </VisaBubble>

        <div className="rounded-3xl border border-purple-500/30 bg-purple-500/5 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 mx-auto flex items-center justify-center">
            <ShieldCheck size={24} className="text-purple-500" />
          </div>
          <h2 className="text-xl font-bold">Sertifikat Sudah Diverifikasi</h2>
          <p className="text-sm text-default-500 leading-relaxed max-w-md mx-auto">
            Karena sudah dicek dan disetujui oleh admin, sertifikat tidak bisa
            diganti dari sini. Hubungi Admin E-Learning kalau ada keperluan
            mengganti.
          </p>
          <div className="flex justify-center pt-2">
            <PreviewCertButton nip={peserta.nip} label="Lihat Sertifikat Saya" />
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="flat"
            startContent={<ArrowLeft size={14} />}
            onPress={onBack}
          >
            Ganti Nama
          </Button>
          <Button
            color="primary"
            variant="flat"
            startContent={<RotateCcw size={14} />}
            onPress={onReset}
          >
            Mulai Lagi
          </Button>
        </div>
      </motion.section>
    );
  }

  // Confirm-to-replace screen kalau sudah upload tapi belum diverifikasi
  if (!confirmReplace) {
    return (
      <motion.section
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={stepTransition}
        className="space-y-5"
      >
        <VisaBubble tone="warning">
          Eh tunggu! Saya lihat <strong>{peserta.nama}</strong> sudah upload
          sertifikat pada <strong>{formatTanggal(peserta.uploaded_at)}</strong>.
          Yakin mau <strong>menggantinya</strong>?
        </VisaBubble>

        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <ShieldAlert size={18} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm mb-1">
                Sudah Upload Sertifikat
              </p>
              <p className="text-xs text-default-500 leading-relaxed">
                Diupload pada {formatTanggal(peserta.uploaded_at)} dan saat ini
                sedang menunggu verifikasi admin. Kalau kamu lanjut upload, file
                sebelumnya akan diganti.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-default-200 bg-background p-3 text-xs text-default-500 leading-relaxed">
            💡 Cukup ganti hanya jika file sebelumnya{" "}
            <strong>salah upload</strong> atau <strong>kurang jelas</strong>.
            Kalau sudah benar, kamu tidak perlu upload ulang.
          </div>

          <div className="pt-1">
            <PreviewCertButton nip={peserta.nip} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <Button
            variant="flat"
            startContent={<ArrowLeft size={14} />}
            onPress={onBack}
          >
            Ganti Nama
          </Button>
          <Button
            color="warning"
            variant="shadow"
            startContent={<RefreshCcw size={14} />}
            onPress={() => setConfirmReplace(true)}
          >
            Ya, Ganti File Sertifikat
          </Button>
        </div>
      </motion.section>
    );
  }

  const handleSelectFile = useCallback((f) => {
    setErrorMsg("");
    if (!f) return;
    if (f.type !== "application/pdf") {
      setErrorMsg("Hanya file PDF yang diperbolehkan.");
      setPhase("error");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`Ukuran file maksimal ${MAX_SIZE_MB} MB.`);
      setPhase("error");
      return;
    }
    setFile(f);
    setPhase("idle");
  }, []);

  const handleUpload = async () => {
    if (!file || !peserta?.nip) return;
    setPhase("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      // 1. Get presigned URL
      const presignRes = await axios.post("/api/upload", {
        filename: file.name,
        filetype: file.type,
        unit: selectedUnit,
        name: peserta.nama,
      });
      const { url, key } = presignRes.data;
      setProgress(8);

      // 2. PUT to S3 with progress tracking
      await axios.put(url, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (e) => {
          if (!e.total) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(Math.max(8, Math.min(95, pct)));
        },
      });
      setProgress(96);

      // 3. Save status to DB
      await axios.post("/api/status", { nip: peserta.nip, s3_key: key });
      setProgress(100);

      setTimeout(() => setPhase("success"), 250);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Terjadi kesalahan saat upload.";
      setErrorMsg(msg);
      setPhase("error");
    }
  };

  // ── Success card ──────────────────────────────────────────────────────
  if (phase === "success") {
    return (
      <motion.section
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={stepTransition}
        className="space-y-5"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-emerald-500/15 mx-auto mb-5 flex items-center justify-center"
          >
            <CheckCircle2 size={28} className="text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Sertifikat Terkirim! 🎉</h2>
          <p className="text-default-500 leading-relaxed mb-1">
            Terima kasih, <strong>{peserta.nama}</strong>.
          </p>
          <p className="text-sm text-default-400 mb-6">
            Sertifikat kamu akan diverifikasi oleh tim admin.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="flat"
              startContent={<RotateCcw size={14} />}
              onPress={onReset}
            >
              Upload Sertifikat Lain
            </Button>
          </div>
        </motion.div>
      </motion.section>
    );
  }

  // ── Default card ──────────────────────────────────────────────────────
  return (
    <motion.section
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={stepTransition}
      className="space-y-5"
    >
      <VisaBubble tone="success">
        Hai <strong>{peserta.nama}</strong>! Upload file sertifikat PDF kamu di
        bawah ini. Maksimal {MAX_SIZE_MB} MB.
      </VisaBubble>

      <div className="rounded-3xl border border-default-200/60 bg-background p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UploadCloud size={16} className="text-primary" />
            File Sertifikat
          </div>
          <div className="text-xs text-default-400">PDF · ≤ {MAX_SIZE_MB} MB</div>
        </div>

        {/* Drag-Drop Zone */}
        <motion.div
          onClick={() => phase === "idle" && !file && inputRef.current?.click()}
          onDragOver={(e) => {
            if (phase === "uploading") return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (phase === "uploading") return;
            e.preventDefault();
            setDragOver(false);
            handleSelectFile(e.dataTransfer.files?.[0]);
          }}
          animate={{
            borderColor: dragOver
              ? "hsl(var(--heroui-primary))"
              : "hsl(var(--heroui-default-200))",
            backgroundColor: dragOver
              ? "hsl(var(--heroui-primary) / 0.05)"
              : "transparent",
            scale: dragOver ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
          className={`relative rounded-2xl border-2 border-dashed p-8 transition-colors ${
            file && phase !== "uploading"
              ? "cursor-default"
              : phase === "uploading"
                ? "cursor-progress"
                : "cursor-pointer hover:border-default-300"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleSelectFile(e.target.files?.[0])}
          />

          <AnimatePresence mode="wait">
            {!file && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-2 py-4"
              >
                <motion.div
                  animate={{ y: dragOver ? -4 : 0 }}
                  className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-1"
                >
                  <UploadCloud size={22} className="text-primary" />
                </motion.div>
                <p className="text-sm font-semibold">
                  {dragOver
                    ? "Lepas file di sini"
                    : "Klik atau drag-drop file PDF"}
                </p>
                <p className="text-xs text-default-400">
                  Maksimal {MAX_SIZE_MB} MB
                </p>
              </motion.div>
            )}

            {file && (
              <motion.div
                key="file"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-default-400">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                  {phase !== "uploading" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPhase("idle");
                        setErrorMsg("");
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                      className="text-default-400 hover:text-red-500 transition-colors"
                      aria-label="Hapus file"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <AnimatePresence>
                  {phase === "uploading" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5"
                    >
                      <div className="h-2 rounded-full bg-default-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400"
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-default-500 flex items-center gap-1.5">
                          <Loader2
                            size={11}
                            className="animate-spin text-primary"
                          />
                          {progress < 95
                            ? "Mengirim ke server..."
                            : progress < 100
                              ? "Menyimpan data..."
                              : "Selesai"}
                        </span>
                        <span className="font-bold text-primary tabular-nums">
                          {progress}%
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {phase === "error" && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-start gap-2 text-sm"
            >
              <AlertCircle
                size={16}
                className="text-red-500 shrink-0 mt-0.5"
              />
              <p className="text-red-600 dark:text-red-400">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between gap-3">
        <Button
          variant="flat"
          startContent={<ArrowLeft size={14} />}
          isDisabled={phase === "uploading"}
          onPress={onBack}
        >
          Ganti Nama
        </Button>
        <Button
          color="primary"
          variant="shadow"
          isDisabled={!file || phase === "uploading"}
          isLoading={phase === "uploading"}
          startContent={
            phase !== "uploading" ? <UploadCloud size={14} /> : null
          }
          onPress={handleUpload}
        >
          {phase === "uploading" ? "Mengupload..." : "Upload Sertifikat"}
        </Button>
      </div>
    </motion.section>
  );
}
