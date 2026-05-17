"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ListCheckIcon,
  Settings,
  FileSpreadsheet,
  CalendarRange,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/react";
import Link from "next/link";
import { GlobalSummaryCards } from "./_components/GlobalSummaryCards";
import { UnitSummaryCardsList } from "./_components/UnitSummaryCardsList";
import { TrackerSkeleton } from "./_components/TrackerSkeleton";
import { usePesertaData } from "@/hooks/usePesertaData";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";

const TrackingParticipantPage = () => {
  const { role } = useAuthStore();
  const canManageSettings = hasPermission(role, "elearning:settings:manage");
  const canManageParticipants = hasPermission(
    role,
    "elearning:participants:manage"
  );

  // ── Cohort filter state ────────────────────────────────────────────
  const [cohorts, setCohorts] = useState({ tahun: [], byTahun: {} });
  const [defaultCohort, setDefaultCohort] = useState({
    tahun: null,
    batch: null,
  });
  const [selectedTahun, setSelectedTahun] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const [cohortRes, settingsRes] = await Promise.all([
          axios.get("/api/elearning/cohorts"),
          axios.get("/api/elearning/settings"),
        ]);
        const c = cohortRes.data?.data ?? { tahun: [], byTahun: {} };
        setCohorts(c);

        const settings = settingsRes.data?.data;
        const tAktif = settings?.tahunAktif ?? null;
        const bAktif = (settings?.batchAktif ?? "").toString().trim() || null;
        setDefaultCohort({ tahun: tAktif, batch: bAktif });

        if (tAktif) setSelectedTahun(String(tAktif));
        if (bAktif) setSelectedBatch(bAktif);
      } catch (err) {
        console.error("Gagal memuat cohorts/settings:", err);
      }
    })();
  }, []);

  // Pass cohort filter ke hook
  const { summary, isLoading, error, totalRaw } = usePesertaData({
    tahun: selectedTahun,
    batch: selectedBatch,
  });

  // ── Derived ─────────────────────────────────────────────────────────
  const availableBatches =
    selectedTahun !== "all" && cohorts?.byTahun
      ? cohorts.byTahun[selectedTahun] || []
      : [];

  const defaultTahunStr = defaultCohort.tahun
    ? String(defaultCohort.tahun)
    : "all";
  const defaultBatchStr = defaultCohort.batch ?? "all";
  const cohortIsCustom =
    selectedTahun !== defaultTahunStr || selectedBatch !== defaultBatchStr;

  const cohortScopeLabel =
    selectedTahun === "all"
      ? "Semua Cohort"
      : `Batch ${selectedBatch === "all" ? "Semua" : selectedBatch} · ${selectedTahun}`;

  const resetCohort = () => {
    setSelectedTahun(defaultTahunStr);
    setSelectedBatch(defaultBatchStr);
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (isLoading) {
    return <TrackerSkeleton />;
  }

  if (error) {
    return (
      <div className="p-12 text-center text-red-600">
        <h1 className="text-2xl font-bold">Terjadi Kesalahan</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid lg:flex items-center justify-between gap-3"
      >
        <div>
          <p className="text-xs font-semibold text-default-400 uppercase tracking-widest mb-1">
            E-Learning · Tracking
          </p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Monitoring Progres Peserta
          </h1>
          <p className="text-sm text-default-500 mt-1">
            Cohort:{" "}
            <span className="font-semibold text-primary">
              {cohortScopeLabel}
            </span>
            <span className="text-default-300"> · </span>
            {summary.totalParticipants} peserta
            {selectedTahun === "all" && totalRaw > summary.totalParticipants && (
              <span className="text-default-300">
                {" "}
                (dari total {totalRaw} di semua cohort)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageParticipants && (
            <Button
              as={Link}
              href="/dashboard/elearning/participants/import"
              variant="flat"
              color="success"
              startContent={<FileSpreadsheet size={16} />}
            >
              Import Peserta
            </Button>
          )}
          {canManageSettings && (
            <Button
              as={Link}
              href="/dashboard/elearning/settings"
              variant="flat"
              color="default"
              startContent={<Settings size={16} />}
            >
              Pengaturan
            </Button>
          )}
          <Button
            as={Link}
            href="/e-learning/participants"
            variant="shadow"
            color="primary"
            startContent={<ListCheckIcon size={16} />}
          >
            Daftar Peserta
          </Button>
        </div>
      </motion.div>

      {/* ── Cohort Master Filter ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarRange size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5 flex items-center gap-2">
                Cohort Aktif
                <AnimatePresence>
                  {cohortIsCustom && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={resetCohort}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline normal-case tracking-normal"
                    >
                      <X size={10} />
                      Kembali ke Default
                    </motion.button>
                  )}
                </AnimatePresence>
              </p>
              <p className="text-xs text-default-500 leading-relaxed">
                Default mengikuti cohort aktif di Pengaturan. Pilih lain untuk
                lihat data arsip / total semua.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select
              label="Tahun"
              size="sm"
              selectedKeys={[selectedTahun]}
              onChange={(e) => {
                setSelectedTahun(e.target.value || "all");
                setSelectedBatch("all");
              }}
              variant="bordered"
              className="min-w-[140px]"
            >
              <SelectItem key="all">Semua Tahun</SelectItem>
              {(cohorts?.tahun ?? []).map((t) => (
                <SelectItem key={String(t)}>{String(t)}</SelectItem>
              ))}
            </Select>
            <Select
              label="Batch"
              size="sm"
              selectedKeys={[selectedBatch]}
              onChange={(e) => setSelectedBatch(e.target.value || "all")}
              isDisabled={selectedTahun === "all"}
              variant="bordered"
              className="min-w-[160px]"
            >
              <SelectItem key="all">Semua Batch</SelectItem>
              {availableBatches.map((b) => (
                <SelectItem key={b.batch}>
                  {`Batch ${b.batch} (${b.count})`}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
      </motion.div>

      {/* ── Empty state kalau cohort kosong ────────────────── */}
      {summary.totalParticipants === 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-10 text-center">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            Tidak ada peserta pada cohort ini.
          </p>
          <p className="text-xs text-default-500 mt-2">
            Coba pilih tahun atau batch yang lain, atau import data peserta
            untuk cohort ini.
          </p>
        </div>
      ) : (
        <>
          {/* 1. RINGKASAN GLOBAL ATAS */}
          <GlobalSummaryCards summary={summary} />

          <hr />

          {/* 2. CARD RINGKASAN PER UNIT (link ke detail per peserta) */}
          <UnitSummaryCardsList
            unitSummary={summary.unitSummary}
            cohort={{ tahun: selectedTahun, batch: selectedBatch }}
          />
        </>
      )}
    </div>
  );
};

export default TrackingParticipantPage;
