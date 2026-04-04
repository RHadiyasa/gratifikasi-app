import { Skeleton } from "@heroui/react";

export function ParticipantsSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <Skeleton className="h-8 w-72 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Filter row */}
      <div className="flex gap-3">
        <Skeleton className="h-14 flex-1 rounded-xl" />
        <Skeleton className="h-14 flex-1 rounded-xl" />
        <Skeleton className="h-14 w-32 rounded-xl" />
      </div>

      {/* Table */}
      <div className="border border-default-200 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 gap-4 px-4 py-3 bg-default-100 border-b border-default-200">
          {["Nama", "Unit Eselon I", "Batch", "Status"].map((col) => (
            <Skeleton key={col} className="h-4 rounded-lg" />
          ))}
        </div>

        {/* Table rows */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-default-100 last:border-0"
            style={{ opacity: 1 - i * 0.07 }}
          >
            <Skeleton className="h-4 rounded-lg" />
            <Skeleton className="h-4 rounded-lg" />
            <Skeleton className="h-4 w-16 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-40 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
