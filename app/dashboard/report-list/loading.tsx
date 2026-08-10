import { Skeleton } from "@heroui/react";

import {
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/dashboard/Skeletons";

export default function ReportListLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6">
      <Skeleton className="h-4 w-48 rounded-md" />

      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-md" />
        <Skeleton className="h-8 w-56 rounded-lg" />
      </div>

      <StatCardsSkeleton />

      <div className="rounded-2xl border border-default-200/60 bg-background p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <Skeleton className="h-10 rounded-xl lg:w-72" />
          <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      <TableSkeleton cols={6} rows={8} />
    </div>
  );
}
