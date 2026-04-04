export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-default-200 rounded-lg" />
      <div className="h-4 w-64 bg-default-100 rounded" />
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-default-100 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-default-100" />
        ))}
      </div>
    </div>
  )
}
