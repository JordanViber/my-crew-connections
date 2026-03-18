import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { createTouchpointAction } from "@/app/actions";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function RelationshipList({
  items,
  emptyCopy,
}: Readonly<{
  items: Awaited<ReturnType<typeof getDashboardData>>["relationships"];
  emptyCopy: string;
}>) {
  if (items.length === 0) {
    return <p className="text-sm leading-7 text-foreground/68">{emptyCopy}</p>;
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <article key={`${item.targetType}:${item.id}`} className="rounded-[1.4rem] border border-border/90 bg-white/80 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">{item.targetType}</p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1 text-sm leading-7 text-foreground/70">{item.subtitle}</p>
              <p className="mt-2 text-sm font-medium text-foreground/70">{item.cadenceLabel}</p>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <StatusPill health={item.health} />
              <p className="text-sm text-foreground/65">{item.health.summary}</p>
              <Link className="button-secondary" href={`/${item.targetType === "connection" ? "connections" : "groups"}/${item.id}`}>
                Open details
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function toDateTimeLocalValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const data = await getDashboardData(supabase, user.id);

  return (
    <AppShell
      title="Your relationship dashboard"
      subtitle="Keep the MVP loop tight: notice drift, take action, and leave yourself just enough context to make the next reconnect easy."
      email={user.email ?? "Signed in"}
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <SectionCard
            title="Needs attention"
            description="The people and groups most at risk of slipping. This is the core behavior-change surface."
          >
            <RelationshipList items={[...data.overdue, ...data.dueSoon]} emptyCopy="Nothing is due soon yet. Add a person or group and set a cadence to start the loop." />
          </SectionCard>

          <SectionCard
            title="Steady connections"
            description="These relationships are comfortably on track, so the product feels encouraging instead of nagging."
          >
            <RelationshipList items={data.onTrack} emptyCopy="No on-track relationships yet. Your first logged touchpoint will start the rhythm." />
          </SectionCard>
        </div>

        <div className="grid gap-6">
          <SectionCard
            title="Quick log"
            description="Minimal friction beats perfect detail. Log a check-in, call, or hangout straight from the dashboard."
          >
            <form action={createTouchpointAction} className="grid gap-4">
              <label className="grid gap-2">
                <span className="field-label">Target</span>
                <select
                  className="field-input"
                  name="targetRef"
                  defaultValue={data.relationships[0] ? `${data.relationships[0].targetType}:${data.relationships[0].id}` : undefined}
                  required
                >
                  {data.relationships.map((relationship) => (
                    <option
                      key={`${relationship.targetType}:${relationship.id}`}
                      value={`${relationship.targetType}:${relationship.id}`}
                    >
                      {relationship.title} ({relationship.targetType})
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="field-label">Touchpoint type</span>
                <select className="field-input" name="touchpointType" defaultValue="hangout">
                  <option value="hangout">Hangout</option>
                  <option value="check-in">Check-in</option>
                  <option value="message">Message</option>
                  <option value="call">Call</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="field-label">When did it happen?</span>
                <input className="field-input" name="occurredAt" type="datetime-local" defaultValue={toDateTimeLocalValue()} required />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Activity</span>
                <input className="field-input" name="activityLabel" type="text" placeholder="Coffee, walk, dinner, game night" />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Location</span>
                <input className="field-input" name="locationLabel" type="text" placeholder="Freeform for MVP" />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Note</span>
                <textarea className="field-input min-h-28" name="note" placeholder="What mattered, what to remember, or what to plan next." />
              </label>
              <button className="button-primary" type="submit" disabled={data.relationships.length === 0}>
                Log touchpoint
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Recent history"
            description="Lightweight memory context keeps the product personal without overbuilding archival features."
          >
            <div className="grid gap-4">
              {data.recentTouchpoints.length === 0 ? (
                <p className="text-sm leading-7 text-foreground/68">No touchpoints yet. Your first log will appear here immediately.</p>
              ) : (
                data.recentTouchpoints.map((touchpoint) => (
                  <article key={touchpoint.id} className="rounded-[1.3rem] border border-border/85 bg-white/78 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-strong">{touchpoint.touchpointType}</p>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">{touchpoint.targetLabel}</h3>
                        <p className="mt-2 text-sm leading-7 text-foreground/72">{touchpoint.note}</p>
                      </div>
                      <p className="text-sm text-foreground/60">{touchpoint.occurredAtLabel}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Move fast" description="The focused routes for this first milestone.">
            <div className="flex flex-wrap gap-3">
              <Link className="button-secondary" href="/connections">
                Manage people
              </Link>
              <Link className="button-secondary" href="/groups">
                Manage groups
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}