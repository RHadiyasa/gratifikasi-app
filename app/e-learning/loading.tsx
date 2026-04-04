import { Skeleton } from "@heroui/react";

export default function ELearningLoading() {
  return (
    <div className="min-h-screen space-y-0">
      {/* Hero section skeleton */}
      <div className="min-h-[90dvh] flex flex-col items-center justify-center px-6 py-20 gap-6">
        <Skeleton className="h-6 w-56 rounded-full" />
        <Skeleton className="h-14 w-full max-w-2xl rounded-2xl" />
        <Skeleton className="h-14 w-full max-w-xl rounded-2xl" />
        <Skeleton className="h-5 w-full max-w-lg rounded-xl" />
        <Skeleton className="h-5 w-80 rounded-xl" />
        <div className="flex gap-3 mt-4">
          <Skeleton className="h-12 w-44 rounded-2xl" />
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
      </div>

      {/* Stats section skeleton */}
      <div className="px-6 py-16 border-y border-default-100">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <Skeleton className="h-10 w-20 rounded-xl" />
              <Skeleton className="h-4 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
