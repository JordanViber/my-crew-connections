import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="shell px-4 py-4 md:px-8 md:py-8">
      <div className="glass-panel mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.04fr_0.96fr]">
        <section className="flex flex-col justify-between gap-8 px-5 py-6 md:px-8 md:py-8 lg:px-12 lg:py-12">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-accent-strong">
                My Crew Connections
              </p>
              <p className="max-w-sm text-sm leading-6 text-foreground/66">
                Personal relationship planning, without the noise.
              </p>
            </div>

            <nav className="flex flex-wrap justify-end gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/90 bg-white/74 px-4 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white/92"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid gap-6 lg:max-w-2xl">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/15 bg-white/76 px-3 py-1.5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-foreground/62">
              Calm reminders. Real follow-through.
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.94] tracking-tight text-foreground md:text-7xl">
                Keep the people you care about close.
              </h1>
              <p className="max-w-xl text-base leading-7 text-foreground/72 md:text-lg">
                Track relationships, plan the next touchpoint, and keep shared history easy to revisit.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-12 min-w-[11.25rem] items-center justify-center rounded-full bg-[linear-gradient(135deg,#ef6b4a_0%,#b94224_100%)] px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(185,66,36,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(185,66,36,0.3)]"
                href={primaryHref}
              >
                {primaryLabel}
              </Link>
              <Link
                className="inline-flex min-h-12 min-w-[11.25rem] items-center justify-center rounded-full border border-border/90 bg-white/82 px-5 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white"
                href={secondaryHref}
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="section-card rounded-[1.25rem] p-4">
                <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                  {card.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/72">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="relative overflow-hidden bg-[linear-gradient(180deg,#1d2d30_0%,#132123_100%)] p-5 text-white md:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(246,201,119,0.38),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(239,107,74,0.24),transparent_26%),radial-gradient(circle_at_16%_78%,rgba(96,179,165,0.18),transparent_18%)]" />

          <div className="relative z-10 grid h-full content-between gap-6">
            <div className="grid gap-4">
              <div className="rounded-[1.8rem] border border-white/12 bg-white/8 p-5 backdrop-blur-xl md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/56">Due soon</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white">2 people, 1 crew</p>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/72">
                    This week
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    { name: "Maya", note: "Coffee catch-up", timing: "Tomorrow" },
                    { name: "Family group", note: "Sunday dinner plan", timing: "2 days" },
                    { name: "Andre", note: "Reply to check-in", timing: "4 days" },
                  ].map((item) => (
                    <div key={item.name} className="rounded-[1.2rem] border border-white/10 bg-black/12 px-4 py-3">
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/12 bg-white/7 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">Recent</p>
                  <p className="mt-3 text-lg font-semibold text-white">Dinner with Sam</p>
                  <p className="mt-2 text-sm leading-6 text-white/66">Logged once, easy to find later.</p>
                </div>

                <div className="rounded-[1.5rem] border border-white/12 bg-white/7 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">Next move</p>
                  <p className="mt-3 text-lg font-semibold text-white">Plan the next reach-out</p>
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
