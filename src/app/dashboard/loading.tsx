export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-muted rounded-lg animate-pulse" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
              <div className="h-4 w-16 bg-muted rounded-lg animate-pulse" />
            </div>
            <div className="h-4 w-3/4 bg-muted rounded-lg animate-pulse" />
            <div className="h-3 w-1/2 bg-muted rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
