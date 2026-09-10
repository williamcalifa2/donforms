export default function EditorLoading() {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top bar skeleton */}
      <div className="border-b h-14 flex items-center px-4 gap-3">
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
        <div className="flex-1 h-5 bg-muted rounded-lg animate-pulse max-w-xs" />
        <div className="flex gap-2 ml-auto">
          <div className="h-8 w-20 bg-muted rounded-lg animate-pulse" />
          <div className="h-8 w-16 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-72 border-r p-3 space-y-2">
          <div className="h-8 bg-muted rounded-lg animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Main skeleton */}
        <div className="flex-1 p-8 space-y-4 max-w-xl mx-auto">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-7 w-3/4 bg-muted rounded-lg animate-pulse" />
          <div className="border rounded-xl p-5 space-y-4">
            <div className="h-10 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
