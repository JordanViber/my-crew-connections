import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const featureCards = [
  {
    title: "Track who matters",
    description: "Keep people and groups in one calm place instead of scattered across notes, texts, and memory.",
  },
  {
    title: "Stay ahead of drift",
    description: "See when a friendship or recurring crew is due soon, overdue, or comfortably on track.",
  },
  {
    title: "Log what happened",
    description: "Turn a quick check-in, call, coffee, or dinner into lightweight history that informs the next plan.",
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

    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? "/dashboard" : "/auth";
  const primaryLabel = user ? "Open your dashboard" : "Start with magic link";

  return (
    <main className="shell px-6 py-6 md:px-10">
      <div className="glass-panel mx-auto flex max-w-6xl flex-col overflow-hidden rounded-4xl lg:min-h-[calc(100vh-3rem)] lg:flex-row">
        <section className="flex flex-1 flex-col justify-between gap-10 px-6 py-8 md:px-10 md:py-10 lg:px-14 lg:py-14">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-accent-strong">
                My Crew Connections
              </p>
              <p className="mt-2 max-w-md text-sm text-foreground/70">
                A warm relationship dashboard for adults who care deeply and need a lighter planning system.
              </p>
            </div>
            <nav className="flex flex-wrap justify-end gap-3">
              <Link className="button-secondary" href={primaryHref}>
                {user ? "Dashboard" : "Sign in"}
              </Link>
              <Link className="button-secondary" href="/connections">
                People
              </Link>
              <Link className="button-secondary" href="/groups">
                Groups
              </Link>
            </nav>
          </div>

          <div className="grid gap-8 lg:max-w-3xl">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-accent/20 bg-white/70 px-4 py-2 text-sm text-foreground/75">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span>Solo-first localhost MVP built against local Supabase</span>
            </div>

            <div className="space-y-6">
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight text-foreground md:text-7xl">
                Make staying close feel more natural than remembering alone.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-foreground/75 md:text-xl">
                Track the people and groups that matter, set a healthy cadence, and turn overdue intentions into concrete plans.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link className="button-primary" href={primaryHref}>
                {primaryLabel}
              </Link>
              <Link className="button-secondary" href="/connections">
                Explore the relationship workspace
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="section-card rounded-3xl p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">
                  {card.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground/75">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="relative flex flex-1 items-end bg-[linear-gradient(180deg,#203133_0%,#162224_100%)] p-6 text-white md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,196,111,0.35),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(209,96,61,0.28),transparent_26%)]" />
          <div className="relative z-10 grid gap-6">
            <div className="rounded-[1.75rem] border border-white/12 bg-white/8 p-6 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-white/60">Core loop</p>
              <ol className="mt-4 grid gap-3 text-lg leading-7 text-white/88">
                <li>1. Add a person or group you care about.</li>
                <li>2. Pick a cadence that feels healthy.</li>
                <li>3. Notice who is drifting before it gets awkward.</li>
                <li>4. Log the coffee, call, dinner, or quick check-in.</li>
                <li>5. Let the next reconnect be easier than the last.</li>
              </ol>
            </div>

            <div className="rounded-[1.75rem] border border-white/12 bg-white/6 p-6 text-sm leading-7 text-white/75">
              This initial build keeps the scope disciplined: magic-link auth, connection and group CRUD, cadence health, touchpoint history, and a reminder-oriented dashboard.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
