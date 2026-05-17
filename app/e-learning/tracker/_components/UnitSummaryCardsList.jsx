"use client";
import { downloadZipDirectly } from "@/service/aws/predesignUrl.service";
import { Button, Progress } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import {
  DownloadIcon,
  Loader2,
  ArrowRight,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import React, { useState } from "react";

const StatBlock = ({ icon: Icon, value, label, accent }) => (
  <div
    className="flex flex-col items-center gap-1 py-2 rounded-lg"
    style={{ background: `${accent}10` }}
  >
    <div className="flex items-center gap-1">
      <Icon size={11} style={{ color: accent }} />
      <p className="text-xs font-bold tabular-nums" style={{ color: accent }}>
        {value}
      </p>
    </div>
    <p className="text-[10px] text-default-500 uppercase tracking-wide">
      {label}
    </p>
  </div>
);

const UnitSummaryCard = ({
  name,
  uploaded,
  notUploaded,
  total,
  percentage,
  onDownload,
  cohort,
}) => {
  const params = new URLSearchParams();
  params.set("unit", name);
  if (cohort?.tahun && cohort.tahun !== "all") params.set("tahun", cohort.tahun);
  if (cohort?.batch && cohort.batch !== "all") params.set("batch", cohort.batch);
  const detailHref = `/e-learning/participants?${params.toString()}`;
  const goodProgress = percentage > 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border border-default-200/60 bg-background hover:border-default-300 transition-all flex flex-col gap-3 min-w-[260px]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug">
          {name}
        </h3>
        <span
          className={`text-xs font-black tabular-nums shrink-0 ${
            goodProgress ? "text-emerald-500" : "text-amber-500"
          }`}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-default-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${
            goodProgress ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <StatBlock icon={Users} value={total} label="Total" accent="#3b82f6" />
        <StatBlock
          icon={CheckCircle2}
          value={uploaded}
          label="Sudah"
          accent="#22c55e"
        />
        <StatBlock
          icon={Clock}
          value={notUploaded}
          label="Belum"
          accent="#f43f5e"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          as={Link}
          href={detailHref}
          variant="flat"
          color="primary"
          size="sm"
          endContent={<ArrowRight size={12} />}
          className="flex-1 text-xs"
        >
          Lihat Detail
        </Button>
        <Button
          onPress={onDownload}
          variant="flat"
          color="default"
          size="sm"
          isIconOnly
          className="shrink-0"
          aria-label={`Download ${uploaded} sertifikat unit ${name}`}
          isDisabled={uploaded === 0}
        >
          <DownloadIcon size={14} />
        </Button>
      </div>
    </motion.div>
  );
};

export const UnitSummaryCardsList = ({ unitSummary, cohort }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const handleDownloadCertificates = async (unitName) => {
    try {
      setIsLoading(true);
      setProgress(0);
      setLoadingMessage(`Menyiapkan ZIP sertifikat untuk ${unitName}...`);

      let simulatedProgress = 0;
      const interval = setInterval(() => {
        simulatedProgress += Math.random() * 10;
        setProgress((prev) => (prev < 95 ? simulatedProgress : prev));
      }, 500);

      await downloadZipDirectly(unitName);

      clearInterval(interval);
      setProgress(100);
      setLoadingMessage(`✅ Unduhan siap untuk ${unitName}!`);

      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      setLoadingMessage("❌ Gagal mengunduh ZIP. Silakan coba lagi.");
      setProgress(0);
      setTimeout(() => setIsLoading(false), 2000);
    }
  };

  return (
    <div className="relative">
      <ToastProvider />
      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
          <p className="text-xs font-semibold text-default-400 uppercase tracking-widest">
            Progres per Unit
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Monitoring Unit Eselon I
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {unitSummary.map((unit) => (
          <UnitSummaryCard
            key={unit.name}
            name={unit.name}
            uploaded={unit.uploaded}
            notUploaded={unit.notUploaded}
            total={unit.total}
            percentage={unit.percentage}
            cohort={cohort}
            onDownload={() => handleDownloadCertificates(unit.name)}
          />
        ))}
      </div>

      {/* ====== LOADING OVERLAY ====== */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex flex-col items-center space-y-4 w-80 bg-white/10 p-6 rounded-2xl shadow-lg border border-white/20"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 120 }}
            >
              <Loader2
                className={`animate-spin ${
                  progress >= 95 ? "text-green-400" : "text-blue-400"
                }`}
                size={48}
              />
              <p className="text-center text-lg font-semibold animate-pulse">
                {loadingMessage}
              </p>

              <Progress
                size="lg"
                value={progress}
                max={100}
                color={progress >= 95 ? "success" : "primary"}
                label={`Proses: ${Math.min(progress, 100).toFixed(0)}%`}
                className="w-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
