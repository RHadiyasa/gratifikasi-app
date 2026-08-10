import type { ReactNode } from "react";

/**
 * Kepala halaman dashboard yang seragam: label kecil, judul, keterangan,
 * dan slot aksi di kanan yang turun ke bawah pada layar sempit.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-default-400">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-default-500">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

/** Kartu putih standar — dipakai untuk semua panel di dashboard. */
export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-default-200/60 bg-background ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-default-100 px-5 py-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-default-400">
            {eyebrow}
          </p>
        )}
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
          {title}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
