export default function AppLoading() {
  return (
    <div className="shell px-2 py-2 md:px-5 md:py-4">
      <div className="glass-panel mx-auto max-w-7xl px-3 py-3 md:px-5 md:py-5">
        <div className="mb-4 h-8 w-56 animate-pulse rounded-md bg-surface-muted" aria-hidden="true" />
        <div className="mb-6 h-11 w-72 animate-pulse rounded-md bg-surface-muted" aria-hidden="true" />
        <div className="grid gap-3">
          <div className="h-28 animate-pulse rounded-lg bg-surface-muted" aria-hidden="true" />
          <div className="h-28 animate-pulse rounded-lg bg-surface-muted" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
