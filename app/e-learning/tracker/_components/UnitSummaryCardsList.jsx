"use client";
import { downloadZipDirectly } from "@/service/aws/predesignUrl.service";
import { Button, Progress } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { DownloadIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

const UnitSummaryCard = ({
  name,
  uploaded,
  notUploaded,
  total,
  percentage,
  onDownload,
}) => (
  <div className="p-4 rounded-xl shadow-md border border-gray-100 bg-white hover:shadow-lg transition relative">
    <h3 className="text-lg font-bold text-gray-800 mb-2 border-b pb-1">
      {name}
    </h3>

    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-center p-2 rounded bg-blue-50">
        <p className="font-bold text-blue-800">{total}</p>
        <p className="text-xs text-blue-600">Total</p>
      </div>
      <div className="text-center p-2 rounded bg-green-50">
        <p className="font-bold text-green-800">{uploaded}</p>
        <p className="text-xs text-green-600">Upload</p>
      </div>
      <div className="text-center p-2 rounded bg-red-50">
        <p className="font-bold text-red-800">{notUploaded}</p>
        <p className="text-xs text-red-600">Belum</p>
      </div>
    </div>

    <p
      className={`mt-3 text-center text-sm font-semibold ${
        percentage > 50 ? "text-green-600" : "text-orange-600"
      }`}
    >
      {percentage.toFixed(1)}% Selesai
    </p>

    <Button
      onPress={onDownload}
      variant="bordered"
      color="default"
      className="flex items-center text-black justify-center gap-1 w-full mt-3 text-xs"
    >
      <DownloadIcon size={16} />
      <p>Download Sertifikat ({uploaded})</p>
    </Button>
  </div>
);

export const UnitSummaryCardsList = ({ unitSummary }) => {
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
        simulatedProgress += Math.random() * 10; // naik random biar realistis
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
      <h2 className="text-2xl font-semibold mb-4">Monitoring Progress Unit</h2>

      <div className="sm:flex sm:flex-wrap grid items-center justify-center gap-5 md:gap-6 p-2">
        {unitSummary.map((unit) => (
          <UnitSummaryCard
            key={unit.name}
            name={unit.name}
            uploaded={unit.uploaded}
            notUploaded={unit.notUploaded}
            total={unit.total}
            percentage={unit.percentage}
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
