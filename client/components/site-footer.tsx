import { PrefetchLink } from "@/components/prefetch-link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 px-3 pb-28 pt-4 md:px-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-foreground/68 sm:flex-row sm:items-center sm:justify-between">
        <p>My Crew Connections</p>
        <nav aria-label="Legal" className="flex items-center gap-4">
          <PrefetchLink className="font-semibold text-foreground/80 transition hover:text-foreground" href="/privacy">
            Privacy
          </PrefetchLink>
          <PrefetchLink className="font-semibold text-foreground/80 transition hover:text-foreground" href="/terms">
            Terms
          </PrefetchLink>
        </nav>
      </div>
    </footer>
  );
}
