import { Skeleton } from "@heroui/react";

export default function DashboardLoading() {
  return (
    <div className="relative flex items-center justify-center px-6 min-h-screen">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-default-200/60 bg-background/70 backdrop-blur-xl shadow-2xl p-8 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="h-7 w-48 rounded-xl" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
