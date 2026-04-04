export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-default-200 rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-default-100" />
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-40 bg-default-200 rounded" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-12 rounded-xl bg-default-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
