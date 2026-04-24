export default function DashboardZILoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-40 bg-default-200 rounded animate-pulse" />
            <div className="h-8 w-72 bg-default-200 rounded animate-pulse" />
            <div className="h-3 w-56 bg-default-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-default-200 rounded-lg animate-pulse" />
            <div className="h-9 w-28 bg-default-200 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-default-200 bg-content1 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-default-200 rounded animate-pulse" />
                <div className="h-6 w-6 bg-default-200 rounded-lg animate-pulse" />
              </div>
              <div className="h-8 w-10 bg-default-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Summary card */}
        <div className="rounded-xl border border-default-200 bg-content1 p-5 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-36 bg-default-200 rounded animate-pulse" />
            <div className="h-12 w-24 bg-default-200 rounded animate-pulse" />
          </div>
          <div className="h-6 w-20 bg-default-200 rounded animate-pulse" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 rounded-xl border border-default-200 bg-content1 p-5 space-y-4">
            <div className="h-4 w-32 bg-default-200 rounded animate-pulse" />
            <div className="h-64 bg-default-100 rounded-lg animate-pulse" />
          </div>
          <div className="lg:col-span-2 rounded-xl border border-default-200 bg-content1 p-5 space-y-4">
            <div className="h-4 w-32 bg-default-200 rounded animate-pulse" />
            <div className="h-64 bg-default-100 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-default-200 bg-content1 overflow-hidden">
          <div className="p-5 border-b border-default-200">
            <div className="h-4 w-36 bg-default-200 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-default-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 bg-default-200 rounded animate-pulse" />
                  <div className="h-2.5 w-28 bg-default-200 rounded animate-pulse" />
                </div>
                <div className="h-5 w-12 bg-default-200 rounded-full animate-pulse" />
                <div className="h-5 w-20 bg-default-200 rounded-full animate-pulse" />
                <div className="flex-1 max-w-[120px] h-1.5 bg-default-200 rounded-full animate-pulse" />
                <div className="h-4 w-10 bg-default-200 rounded animate-pulse" />
                <div className="h-7 w-7 bg-default-200 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
