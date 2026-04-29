import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ConnectionLinkSection } from "@/components/connection-link-section";
import { EditableDetailsForm } from "@/components/editable-details-form";
import { FeedbackBanner } from "@/components/feedback-banner";
import { HangoutList } from "@/components/hangout-list";
import { HangoutPlanForm } from "@/components/hangout-plan-form";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import {
  archiveConnectionAction,
  cancelHangoutAction,
  completeHangoutAction,
  createHangoutAction,
  createTouchpointAction,
  updateConnectionAction,
} from "@/app/actions";
import { getFeedback } from "@/lib/feedback";
import { buildConnectionInviteUrl } from "@/lib/invites";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserDisplayName, getUserFirstName } from "@/lib/user-display";

function toInputDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type ConnectionSummary = DashboardData["connections"][number];

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host") ?? "127.0.0.1:3100";

  return `${proto}://${host}`;
}

async function loadActiveInviteInfo(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  ownerUserId: string,
  connectionId: string,
  origin: string,
) {
  const inviteResult = await supabase
    .from("connection_invites")
    .select("id, invited_email, token, created_at, claimed_at, revoked_at")
    .eq("owner_user_id", ownerUserId)
    .eq("connection_id", connectionId)
    .is("claimed_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inviteResult.error) {
    throw new Error(`Failed to load invites: ${inviteResult.error.message}`);
  }

  if (!inviteResult.data) {
    return null;
  }

  return {
    email: inviteResult.data.invited_email,
    inviteUrl: buildConnectionInviteUrl(origin, inviteResult.data.token),
  };
}

async function loadLinkedUserLabel(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  connection: ConnectionSummary,
) {
  if (!connection.linkedUserId) {
    return null;
  }

  const linkedUserResult = await supabase.auth.admin.getUserById(connection.linkedUserId);

  if (linkedUserResult.error) {
    throw new Error(`Failed to load linked user: ${linkedUserResult.error.message}`);
  }

  return linkedUserResult.data.user?.email ?? "this app user";
}

