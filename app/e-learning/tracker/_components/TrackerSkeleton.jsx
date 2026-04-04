import { Skeleton } from "@heroui/react";

export function TrackerSkeleton() {
  return (
    <div className="p-4 md:p-8 animate-pulse-subtle">
      {/* Header */}
      <div className="grid lg:flex items-center justify-between mb-6">
        <Skeleton className="h-9 w-72 rounded-xl" />
        <Skeleton className="h-10 w-48 rounded-xl mt-4 lg:mt-0" />
      </div>

      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl border border-default-200 bg-default-50"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded-lg" />
                <Skeleton className="h-9 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <hr className="mb-8 border-default-200" />

      {/* Unit Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-default-200 bg-default-50 space-y-3"
          >
            <Skeleton className="h-5 w-3/4 rounded-lg" />
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, j) => (
                <Skeleton key={j} className="h-12 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-4 w-1/2 rounded-lg mx-auto" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Section Title */}
      <Skeleton className="h-10 w-64 rounded-xl mb-6" />

      {/* Tables */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="mb-8 border border-default-200 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="px-4 py-3 bg-default-100 border-b border-default-200">
            <Skeleton className="h-5 w-48 rounded-lg" />
          </div>
          {/* Table rows */}
          {[...Array(4)].map((_, j) => (
            <div
              key={j}
              className="px-4 py-3 flex gap-4 border-b border-default-100 last:border-0"
            >
              <Skeleton className="h-4 flex-1 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-4 w-16 rounded-lg" />
              <Skeleton className="h-4 w-20 rounded-lg" />
              <Skeleton className="h-4 w-12 rounded-lg" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
