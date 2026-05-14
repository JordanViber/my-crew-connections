export default function AppLoading() {
  return (
    <div className="shell px-2 py-2 md:px-5 md:py-4">
      <div className="glass-panel mx-auto max-w-7xl px-3 py-3 md:px-5 md:py-5">
        <div className="mb-5 flex items-start justify-between gap-4" aria-hidden="true">
          <div className="grid flex-1 gap-2">
            <div className="skeleton-shimmer h-3 w-36 rounded-full" />
            <div className="skeleton-shimmer h-4 w-44 rounded-full" />
            <div className="skeleton-shimmer mt-2 h-9 w-full max-w-md rounded-md" />
            <div className="skeleton-shimmer h-4 w-full max-w-lg rounded-full" />
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="skeleton-shimmer h-10 w-10 rounded-full" />
            <div className="skeleton-shimmer h-10 w-32 rounded-full" />
          </div>
        </div>

        <div className="mb-4 h-px bg-border" aria-hidden="true" />

        <div className="grid gap-4 md:hidden" aria-hidden="true">
          <div className="glass-panel grid grid-cols-4 gap-1.5 p-1.5">
            <div className="skeleton-shimmer h-9 rounded-lg" />
            <div className="skeleton-shimmer h-9 rounded-lg" />
            <div className="skeleton-shimmer h-9 rounded-lg" />
            <div className="skeleton-shimmer h-9 rounded-lg" />
          </div>
          <section className="section-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid gap-2">
                <div className="skeleton-shimmer h-5 w-28 rounded-full" />
                <div className="skeleton-shimmer h-3 w-32 rounded-full" />
              </div>
              <div className="skeleton-shimmer h-3 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton-shimmer h-36 rounded-2xl" />
              <div className="skeleton-shimmer h-36 rounded-2xl" />
              <div className="skeleton-shimmer h-36 rounded-2xl" />
              <div className="skeleton-shimmer h-36 rounded-2xl" />
            </div>
          </section>
          <div className="skeleton-shimmer h-28 rounded-lg" />
        </div>

        <div className="hidden gap-5 md:grid xl:grid-cols-[1.15fr_0.85fr]" aria-hidden="true">
          <div className="grid gap-5">
            <div className="skeleton-shimmer h-32 rounded-lg" />
            <div className="skeleton-shimmer h-64 rounded-lg" />
            <div className="skeleton-shimmer h-56 rounded-lg" />
          </div>
          <div className="grid gap-5">
            <div className="skeleton-shimmer h-96 rounded-lg" />
            <div className="skeleton-shimmer h-64 rounded-lg" />
          </div>
        </div>

        <p className="sr-only">Loading</p>
      </div>
    </div>
  );
}
