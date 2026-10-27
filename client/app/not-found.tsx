import { PrefetchLink } from "@/components/prefetch-link";

export default function NotFound() {
  return (
    <main className="shell flex items-center justify-center px-3 py-8 md:px-6">
      <div className="glass-panel grid max-w-xl gap-4 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">Missing page</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">That page is not here.</h1>
        <p className="text-base leading-7 text-foreground/70">The link may be old, or the page may have moved.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <PrefetchLink className="button-primary" href="/">
            Back to home
          </PrefetchLink>
          <PrefetchLink className="button-secondary" href="/pricing">
            See pricing
          </PrefetchLink>
        </div>
      </div>
    </main>
  );
}
