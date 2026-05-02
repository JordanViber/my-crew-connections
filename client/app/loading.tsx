export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white/85 px-6 py-5 text-center shadow-[0_16px_36px_rgba(31,44,49,0.08)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground/75">Loading your crew...</p>
      </div>
    </div>
  );
}
