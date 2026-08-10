import { Skeleton } from "@heroui/react";

import { FieldSkeleton } from "@/components/dashboard/Skeletons";

export default function ReportDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6">
      <Skeleton className="h-4 w-64 rounded-md" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-6 w-40 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-default-200/60 bg-background"
        >
          <div className="space-y-1.5 border-b border-default-100 px-5 py-4">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((j) => (
              <FieldSkeleton key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