export default async function ConnectionDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feedback?: string }>;
}>) {
  const { id } = await params;
  const query = await searchParams;
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const supabase = createServerAdminSupabaseClient();
  const data = await getDashboardData(supabase, user.id);
  const connection = data.connections.find((item) => item.id === id);

  if (!connection) {
    notFound();
  }

  const timeline = data.recentTouchpoints.filter(
    (touchpoint) => touchpoint.targetType === "connection" && touchpoint.targetId === connection.id,
  );
  const plannedHangouts = data.hangouts.filter(
    (hangout) => hangout.targetType === "connection" && hangout.targetId === connection.id && hangout.status === "planned",
  );
  const feedback = getFeedback(query.feedback);
  const latestActivity = timeline.find((touchpoint) => touchpoint.activityLabel || touchpoint.locationLabel);
  const requestOrigin = await getRequestOrigin();
  const activeInvite = await loadActiveInviteInfo(supabase, user.id, connection.id, requestOrigin);
  const linkedUserLabel = await loadLinkedUserLabel(supabase, connection);

  return (
    <AppShell
      title={connection.title}
      subtitle="Keep cadence, notes, invites, and plans easy to update in one place."
      email={user.email ?? "Signed in"}
      firstName={getUserFirstName(user)}
      displayName={getUserDisplayName(user)}
    >
      {feedback ? (
        <div className="mb-4">
          <FeedbackBanner title={feedback.title} body={feedback.body} tone={feedback.tone} />
        </div>
      ) : null}

      <MobileSectionTabs
        initialSectionId="manage"
        sections={[
          {
            id: "manage",
            label: "Manage",
            content: (
              <div className="grid gap-3">
                <SectionCard title="Connection profile" description={connection.subtitle}>
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <StatusPill health={connection.health} />
                    <p className="text-sm text-foreground/65">{connection.health.summary}</p>
                  </div>

                  <EditableDetailsForm
                    action={updateConnectionAction}
                    editLabel="Edit connection"
                    saveLabel="Save connection"
                    helperText="Keep this light. A few cues are enough to make the next reconnect easier."
                  >
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <input type="hidden" name="redirectTo" value={`/connections/${connection.id}`} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="field-label">Name</span>
                        <input className="field-input" name="displayName" type="text" defaultValue={connection.title} required />
                      </label>
                      <label className="grid gap-2">
                        <span className="field-label">Tags</span>
                        <input className="field-input" name="tags" type="text" defaultValue={connection.tags.join(", ")} />
                      </label>
                    </div>
                    <div className="grid gap-4">
                      <label className="grid gap-2">
                        <span className="field-label">Cadence value</span>
                        <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue={connection.cadenceValue} required />
                      </label>
                      <label className="grid gap-2">
                        <span className="field-label">Unit</span>
                        <select className="field-input" name="cadenceUnit" defaultValue={connection.cadenceUnit}>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="field-label">Reminder lead</span>
                        <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue={connection.reminderLeadDays} required />
                      </label>
                    </div>
                    <label className="grid gap-2">
                      <span className="field-label">Preferred activities</span>
                      <input className="field-input" name="preferredActivities" type="text" defaultValue={connection.preferredActivities ?? ""} />
                    </label>
                    <label className="grid gap-2">
                      <span className="field-label">Private notes</span>
                      <textarea className="field-input min-h-28" name="notes" defaultValue={connection.notes ?? ""} />
                    </label>
                  </EditableDetailsForm>

                  <form action={archiveConnectionAction} className="mt-4">
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <ConfirmSubmitButton
                      className="button-secondary w-full sm:w-auto"
                      confirmMessage="Archive this person and remove them from active reminder surfaces?"
                    >
                      Archive person
                    </ConfirmSubmitButton>
                  </form>
                </SectionCard>

                <SectionCard
                  title="Next plan context"
                  description="Small memory cues pulled from the latest activity and place data you already logged."
                >
                  {latestActivity ? (
                    <div className="grid gap-3">
                      <div className="rounded-lg border border-border/85 bg-white/78 p-3.5">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">Recent activity</p>
                        <p className="mt-2 text-base font-medium text-foreground">
                          {latestActivity.activityLabel ?? "No activity saved yet"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/85 bg-white/78 p-3.5">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">Recent place</p>
                        <p className="mt-2 text-base font-medium text-foreground">
                          {latestActivity.locationLabel ?? "No place saved yet"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-7 text-foreground/68">
                      Log one touchpoint with an activity or place and this section becomes your lightweight planning memory.
                    </p>
                  )}
                </SectionCard>

                <SectionCard
                  title="Invite them into the app"
                  description="Send an invite so they can connect this relationship to their own account."
                >
                  <ConnectionLinkSection
                    connectionId={connection.id}
                    redirectTo={`/connections/${connection.id}`}
                    linkedUserLabel={linkedUserLabel}
                    activeInvite={activeInvite}
                  />
                </SectionCard>
              </div>
            ),
          },
          {
            id: "log",
            label: "Log",
            content: (
              <SectionCard title="Log a touchpoint" description="Keep it quick. Even a two-minute update is enough to keep the dashboard honest.">
                <form action={createTouchpointAction} className="grid gap-4">
                  <input type="hidden" name="targetType" value="connection" />
                  <input type="hidden" name="targetId" value={connection.id} />
                  <input type="hidden" name="redirectTo" value={`/connections/${connection.id}`} />
                  <div className="grid gap-4 sm:grid-cols-2">
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
                      <input className="field-input" name="occurredAt" type="datetime-local" defaultValue={toInputDateTime()} required />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="field-label">Activity</span>
                      <input className="field-input" name="activityLabel" type="text" placeholder="Walk, dinner, coffee, check-in" />
                    </label>
                    <label className="grid gap-2">
                      <span className="field-label">Location</span>
                      <input className="field-input" name="locationLabel" type="text" placeholder="Optional freeform location" />
                    </label>
                  </div>
                  <label className="grid gap-2">
                    <span className="field-label">Note</span>
                    <textarea className="field-input min-h-28" name="note" placeholder="What mattered? Anything to remember for the next invite?" />
                  </label>
                  <p className="text-sm leading-6 text-foreground/68">
                    After save, this page will refresh with the new timeline entry and updated reminder timing.
                  </p>
                  <button className="button-primary" type="submit">
                    Save touchpoint
                  </button>
                </form>
              </SectionCard>
            ),
          },
          {
            id: "plans",
            label: "Plans",
            content: (
              <div className="grid gap-4">
                <SectionCard
                  title="Plan the next hangout"
                  description="Saved plans now stay in the product instead of disappearing after a one-time export."
                >
                  <HangoutPlanForm
                    action={createHangoutAction}
                    subjectLabel={connection.title}
                    targetType="connection"
                    targetId={connection.id}
                    redirectTo={`/connections/${connection.id}`}
                  />
                </SectionCard>

                <SectionCard
                  title="Saved plans"
                  description="Keep upcoming hangouts visible until they become reality, get canceled, or are exported."
                >
                  <HangoutList
                    hangouts={plannedHangouts}
                    emptyCopy="No saved plans yet. The next good invite can live here before it becomes a touchpoint."
                    completeAction={completeHangoutAction}
                    cancelAction={cancelHangoutAction}
                    redirectTo={`/connections/${connection.id}`}
                  />
                </SectionCard>
              </div>
            ),
          },
          {
            id: "history",
            label: "History",
            content: (
              <SectionCard title="Recent timeline" description={`Last touchpoint: ${connection.lastTouchpointLabel}`}>
                <div className="grid gap-3">
                  {timeline.length === 0 ? (
                    <p className="text-sm leading-7 text-foreground/68">No timeline entries yet. Log a first touchpoint to make this view useful.</p>
                  ) : (
                    timeline.map((touchpoint) => (
                      <article key={touchpoint.id} className="rounded-lg border border-border/85 bg-white/78 p-3.5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-strong">{touchpoint.touchpointType}</p>
                            {touchpoint.activityLabel || touchpoint.locationLabel ? (
                              <p className="mt-2 text-sm font-medium text-foreground/70">
                                {[touchpoint.activityLabel, touchpoint.locationLabel].filter(Boolean).join(" at ")}
                              </p>
                            ) : null}
                            <p className="mt-2 text-sm leading-7 text-foreground/72">{touchpoint.note}</p>
                          </div>
                          <p className="text-sm text-foreground/60">{touchpoint.occurredAtLabel}</p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </SectionCard>
            ),
          },
        ]}
      />

      <div className="hidden gap-5 xl:grid-cols-[0.95fr_1.05fr] md:grid">
        <SectionCard title="Connection profile" description={connection.subtitle}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <StatusPill health={connection.health} />
            <p className="text-sm text-foreground/65">{connection.health.summary}</p>
          </div>

          <EditableDetailsForm
            action={updateConnectionAction}
            editLabel="Edit connection"
            saveLabel="Save connection"
            helperText="Keep this light. A few cues are enough to make the next reconnect easier."
          >
            <input type="hidden" name="connectionId" value={connection.id} />
            <input type="hidden" name="redirectTo" value={`/connections/${connection.id}`} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="field-label">Name</span>
                <input className="field-input" name="displayName" type="text" defaultValue={connection.title} required />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Tags</span>
                <input className="field-input" name="tags" type="text" defaultValue={connection.tags.join(", ")} />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="field-label">Cadence value</span>
                <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue={connection.cadenceValue} required />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Unit</span>
                <select className="field-input" name="cadenceUnit" defaultValue={connection.cadenceUnit}>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="field-label">Reminder lead</span>
                <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue={connection.reminderLeadDays} required />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="field-label">Preferred activities</span>
              <input className="field-input" name="preferredActivities" type="text" defaultValue={connection.preferredActivities ?? ""} />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Private notes</span>
              <textarea className="field-input min-h-28" name="notes" defaultValue={connection.notes ?? ""} />
            </label>
          </EditableDetailsForm>

          <form action={archiveConnectionAction} className="mt-4">
            <input type="hidden" name="connectionId" value={connection.id} />
            <ConfirmSubmitButton
              className="button-secondary w-full sm:w-auto"
              confirmMessage="Archive this person and remove them from active reminder surfaces?"
            >
              Archive person
            </ConfirmSubmitButton>
          </form>
        </SectionCard>

        <div className="grid gap-5">
          <SectionCard title="Log a touchpoint" description="Keep it quick. Even a two-minute update is enough to keep the dashboard honest.">
            <form action={createTouchpointAction} className="grid gap-3">
              <input type="hidden" name="targetType" value="connection" />
              <input type="hidden" name="targetId" value={connection.id} />
              <input type="hidden" name="redirectTo" value={`/connections/${connection.id}`} />
              <div className="grid gap-3 md:grid-cols-2">
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
                  <input className="field-input" name="occurredAt" type="datetime-local" defaultValue={toInputDateTime()} required />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="field-label">Activity</span>
                  <input className="field-input" name="activityLabel" type="text" placeholder="Walk, dinner, coffee, check-in" />
                </label>
                <label className="grid gap-2">
                  <span className="field-label">Location</span>
                  <input className="field-input" name="locationLabel" type="text" placeholder="Optional freeform location" />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="field-label">Note</span>
                <textarea className="field-input min-h-28" name="note" placeholder="What mattered? Anything to remember for the next invite?" />
              </label>
              <p className="text-sm leading-6 text-foreground/68">
                After save, this page will refresh with the new timeline entry and updated reminder timing.
              </p>
              <button className="button-primary" type="submit">
                Save touchpoint
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Next plan context"
            description="Small memory cues pulled from the latest activity and place data you already logged."
          >
            {latestActivity ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/85 bg-white/78 p-3.5">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">Recent activity</p>
                  <p className="mt-2 text-base font-medium text-foreground">
                    {latestActivity.activityLabel ?? "No activity saved yet"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/85 bg-white/78 p-3.5">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">Recent place</p>
                  <p className="mt-2 text-base font-medium text-foreground">
                    {latestActivity.locationLabel ?? "No place saved yet"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-foreground/68">
                Log one touchpoint with an activity or place and this section becomes your lightweight planning memory.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Invite them into the app"
            description="Send an invite so they can connect this relationship to their own account."
          >
            <ConnectionLinkSection
              connectionId={connection.id}
              redirectTo={`/connections/${connection.id}`}
              linkedUserLabel={linkedUserLabel}
              activeInvite={activeInvite}
            />
          </SectionCard>

          <SectionCard
            title="Plan the next hangout"
            description="Saved plans now stay in the product instead of disappearing after a one-time export."
          >
            <HangoutPlanForm
              action={createHangoutAction}
              subjectLabel={connection.title}
              targetType="connection"
              targetId={connection.id}
              redirectTo={`/connections/${connection.id}`}
            />
          </SectionCard>

          <SectionCard
            title="Saved plans"
            description="Keep upcoming hangouts visible until they become reality, get canceled, or are exported."
          >
            <HangoutList
              hangouts={plannedHangouts}
              emptyCopy="No saved plans yet. The next good invite can live here before it becomes a touchpoint."
              completeAction={completeHangoutAction}
              cancelAction={cancelHangoutAction}
              redirectTo={`/connections/${connection.id}`}
            />
          </SectionCard>

          <SectionCard title="Recent timeline" description={`Last touchpoint: ${connection.lastTouchpointLabel}`}>
            <div className="grid gap-3">
              {timeline.length === 0 ? (
                <p className="text-sm leading-7 text-foreground/68">No timeline entries yet. Log a first touchpoint to make this view useful.</p>
              ) : (
                timeline.map((touchpoint) => (
                  <article key={touchpoint.id} className="rounded-lg border border-border/85 bg-white/78 p-3.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-strong">{touchpoint.touchpointType}</p>
                        {touchpoint.activityLabel || touchpoint.locationLabel ? (
                          <p className="mt-2 text-sm font-medium text-foreground/70">
                            {[touchpoint.activityLabel, touchpoint.locationLabel].filter(Boolean).join(" at ")}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm leading-7 text-foreground/72">{touchpoint.note}</p>
                      </div>
                      <p className="text-sm text-foreground/60">{touchpoint.occurredAtLabel}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
