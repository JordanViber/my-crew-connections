import { PrefetchLink } from "@/components/prefetch-link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConnectionLinkBadge } from "@/components/connection-link-badge";
import { ExternalLink } from "@/components/external-link";
import { FeedbackBanner } from "@/components/feedback-banner";
import { HangoutList } from "@/components/hangout-list";
import { IncomingConnectionInvites } from "@/components/incoming-connection-invites";
import { IncomingGroupInvites } from "@/components/incoming-group-invites";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";
import { PhotoAlbumFields } from "@/components/photo-album-fields";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { cancelHangoutAction, completeHangoutAction, confirmHangoutProposalAction, createTouchpointAction, respondToHangoutProposalAction } from "@/app/actions";
import { canCreateConnection, canCreateGroup, getFreeTierUsageLabel, hasPremiumAccess } from "@/lib/entitlements";
import { getIncomingConnectionInvites } from "@/lib/connection-invites";
import { getIncomingGroupInvites } from "@/lib/group-invites";
import { getFeedback } from "@/lib/feedback";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserDisplayName, getUserFirstName } from "@/lib/user-display";

function DetailActionLabel({ label = "Open details" }: Readonly<{ label?: string }>) {
  return (
    <span className="inline-flex min-h-9 items-center justify-center rounded-md border border-accent/25 bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent-strong transition group-hover:border-accent/40 group-hover:bg-[rgba(209,96,61,0.18)]">
      {label}
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  trend,
  href,
  accent = "emerald",
}: Readonly<{
  icon: string;
  label: string;
  value: number | string;
  trend?: string;
  href: string;
  accent?: "emerald" | "amber";
}>) {
  const accentClass = accent === "emerald" 
    ? "border-emerald-500/30 bg-emerald-500/5" 
    : "border-amber-500/30 bg-amber-500/5";

  return (
    <PrefetchLink
      aria-label={`Open ${label.toLowerCase()}`}
      className={`group rounded-2xl border ${accentClass} p-4 transition-all hover:-translate-y-px hover:shadow-lg focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] active:scale-[0.985]`}
      href={href}
    >
      <div className="flex items-start justify-between">
        <div className="text-2xl opacity-90">{icon}</div>
        {trend && (
          <div className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-foreground/70 shadow-sm">
            {trend}
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-foreground/70">{label}</p>
        <p className="mt-1 text-[2.1rem] font-semibold tracking-tighter text-foreground tabular-nums">{value}</p>
      </div>
    </PrefetchLink>
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
    <section className="section-card p-3.5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-foreground/68">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm leading-6 text-foreground/68">{emptyCopy}</p>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const groupMembershipSummary = getGroupMembershipSummary(item);
            const itemHref = `/${item.targetType === "connection" ? "connections" : "groups"}/${item.id}`;

            return (
              <PrefetchLink
                key={`${item.targetType}:${item.id}`}
                className="group block rounded-lg border border-border/85 bg-white/82 p-3.5 transition hover:border-accent/45 hover:bg-white/90"
                href={itemHref}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent-strong">{item.targetType}</p>
                    <h3 className="mt-1.5 text-[1.1rem] font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm text-foreground/70">{item.subtitle}</p>
                  </div>
                  <StatusPill health={item.health} />
                </div>

                <div className="mt-3 space-y-2 text-sm text-foreground/68">
                  <p>{item.cadenceLabel}</p>
                  <p>{item.health.summary}</p>
                  {item.targetType === "connection" ? (
                    <div className="pt-1">
                      <ConnectionLinkBadge linkState={item.linkState} pendingInviteEmail={item.pendingInviteEmail} />
                    </div>
                  ) : null}
                  {item.targetType === "group" && groupMembershipSummary ? <p>{groupMembershipSummary}</p> : null}
                </div>

                <div className="mt-3">
                  <DetailActionLabel />
                </div>
              </PrefetchLink>
            );
          })}
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
    <section className="section-card p-3.5">
      <div className="mb-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent history</h2>
        <p className="mt-1 text-sm leading-6 text-foreground/68">Quick memory context without burying the main actions.</p>
      </div>

      {touchpoints.length === 0 ? (
        <p className="text-sm leading-6 text-foreground/68">{emptyCopy}</p>
      ) : (
        <div className="grid gap-3">
          {touchpoints.slice(0, 4).map((touchpoint) => (
            <article key={touchpoint.id} className="group relative rounded-lg border border-border/85 bg-white/78 p-3.5 transition hover:border-accent/45 hover:bg-white/90">
              <PrefetchLink
                aria-label={`Open touchpoint details for ${touchpoint.targetLabel}`}
                className="absolute inset-0 rounded-lg"
                href={`/touchpoints/${touchpoint.id}`}
              />
              <div className="pointer-events-none relative z-10 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">{touchpoint.touchpointType}</p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{touchpoint.targetLabel}</h3>
                </div>
                <p className="text-sm text-foreground/60">{touchpoint.occurredAtLabel}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/72">{touchpoint.note}</p>
              {touchpoint.photoAlbumUrl ? (
                <p className="relative z-10 mt-2 text-sm text-foreground/68">
                  Shared photo album:{" "}
                  <ExternalLink className="pointer-events-auto inline-flex items-center gap-1.5 font-medium text-accent-strong underline underline-offset-2" href={touchpoint.photoAlbumUrl}>
                    {touchpoint.photoAlbumLabel || "Open album"}
                  </ExternalLink>
                </p>
              ) : null}
              <p className="mt-2 text-sm font-semibold text-accent-strong">Open touchpoint details</p>
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
    <section className="section-card p-3.5 md:p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-accent-strong">Recommended next step</p>
      <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-foreground/68">{description}</p>
      <PrefetchLink className="button-secondary mt-3 inline-flex" href={ctaHref}>
        {ctaLabel}
      </PrefetchLink>
    </section>
  );
}

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
      {items.map((item) => {
        const groupMembershipSummary = getGroupMembershipSummary(item);
        const itemHref = `/${item.targetType === "connection" ? "connections" : "groups"}/${item.id}`;

        return (
          <PrefetchLink
            key={`${item.targetType}:${item.id}`}
            className="group block rounded-lg border border-border/90 bg-white/80 p-3.5 transition hover:border-accent/45 hover:bg-white/90"
            href={itemHref}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-accent-strong">{item.targetType}</p>
                <h3 className="mt-1.5 text-[1.1rem] font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm leading-7 text-foreground/70">{item.subtitle}</p>
                <p className="mt-2 text-sm font-medium text-foreground/70">{item.cadenceLabel}</p>
                {item.targetType === "connection" ? (
                  <div className="mt-3">
                    <ConnectionLinkBadge linkState={item.linkState} pendingInviteEmail={item.pendingInviteEmail} />
                  </div>
                ) : null}
                {item.targetType === "group" && groupMembershipSummary ? (
                  <p className="mt-2 text-sm text-foreground/65">{groupMembershipSummary}</p>
                ) : null}
                {item.nextHangoutLabel ? (
                  <p className="mt-2 text-sm text-foreground/65">Next plan: {item.nextHangoutLabel}</p>
                ) : null}
              </div>

              <div className="flex flex-col items-start gap-3 md:items-end">
                <StatusPill health={item.health} />
                <p className="max-w-xs text-sm text-foreground/65">{item.health.summary}</p>
                <DetailActionLabel />
              </div>
            </div>
          </PrefetchLink>
        );
      })}
    </div>
  );
}

function getGroupMembershipSummary(item: Awaited<ReturnType<typeof getDashboardData>>["relationships"][number]) {
  if (item.targetType !== "group") {
    return null;
  }

  const summaryParts = [`${item.memberNames.length} accepted`];

  if (item.pendingMemberCount > 0) {
    summaryParts.push(`${item.pendingMemberCount} pending`);
  }

  return summaryParts.join(" • ");
}

function toDateTimeLocalValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function getRelationshipHref(relationship?: Awaited<ReturnType<typeof getDashboardData>>["relationships"][number]) {
  if (!relationship) {
    return "/dashboard";
  }

  const basePath = relationship.targetType === "connection" ? "connections" : "groups";
  return `/${basePath}/${relationship.id}`;
}

function getNextStepCard(
  hasRelationships: boolean,
) {
  return hasRelationships
    ? null
    : {
        title: "Add the first relationship",
        description: "Start with one person or one group that matters. The dashboard becomes useful as soon as the first cadence exists.",
        ctaHref: "/connections",
        ctaLabel: "Add a person",
      };
}

export default async function DashboardPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ feedback?: string; exportHangoutId?: string; section?: string }>;
}>) {
  const params = await searchParams;
  const authSupabase = await createServerSupabaseClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const supabase = createServerAdminSupabaseClient();
  const data = await getDashboardData(supabase, user.id);
  const [incomingConnectionInvites, incomingGroupInvites] = await Promise.all([
    getIncomingConnectionInvites(supabase, user.email),
    getIncomingGroupInvites(supabase, user.email),
  ]);
  const { data: billingProfile } = await supabase
    .from("profiles")
    .select("stripe_subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  const needsAttention = [...data.overdue, ...data.dueSoon];
  const feedback = getFeedback(params.feedback);
  const hasRelationships = data.relationships.length > 0;
  const needsAttentionEmptyCopy = getNeedsAttentionEmptyCopy(data.relationships.length);
  const recentHistoryEmptyCopy = getRecentHistoryEmptyCopy(data.relationships.length);
  const reminderQueueEmptyCopy = getReminderQueueEmptyCopy(data.relationships.length);
  const firstRelationship = data.relationships[0];
  const nextStep = getNextStepCard(hasRelationships);
  const hasPremium = hasPremiumAccess(billingProfile, user.email);
  const canAddConnection = canCreateConnection(billingProfile, data.connections.length, user.email);
  const canAddGroup = canCreateGroup(billingProfile, data.ownedGroupCount, user.email);
  const showUpgradePrompt = !hasPremium && (!canAddConnection || !canAddGroup);
  const upgradeUsageParts: string[] = [];

  if (!canAddConnection) {
    upgradeUsageParts.push(getFreeTierUsageLabel("connection", data.connections.length));
  }

  if (!canAddGroup) {
    upgradeUsageParts.push(getFreeTierUsageLabel("group", data.ownedGroupCount));
  }

  const upgradeUsageLabel = upgradeUsageParts.join(" / ");

  return (
    <AppShell
      title="Your relationship dashboard"
      subtitle="See who needs care, what is already planned, and what deserves a quick note before the moment slips away."
      email={user.email ?? "Signed in"}
      firstName={getUserFirstName(user)}
      displayName={getUserDisplayName(user)}
    >
      {feedback ? (
        <div className="mb-4">
          <FeedbackBanner title={feedback.title} body={feedback.body} tone={feedback.tone} />
        </div>
      ) : null}

      <div className="mb-4 grid gap-3">
        <IncomingGroupInvites invites={incomingGroupInvites} />
        <IncomingConnectionInvites invites={incomingConnectionInvites} redirectTo="/dashboard" />
      </div>

      <MobileSectionTabs
        initialSectionId={params.section || (params.exportHangoutId ? "plans" : "focus")}
        sections={[
          {
            id: "focus",
            label: "Focus",
            content: (
              <div className="grid gap-4">
                <section className="section-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">Pulse Check</h3>
                      <p className="text-sm text-foreground/68">Your crew at a glance</p>
                    </div>
                    <div className="text-xs font-medium text-foreground/60">Updated just now</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <MetricCard 
                      icon="🔥" 
                      label="Needs Now" 
                      value={needsAttention.length} 
                      trend={needsAttention.length > 0 ? "↑2 this week" : undefined}
                      href={needsAttention[0] ? getRelationshipHref(needsAttention[0]) : "/dashboard?section=focus#reminder-queue"}
                      accent="amber" 
                    />
                    <MetricCard 
                      icon="📅" 
                      label="Plans" 
                      value={data.upcomingHangouts.length} 
                      trend={data.upcomingHangouts.length > 0 ? "+1 new" : undefined}
                      href="/dashboard?section=plans"
                    />
                    <MetricCard 
                      icon="👥" 
                      label="People" 
                      value={data.connections.length} 
                      href="/connections"
                    />
                    <MetricCard 
                      icon="👥👥" 
                      label="Groups" 
                      value={data.groups.length} 
                      href="/groups"
                    />
                  </div>

                  <p className="mt-4 text-sm leading-6 text-foreground/68">
                    A quick pulse check for what needs care next and what can wait.
                  </p>

                </section>

                {nextStep ? (
                  <NextStepCard
                    title={nextStep.title}
                    description={nextStep.description}
                    ctaHref={nextStep.ctaHref}
                    ctaLabel={nextStep.ctaLabel}
                  />
                ) : null}
                {showUpgradePrompt ? (
                  <UpgradePrompt
                    compact
                    title="Premium is ready when your circle grows"
                    body="You have proved the rhythm. Upgrade when you want every person and recurring crew to have its own cadence, plans, and memory trail."
                    usageLabel={upgradeUsageLabel}
                  />
                ) : null}

                <MobileRelationshipRail
                  title="Needs attention"
                  description="Swipe through the people and groups most at risk of slipping."
                  items={needsAttention}
                  emptyCopy={needsAttentionEmptyCopy}
                />

                <section id="reminder-queue" className="section-card scroll-mt-4 p-3.5">
                  <div className="mb-3">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Reminder queue</h2>
                    <p className="mt-1 text-sm leading-6 text-foreground/68">
                      See who could use the next nudge, plan, or check-in.
                    </p>
                  </div>
                  <RelationshipList
                    items={needsAttention.slice(0, 3)}
                    emptyCopy={reminderQueueEmptyCopy}
                  />
                </section>
              </div>
            ),
          },
          {
            id: "log",
            label: "Log",
            content: hasRelationships ? (
              <section className="section-card p-3.5">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">Quick log</h2>
                  <p className="mt-1 text-sm leading-6 text-foreground/68">Capture the moment without leaving your dashboard.</p>
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
                      <input className="field-input" name="locationLabel" type="text" placeholder="Cafe, park, restaurant, or neighborhood" />
                    </label>
                  </div>
                  <label className="grid gap-2">
                    <span className="field-label">Note</span>
                    <textarea className="field-input min-h-24" name="note" placeholder="What mattered, what to remember, or what to plan next." />
                  </label>
                  <PhotoAlbumFields />
                  <p className="text-sm leading-6 text-foreground/68">
                    Saving this refreshes your history and reminder timing right away.
                  </p>
                  <button className="button-primary" type="submit">
                    Log touchpoint
                  </button>
                </form>
              </section>
            ) : (
              <section className="section-card p-3.5">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">First step</h2>
                <p className="mt-2 text-sm leading-6 text-foreground/68">
                  Add a person or group first, then quick log becomes the easiest way to keep your rhythm grounded in real life.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PrefetchLink className="button-secondary" href="/connections">
                    Add a person
                  </PrefetchLink>
                  <PrefetchLink className="button-secondary" href="/groups">
                    Create a group
                  </PrefetchLink>
                </div>
              </section>
            ),
          },
          {
            id: "plans",
            label: "Plans",
            content: (
              <div className="grid gap-4">
                <section className="section-card p-3.5">
                  <div className="mb-3">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Upcoming plans</h2>
                    <p className="mt-1 text-sm leading-6 text-foreground/68">
                      Keep upcoming plans visible until they happen, change, or get canceled.
                    </p>
                  </div>
                  <HangoutList
                    hangouts={data.upcomingHangouts}
                    emptyCopy="No saved plans yet. Create one from a person or group detail page and it will stay visible here."
                    confirmAction={confirmHangoutProposalAction}
                    completeAction={completeHangoutAction}
                    cancelAction={cancelHangoutAction}
                    respondAction={respondToHangoutProposalAction}
                    redirectTo="/dashboard"
                    autoExportHangoutId={params.exportHangoutId}
                    showTargetLabel
                  />
                </section>

                <MobileRelationshipRail
                  title="Steady connections"
                  description="Swipe through the people and groups already moving in a healthy rhythm."
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
              <div className="grid gap-4 px-1">
                <MobileRecentHistory touchpoints={data.recentTouchpoints} emptyCopy={recentHistoryEmptyCopy} />
                {data.recentTouchpoints.length === 0 ? (
                  <section className="section-card p-3.5">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Start the memory trail</h2>
                    <p className="mt-2 text-sm leading-6 text-foreground/68">
                      Things get more helpful after the first real-world touchpoint because reminders, history, and future plans all become more personal.
                    </p>
                  </section>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      <div className="hidden gap-5 md:grid xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-5">
          {nextStep ? (
            <NextStepCard
              title={nextStep.title}
              description={nextStep.description}
              ctaHref={nextStep.ctaHref}
              ctaLabel={nextStep.ctaLabel}
            />
          ) : null}
          {showUpgradePrompt ? (
            <UpgradePrompt
              compact
              title="Premium is ready when your circle grows"
              body="You have proved the rhythm. Upgrade when you want every person and recurring crew to have its own cadence, plans, and memory trail."
              usageLabel={upgradeUsageLabel}
            />
          ) : null}

          <SectionCard
            title="Reminder queue"
            description="See who could use the next nudge, plan, or check-in without digging through separate lists."
          >
            <RelationshipList
              items={needsAttention}
              emptyCopy={reminderQueueEmptyCopy}
            />
          </SectionCard>

          <SectionCard
            title="Needs attention"
            description="The people and groups most likely to slip if nothing happens next."
          >
            <RelationshipList items={needsAttention} emptyCopy={needsAttentionEmptyCopy} />
          </SectionCard>

          <SectionCard
            title="Upcoming plans"
            description="Keep upcoming plans visible until they happen, change, or get canceled."
          >
            <HangoutList
              hangouts={data.upcomingHangouts}
              emptyCopy="No saved plans yet. Create one from a person or group detail page and it will show up here."
              confirmAction={confirmHangoutProposalAction}
              completeAction={completeHangoutAction}
              cancelAction={cancelHangoutAction}
              respondAction={respondToHangoutProposalAction}
              redirectTo="/dashboard"
              autoExportHangoutId={params.exportHangoutId}
              showTargetLabel
            />
          </SectionCard>

          <SectionCard
            title="Steady connections"
            description="These people and groups are in a comfortable rhythm right now."
          >
            <RelationshipList items={data.onTrack} emptyCopy="No on-track relationships yet. Your first logged touchpoint will start the rhythm." />
          </SectionCard>
        </div>

        <div className="grid gap-5">
          <SectionCard
            title="Quick log"
            description="Minimal friction beats perfect detail. Log a check-in, call, or hangout straight from the dashboard."
          >
            <form action={createTouchpointAction} className="grid gap-3">
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
                <input className="field-input" name="locationLabel" type="text" placeholder="Cafe, park, restaurant, or neighborhood" />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Note</span>
                <textarea className="field-input min-h-28" name="note" placeholder="What mattered, what to remember, or what to plan next." />
              </label>
              <PhotoAlbumFields />
              <p className="text-sm leading-6 text-foreground/68">
                After save, the reminder queue and recent history will refresh right away.
              </p>
              <button className="button-primary" type="submit" disabled={data.relationships.length === 0}>
                Log touchpoint
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Recent history"
            description="Quick memory cues that make the next invite easier."
          >
            <div className="grid gap-3">
              {data.recentTouchpoints.length === 0 ? (
                <p className="text-sm leading-7 text-foreground/68">{recentHistoryEmptyCopy}</p>
              ) : (
                data.recentTouchpoints.map((touchpoint) => (
                  <article key={touchpoint.id} className="group relative rounded-lg border border-border/85 bg-white/78 p-3.5 transition hover:border-accent/45 hover:bg-white/90">
                    <PrefetchLink
                      aria-label={`Open touchpoint details for ${touchpoint.targetLabel}`}
                      className="absolute inset-0 rounded-lg"
                      href={`/touchpoints/${touchpoint.id}`}
                    />
                    <div className="pointer-events-none relative z-10 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-strong">{touchpoint.touchpointType}</p>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">{touchpoint.targetLabel}</h3>
                        <p className="mt-2 text-sm leading-7 text-foreground/72">{touchpoint.note}</p>
                      </div>
                      <p className="text-sm text-foreground/60">{touchpoint.occurredAtLabel}</p>
                    </div>
                    {touchpoint.photoAlbumUrl ? (
                      <p className="relative z-10 mt-2 text-sm text-foreground/68">
                        Shared photo album:{" "}
                        <ExternalLink className="pointer-events-auto inline-flex items-center gap-1.5 font-medium text-accent-strong underline underline-offset-2" href={touchpoint.photoAlbumUrl}>
                          {touchpoint.photoAlbumLabel || "Open album"}
                        </ExternalLink>
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm font-semibold text-accent-strong">Open touchpoint details</p>
                  </article>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Shortcuts" description="Jump straight into the areas you use most.">
            <div className="flex flex-wrap gap-3">
              <PrefetchLink className="button-secondary" href="/connections">
                People
              </PrefetchLink>
              <PrefetchLink className="button-secondary" href="/groups">
                Groups
              </PrefetchLink>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
