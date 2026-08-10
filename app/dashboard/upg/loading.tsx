import { Skeleton } from "@heroui/react";

import {
  ChartSkeleton,
  ListSkeleton,
  StatCardsSkeleton,
} from "@/components/dashboard/Skeletons";

// Bentuknya sengaja dibuat sama persis dengan app/dashboard/upg/page.jsx
// supaya tidak ada pergeseran tata letak saat konten aslinya masuk.
export default function DashboardUPGLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-56 rounded-md" />
        <Skeleton className="h-8 w-52 rounded-lg" />
      </div>

      <StatCardsSkeleton />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-default-200/60 bg-background p-5 lg:col-span-2">
          <div className="mb-6 space-y-1.5">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <ChartSkeleton />
        </div>

        <div className="rounded-2xl border border-default-200/60 bg-background p-5">
          <div className="mb-6 space-y-1.5">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-4 w-6 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-default-200/60 bg-background">
        <div className="border-b border-default-100 px-5 py-4">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="mt-1.5 h-4 w-32 rounded-md" />
        </div>
        <ListSkeleton />
      </div>
    </div>
  );
}
