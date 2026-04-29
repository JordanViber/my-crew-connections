import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const featureCards = [
  {
    title: "People and groups",
    description: "Keep the important ones in one place.",
  },
  {
    title: "Smart nudges",
    description: "See who is due soon without overthinking it.",
  },
  {
    title: "Light history",
    description: "Remember the last call, coffee, or dinner.",
  },
];

export default async function Home({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ code?: string; next?: string }>;
}>) {
  const params = await searchParams;

  if (params.code) {
    const callbackParams = new URLSearchParams({ code: params.code });

    if (params.next) {
      callbackParams.set("next", params.next);
    }

    redirect(`/auth/confirm?${callbackParams.toString()}`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? "/dashboard" : "/auth/create";
  const primaryLabel = user ? "Open your dashboard" : "Create account";
  const secondaryHref = user ? "/connections" : "/auth";
  const secondaryLabel = user ? "Explore the relationship workspace" : "I already have an account";
  const navLinks = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/connections", label: "People" },
        { href: "/groups", label: "Groups" },
      ]
    : [
        { href: "/auth/create", label: "Create account" },
        { href: "/auth", label: "Sign in" },
      ];

  return (
    <main className="shell px-3 py-3 md:px-6 md:py-6">
      <div className="glass-panel mx-auto grid max-w-6xl overflow-hidden lg:min-h-[calc(100vh-1.5rem)] lg:grid-cols-[1.04fr_0.96fr]">
        <section className="flex flex-col justify-between gap-6 px-4 py-5 md:px-7 md:py-7 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-strong">
                My Crew Connections
              </p>
              <p className="max-w-sm text-sm leading-6 text-foreground/66">
                Personal relationship planning, without the noise.
              </p>
            </div>

            <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <ThemeToggle className="justify-self-start" />
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  className="button-secondary button-compact"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid gap-5 lg:max-w-2xl">
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-accent/15 bg-surface-muted px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground/62">
              Calm reminders. Real follow-through.
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold leading-[0.98] tracking-tight text-foreground md:text-6xl">
                Keep the people you care about close.
              </h1>
              <p className="max-w-xl text-base leading-7 text-foreground/72">
                Track relationships, plan the next touchpoint, and keep shared history easy to revisit.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="button-primary"
                href={primaryHref}
              >
                {primaryLabel}
              </Link>
              <Link
                className="button-secondary"
                href={secondaryHref}
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="section-card p-3.5">
                <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                  {card.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/72">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="relative overflow-hidden bg-[#182629] p-4 text-white md:p-6 lg:p-8">
          <div className="relative z-10 grid h-full content-between gap-5">
            <div className="grid gap-3">
              <div className="rounded-lg border border-white/12 bg-white/8 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/56">Due soon</p>
                    <p className="mt-2 text-[1.35rem] font-semibold tracking-tight text-white">2 people, 1 crew</p>
                  </div>
                  <div className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/72">
                    This week
                  </div>
                </div>

                <div className="mt-4 grid gap-2.5">
                  {[
                    { name: "Maya", note: "Coffee catch-up", timing: "Tomorrow" },
                    { name: "Family group", note: "Sunday dinner plan", timing: "2 days" },
                    { name: "Andre", note: "Reply to check-in", timing: "4 days" },
                  ].map((item) => (
                    <div key={item.name} className="rounded-lg border border-white/10 bg-black/12 px-3.5 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="mt-1 text-sm text-white/64">{item.note}</p>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f6c977]">{item.timing}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/12 bg-white/7 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">Recent</p>
                  <p className="mt-2 text-base font-semibold text-white">Dinner with Sam</p>
                  <p className="mt-2 text-sm leading-6 text-white/66">Logged once, easy to find later.</p>
                </div>

                <div className="rounded-lg border border-white/12 bg-white/7 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">Next move</p>
                  <p className="mt-2 text-base font-semibold text-white">Plan the next reach-out</p>
                  <p className="mt-2 text-sm leading-6 text-white/66">A short reminder instead of a mental note.</p>
                </div>
              </div>
            </div>

            <p className="max-w-lg text-sm leading-7 text-white/68">
              Built for staying thoughtful, not busy.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
