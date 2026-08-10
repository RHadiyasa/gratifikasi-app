import { Skeleton } from "@heroui/react";

// Semua skeleton di bawah sengaja meniru bentuk & tinggi konten aslinya,
// supaya tidak ada lompatan tata letak begitu data datang.

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-2xl border border-default-200/60 bg-background p-5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  // Batang dengan tinggi berbeda-beda supaya terbaca sebagai grafik, bukan blok
  const tinggi = [45, 70, 35, 85, 55, 95, 40, 75, 60, 50, 80, 65];

  return (
    <div
      className="flex items-end justify-between gap-2 px-1"
      style={{ height }}
    >
      {tinggi.map((t, i) => (
        <Skeleton
          key={i}
          className="w-full rounded-t-md"
          style={{ height: `${t}%` }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-default-200/60 bg-background">
      <div className="flex items-center gap-4 border-b border-default-100 bg-default-50/50 px-5 py-3.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-3 rounded-md ${i === 0 ? "w-32" : "w-20"}`}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-default-100 px-5 py-4 last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={`h-4 rounded-md ${c === 0 ? "w-32" : c === cols - 1 ? "w-16" : "w-20"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-default-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-36 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-20 rounded-md" />
      <Skeleton className="h-4 w-40 rounded-md" />
    </div>
  );
}
