import { Skeleton } from "@heroui/react";

export default function DashboardUPGLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border border-default-200 bg-default-50 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-default-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-default-100 border-b border-default-200">
          <Skeleton className="h-5 w-40 rounded-lg" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-default-100 last:border-0">
            <Skeleton className="h-4 rounded-lg col-span-2" />
            <Skeleton className="h-4 rounded-lg" />
            <Skeleton className="h-4 rounded-lg" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
