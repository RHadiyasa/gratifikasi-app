import type { ReactNode } from "react";

// Satu sumber warna untuk seluruh dashboard. Semua nada memakai bg/ring
// transparan + teks yang punya varian dark, supaya terbaca di kedua tema —
// pola lama (`bg-blue-100 text-blue-600`) hilang kontras saat mode gelap.
export type Tone =
  | "default"
  | "blue"
  | "amber"
  | "violet"
  | "green"
  | "rose"
  | "slate";

const TONE: Record<Tone, string> = {
  default: "bg-default-100 text-default-600 ring-default-200",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  violet:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20",
  green:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20",
};

const DOT: Record<Tone, string> = {
  default: "bg-default-400",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  green: "bg-emerald-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
};

// Status laporan gratifikasi — urutannya mengikuti alur kerja, bukan abjad.
export const STATUS_TONE: Record<string, Tone> = {
  Diajukan: "blue",
  Diverifikasi: "amber",
  "Diteruskan ke KPK": "violet",
  Selesai: "green",
};

export const STATUS_OPTIONS = [
  "Diajukan",
  "Diverifikasi",
  "Diteruskan ke KPK",
  "Selesai",
];

export function Chip({
  tone = "default",
  dot = false,
  className = "",
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${TONE[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />}
      {children}
    </span>
  );
}

export function StatusChip({ status }: { status?: string | null }) {
  if (!status) return <span className="text-default-300">—</span>;

  return (
    <Chip dot tone={STATUS_TONE[status] ?? "default"}>
      {status}
    </Chip>
  );
}
