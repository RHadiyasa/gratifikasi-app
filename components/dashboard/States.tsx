"use client";

import type { ReactNode } from "react";

import { Button } from "@heroui/react";
import { AlertTriangle, Inbox, RotateCw } from "lucide-react";

/** Ditampilkan saat data berhasil dimuat tapi hasilnya kosong. */
export function EmptyState({
  icon,
  title = "Belum ada data",
  description,
  action,
}: {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-default-100 text-default-400">
        {icon ?? <Inbox size={20} />}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-default-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Ditampilkan saat pengambilan data gagal — selalu sediakan tombol coba lagi. */
export function ErrorState({
  title = "Gagal memuat data",
  message,
  onRetry,
}: {
  title?: ReactNode;
  message?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger dark:bg-danger-500/10">
        <AlertTriangle size={20} />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {message && (
        <p className="mt-1 max-w-sm text-sm text-default-400">{message}</p>
      )}
      {onRetry && (
        <Button
          className="mt-5"
          color="default"
          size="sm"
          startContent={<RotateCw size={14} />}
          variant="flat"
          onPress={onRetry}
        >
          Coba lagi
        </Button>
      )}
    </div>
  );
}
