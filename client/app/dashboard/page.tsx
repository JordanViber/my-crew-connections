import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConnectionLinkBadge } from "@/components/connection-link-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { HangoutList } from "@/components/hangout-list";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { cancelHangoutAction, completeHangoutAction, createTouchpointAction } from "@/app/actions";
import { getFeedback } from "@/lib/feedback";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function StatChip({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/72 px-3 py-2">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">{label}</p>
      <p className="text-base font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function MobileRelationshipRail({
  title,
  description,
  items,
  emptyCopy,
}: Readonly<{
  title: string;
  description: string;
  items: Awaited<ReturnType<typeof getDashboardData>>["relationships"];
  emptyCopy: string;
}>) {
  return (
    <section className="section-card rounded-[1.6rem] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-foreground/68">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm leading-6 text-foreground/68">{emptyCopy}</p>
      ) : (
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
          {items.map((item) => (
            <article
              key={`${item.targetType}:${item.id}`}
              className="min-w-[16rem] snap-start rounded-[1.35rem] border border-border/85 bg-white/82 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent-strong">{item.targetType}</p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-foreground/70">{item.subtitle}</p>
                </div>
                <StatusPill health={item.health} />
              </div>

              <div className="mt-4 space-y-2 text-sm text-foreground/68">
                <p>{item.cadenceLabel}</p>
                <p>{item.health.summary}</p>
                {item.targetType === "connection" ? (
                  <div className="pt-1">
                    <ConnectionLinkBadge linkState={item.linkState} pendingInviteEmail={item.pendingInviteEmail} />
                  </div>
                ) : null}
              </div>

              <Link className="button-secondary mt-4 inline-flex" href={`/${item.targetType === "connection" ? "connections" : "groups"}/${item.id}`}>
                Open details
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function getNeedsAttentionEmptyCopy(relationshipCount: number) {
  if (relationshipCount === 0) {
    return "Nothing is due soon yet. Add a person or group and set a cadence to start the loop.";
  }

  return "Nothing needs attention right now. Your current people and groups are on track.";
}

function getRecentHistoryEmptyCopy(relationshipCount: number) {
  if (relationshipCount === 0) {
    return "No touchpoints yet. Your first log will appear here immediately.";
  }

  return "No touchpoints yet. Log your first hangout, check-in, call, or message to turn this into a useful memory trail.";
}

function getReminderQueueEmptyCopy(relationshipCount: number) {
  if (relationshipCount === 0) {
    return "Your reminder queue is clear right now. Keep logging touchpoints and the queue will stay honest.";
  }

  return "Your reminder queue is clear right now because your current people and groups are on track.";
}

function MobileRecentHistory({
  touchpoints,
  emptyCopy,
}: Readonly<{
  touchpoints: Awaited<ReturnType<typeof getDashboardData>>["recentTouchpoints"];
  emptyCopy: string;
}>) {
  return (
    <section className="section-card rounded-[1.6rem] p-4">
      <div className="mb-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent history</h2>
        <p className="mt-1 text-sm leading-6 text-foreground/68">Quick memory context without burying the main actions.</p>
      </div>

      {touchpoints.length === 0 ? (
        <p className="text-sm leading-6 text-foreground/68">{emptyCopy}</p>
      ) : (
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
          {touchpoints.slice(0, 4).map((touchpoint) => (
            <article key={touchpoint.id} className="min-w-[16rem] snap-start rounded-[1.3rem] border border-border/85 bg-white/78 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">{touchpoint.touchpointType}</p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{touchpoint.targetLabel}</h3>
                </div>
                <p className="text-sm text-foreground/60">{touchpoint.occurredAtLabel}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/72">{touchpoint.note}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NextStepCard({
  title,
  description,
  ctaHref,
  ctaLabel,
}: Readonly<{
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}>) {
  return (
    <section className="section-card rounded-[1.6rem] p-4 md:p-5">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-accent-strong">Recommended next step</p>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-foreground/68">{description}</p>
      <Link className="button-secondary mt-4 inline-flex" href={ctaHref}>
        {ctaLabel}
      </Link>
    </section>
  );
}

function RelationshipList({
  items,
  emptyCopy,
  ctaLabel = "Open details",
}: Readonly<{
  items: Awaited<ReturnType<typeof getDashboardData>>["relationships"];
  emptyCopy: string;
  ctaLabel?: string;
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
              {item.targetType === "connection" ? (
                <div className="mt-3">
                  <ConnectionLinkBadge linkState={item.linkState} pendingInviteEmail={item.pendingInviteEmail} />
                </div>
              ) : null}
              {item.nextHangoutLabel ? (
                <p className="mt-2 text-sm text-foreground/65">Next plan: {item.nextHangoutLabel}</p>
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <StatusPill health={item.health} />
              <p className="max-w-xs text-sm text-foreground/65">{item.health.summary}</p>
              <Link className="button-secondary" href={`/${item.targetType === "connection" ? "connections" : "groups"}/${item.id}`}>
                {ctaLabel}
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

export default async function DashboardPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ feedback?: string }>;
}>) {
  const params = await searchParams;
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const supabase = createServerAdminSupabaseClient();
  const data = await getDashboardData(supabase, user.id);
  const needsAttention = [...data.overdue, ...data.dueSoon];
  const feedback = getFeedback(params.feedback);
  const hasRelationships = data.relationships.length > 0;
  const needsAttentionEmptyCopy = getNeedsAttentionEmptyCopy(data.relationships.length);
  const recentHistoryEmptyCopy = getRecentHistoryEmptyCopy(data.relationships.length);
  const reminderQueueEmptyCopy = getReminderQueueEmptyCopy(data.relationships.length);
  const firstRelationship = data.relationships[0];
  const nextStep = !hasRelationships
    ? {
        title: "Add the first relationship",
        description: "Start with one person or one group that matters. The dashboard becomes useful as soon as the first cadence exists.",
        ctaHref: "/connections",
        ctaLabel: "Add a person",
      }
    : data.recentTouchpoints.length === 0
      ? {
          title: "Log the first real interaction",
          description: "You already have someone in the system. One quick hangout, message, or call turns the app from setup into something personally useful.",
          ctaHref: firstRelationship
            ? `/${firstRelationship.targetType === "connection" ? "connections" : "groups"}/${firstRelationship.id}`
            : "/dashboard",
          ctaLabel: "Open the first relationship",
        }
      : needsAttention.length > 0 && firstRelationship
        ? {
            title: "Act on the next relationship at risk",
            description: "You have active reminder pressure now. Open the first due relationship and either plan something or log the contact that already happened.",
            ctaHref: `/${needsAttention[0].targetType === "connection" ? "connections" : "groups"}/${needsAttention[0].id}`,
            ctaLabel: "Open next relationship",
          }
        : {
            title: "Keep the rhythm going",
            description: "Everything is on track right now. Use the dashboard to log the next real-world touchpoint as soon as it happens.",
            ctaHref: "/dashboard",
            ctaLabel: "Use quick log",
          };

  return (
    <AppShell
      title="Your relationship dashboard"
      subtitle="Keep the MVP loop tight: notice drift, take action, and leave yourself just enough context to make the next reconnect easy."
      email={user.email ?? "Signed in"}
    >
      {feedback ? (
        <div className="mb-4">
          <FeedbackBanner title={feedback.title} body={feedback.body} tone={feedback.tone} />
        </div>
      ) : null}

      <MobileSectionTabs
        initialSectionId="focus"
        sections={[
          {
            id: "focus",
            label: "Focus",
            content: (
              <div className="grid gap-4">
                <section className="section-card rounded-[1.6rem] p-4">
                  <div className="flex flex-wrap gap-2">
                    <StatChip label="Needs now" value={String(needsAttention.length)} />
                    <StatChip label="Plans" value={String(data.upcomingHangouts.length)} />
                    <StatChip label="People" value={String(data.connections.length)} />
                    <StatChip label="Groups" value={String(data.groups.length)} />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-foreground/68">
                    A compact pulse check. The sections below explain what actually needs attention and what to do next.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="button-secondary" href="/connections">
                      Manage people
                    </Link>
                    <Link className="button-secondary" href="/groups">
                      Manage groups
                    </Link>
                  </div>
                </section>

                <MobileRelationshipRail
                  title="Needs attention"
                  description="Swipe through the people and groups most at risk of slipping."
                  items={needsAttention}
                  emptyCopy={needsAttentionEmptyCopy}
                />

                <section className="section-card rounded-[1.6rem] p-4">
                  <div className="mb-3">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Reminder queue</h2>
                    <p className="mt-1 text-sm leading-6 text-foreground/68">
                      Cadence-driven guidance with one-click paths into the relationship that needs you next.
                    </p>
                  </div>
                  <RelationshipList
                    items={needsAttention.slice(0, 3)}
                    emptyCopy={reminderQueueEmptyCopy}
                    ctaLabel="Take action"
                  />
                </section>

                <NextStepCard
                  title={nextStep.title}
                  description={nextStep.description}
                  ctaHref={nextStep.ctaHref}
                  ctaLabel={nextStep.ctaLabel}
                />
              </div>
            ),
          },
          {
            id: "log",
            label: "Log",
            content: hasRelationships ? (
              <section className="section-card rounded-[1.6rem] p-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">Quick log</h2>
                  <p className="mt-1 text-sm leading-6 text-foreground/68">Capture the moment without leaving the dashboard.</p>
                </div>

                <form action={createTouchpointAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="redirectTo" value="/dashboard" />
                  <label className="grid gap-2">
                    <span className="field-label">Target</span>
                    <select
                      className="field-input"
                      name="targetRef"
                      defaultValue={firstRelationship ? `${firstRelationship.targetType}:${firstRelationship.id}` : undefined}
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="field-label">Type</span>
                      <select className="field-input" name="touchpointType" defaultValue="hangout">
                        <option value="hangout">Hangout</option>
                        <option value="check-in">Check-in</option>
                        <option value="message">Message</option>
                        <option value="call">Call</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="field-label">When</span>
                      <input className="field-input" name="occurredAt" type="datetime-local" defaultValue={toDateTimeLocalValue()} required />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="field-label">Activity</span>
                      <input className="field-input" name="activityLabel" type="text" placeholder="Coffee, walk, dinner" />
                    </label>
                    <label className="grid gap-2">
                      <span className="field-label">Location</span>
                      <input className="field-input" name="locationLabel" type="text" placeholder="Optional freeform place" />
                    </label>
                  </div>
                  <label className="grid gap-2">
                    <span className="field-label">Note</span>
                    <textarea className="field-input min-h-24" name="note" placeholder="What mattered, what to remember, or what to plan next." />
                  </label>
                  <p className="text-sm leading-6 text-foreground/68">
                    Saving this updates the history feed and recalculates the next reminder window immediately.
                  </p>
                  <button className="button-primary" type="submit">
                    Log touchpoint
                  </button>
                </form>
              </section>
            ) : (
              <section className="section-card rounded-[1.6rem] p-4">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">First step</h2>
                <p className="mt-2 text-sm leading-6 text-foreground/68">
                  Create a person or group first, then quick log becomes the fastest way to keep the dashboard honest.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link className="button-secondary" href="/connections">
                    Add a person
                  </Link>
                  <Link className="button-secondary" href="/groups">
                    Create a group
                  </Link>
                </div>
              </section>
            ),
          },
          {
            id: "plans",
            label: "Plans",
            content: (
              <div className="grid gap-4">
                <section className="section-card rounded-[1.6rem] p-4">
                  <div className="mb-3">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Upcoming plans</h2>
                    <p className="mt-1 text-sm leading-6 text-foreground/68">
                      Saved hangouts stay visible here so planning is no longer a one-and-done export.
                    </p>
                  </div>
                  <HangoutList
                    hangouts={data.upcomingHangouts}
                    emptyCopy="No saved plans yet. Create one from a person or group detail page and it will stay visible here."
                    completeAction={completeHangoutAction}
                    cancelAction={cancelHangoutAction}
                    redirectTo="/dashboard"
                    showTargetLabel
                  />
                </section>

                <MobileRelationshipRail
                  title="Steady connections"
                  description="Swipe through the people and groups that are comfortably on track."
                  items={data.onTrack}
                  emptyCopy="No on-track relationships yet. Your first logged touchpoint will start the rhythm."
                />
              </div>
            ),
          },
          {
            id: "history",
            label: "History",
            content: (
              <div className="grid gap-4">
                <MobileRecentHistory touchpoints={data.recentTouchpoints} emptyCopy={recentHistoryEmptyCopy} />
                {data.recentTouchpoints.length === 0 ? (
                  <section className="section-card rounded-[1.6rem] p-4">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Start the memory trail</h2>
                    <p className="mt-2 text-sm leading-6 text-foreground/68">
                      The app gets more helpful after the first real-world touchpoint because reminders, history, and next-plan context all become grounded in something real.
                    </p>
                  </section>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      <div className="hidden gap-6 md:grid xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <NextStepCard
            title={nextStep.title}
            description={nextStep.description}
            ctaHref={nextStep.ctaHref}
            ctaLabel={nextStep.ctaLabel}
          />

          <SectionCard
            title="Reminder queue"
            description="This is the in-app reminder surface for the current MVP. It explains who needs attention and gives you a direct action path without relying on push or email."
          >
            <RelationshipList
              items={needsAttention}
              emptyCopy={reminderQueueEmptyCopy}
              ctaLabel="Take action"
            />
          </SectionCard>

          <SectionCard
            title="Needs attention"
            description="The people and groups most at risk of slipping. This is the core behavior-change surface."
          >
            <RelationshipList items={needsAttention} emptyCopy={needsAttentionEmptyCopy} ctaLabel="Open details" />
          </SectionCard>

          <SectionCard
            title="Upcoming plans"
            description="Saved hangouts now live in the product instead of disappearing after a one-time calendar export."
          >
            <HangoutList
              hangouts={data.upcomingHangouts}
              emptyCopy="No saved plans yet. Create one from a person or group detail page and it will show up here."
              completeAction={completeHangoutAction}
              cancelAction={cancelHangoutAction}
              redirectTo="/dashboard"
              showTargetLabel
            />
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
              <input type="hidden" name="redirectTo" value="/dashboard" />
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
              <p className="text-sm leading-6 text-foreground/68">
                This is the fastest way to keep the dashboard honest. After save, the reminder queue and recent history will refresh.
              </p>
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
                <p className="text-sm leading-7 text-foreground/68">{recentHistoryEmptyCopy}</p>
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
