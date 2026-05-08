import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DesktopSectionSwitcher } from "@/components/desktop-section-switcher";
import { EditableDetailsForm } from "@/components/editable-details-form";
import { FeedbackBanner } from "@/components/feedback-banner";
import { GroupMemberManagementPanel } from "@/components/group-member-management-panel";
import { HangoutPlansPanel } from "@/components/hangout-plans-panel";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";
import { PhotoAlbumFields } from "@/components/photo-album-fields";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { TouchpointTimeline } from "@/components/touchpoint-timeline";
import {
  archiveGroupAction,
  cancelHangoutAction,
  completeHangoutAction,
  confirmHangoutProposalAction,
  createHangoutAction,
  createTouchpointAction,
  respondToHangoutProposalAction,
  updateGroupAction,
} from "@/app/actions";
import { getFeedback } from "@/lib/feedback";
import { getDashboardData } from "@/lib/mvp-data";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserDisplayName, getUserFirstName } from "@/lib/user-display";

function toInputDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feedback?: string; exportHangoutId?: string }>;
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
  const group = data.groups.find((item) => item.id === id);

  if (!group) {
    notFound();
  }

  const timeline = data.recentTouchpoints.filter(
    (touchpoint) => touchpoint.targetType === "group" && touchpoint.targetId === group.id,
  );
  const plannedHangouts = data.hangouts.filter(
    (hangout) => hangout.targetType === "group" && hangout.targetId === group.id && hangout.status === "planned",
  );
  const feedback = getFeedback(query.feedback);
  const latestActivity = timeline.find((touchpoint) => touchpoint.activityLabel || touchpoint.locationLabel);
  const canManageGroup = group.canManage ?? true;
  const canCreateGroupPlans = group.canCreatePlans ?? canManageGroup;
  const groupSettingsDescription = canManageGroup
    ? group.subtitle
    : `${group.subtitle}${group.ownerName ? ` Organized by ${group.ownerName}.` : ""}`;
  const groupSettingsSummary = [
    { label: "Group name", value: group.title },
    { label: "Description", value: group.notes },
    { label: "Cadence", value: `Every ${group.cadenceValue} ${group.cadenceUnit}` },
    { label: "Reminder lead", value: `${group.reminderLeadDays} days before` },
  ];
  return (
    <AppShell
      title={group.title}
      subtitle="Keep the group's cadence, members, plans, and shared history in one calm place."
      email={user.email ?? "Signed in"}
      firstName={getUserFirstName(user)}
      displayName={getUserDisplayName(user)}
      backHref="/groups"
      backLabel="Back to groups"
    >
      {feedback ? (
        <div className="mb-4">
          <FeedbackBanner title={feedback.title} body={feedback.body} tone={feedback.tone} />
        </div>
      ) : null}

      <MobileSectionTabs
        initialSectionId={query.exportHangoutId ? "plans" : "manage"}
        sections={[
          {
            id: "manage",
            label: "Manage",
            content: (
              <div className="grid gap-3">
                <GroupMemberManagementPanel group={group} connections={data.connections} />

                <SectionCard title="Group settings" description={groupSettingsDescription}>
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <StatusPill health={group.health} />
                    <p className="text-sm text-foreground/65">{group.health.summary}</p>
                  </div>
                  {canManageGroup ? (
                    <>
                      <EditableDetailsForm
                        action={updateGroupAction}
                        editLabel="Edit group"
                        saveLabel="Save group"
                        helperText="Keep the basics light so updating this group never feels like work."
                        summary={groupSettingsSummary}
                      >
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="redirectTo" value={`/groups/${group.id}`} />
                        <label className="grid gap-2">
                          <span className="field-label">Group name</span>
                          <input className="field-input" name="name" type="text" defaultValue={group.title} required />
                        </label>
                        <label className="grid gap-2">
                          <span className="field-label">Description</span>
                          <textarea className="field-input min-h-24" name="description" defaultValue={group.notes ?? ""} />
                        </label>
                        <div className="grid gap-4">
                          <label className="grid gap-2">
                            <span className="field-label">Cadence value</span>
                            <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue={group.cadenceValue} required />
                          </label>
                          <label className="grid gap-2">
                            <span className="field-label">Unit</span>
                            <select className="field-input" name="cadenceUnit" defaultValue={group.cadenceUnit}>
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                              <option value="months">Months</option>
                            </select>
                          </label>
                          <label className="grid gap-2">
                            <span className="field-label">Reminder lead</span>
                            <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue={group.reminderLeadDays} required />
                          </label>
                        </div>
                      </EditableDetailsForm>

                      <form action={archiveGroupAction} className="mt-4">
                        <input type="hidden" name="groupId" value={group.id} />
                        <ConfirmSubmitButton
                          className="button-secondary w-full sm:w-auto"
                          confirmMessage="Archive this group and remove it from active reminder surfaces?"
                        >
                          Archive group
                        </ConfirmSubmitButton>
                      </form>
                    </>
                  ) : (
                    <div className="rounded-lg border border-border/85 bg-white/78 p-3.5 text-sm leading-6 text-foreground/68">
                      You can follow this group, see who is in it, and keep up with the shared history. Only the group owner can edit the settings or membership list.
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Next plan context"
                  description="Use the most recent place and activity as an easy starting point for the next invite."
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
                      Log one group touchpoint with an activity or place and this section becomes a lightweight planning shortcut.
                    </p>
                  )}
                </SectionCard>
              </div>
            ),
          },
          {
            id: "log",
            label: "Log",
            content: (
              <SectionCard title="Log a group touchpoint" description="Use this for dinners, hikes, game nights, or any shared check-in worth remembering.">
                <form action={createTouchpointAction} className="grid gap-4">
                  <input type="hidden" name="targetType" value="group" />
                  <input type="hidden" name="targetId" value={group.id} />
                  <input type="hidden" name="redirectTo" value={`/groups/${group.id}`} />
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
                      <input className="field-input" name="activityLabel" type="text" placeholder="Dinner, run club, game night" />
                    </label>
                    <label className="grid gap-2">
                      <span className="field-label">Location</span>
                      <input className="field-input" name="locationLabel" type="text" placeholder="Optional freeform location" />
                    </label>
                  </div>
                  <label className="grid gap-2">
                    <span className="field-label">Note</span>
                    <textarea className="field-input min-h-28" name="note" placeholder="Why did this matter, and what should the next plan build on?" />
                  </label>
                  <PhotoAlbumFields />
                  <p className="text-sm leading-6 text-foreground/68">
                    Saving here refreshes the group&apos;s memory timeline and moves the cadence anchor forward.
                  </p>
                  <button className="button-primary" type="submit">
                    Save group touchpoint
                  </button>
                </form>
              </SectionCard>
            ),
          },
          {
            id: "plans",
            label: "Plans",
            content: (
              <HangoutPlansPanel
                hangouts={plannedHangouts}
                emptyCopy="No saved plans yet. The next dinner, hike, or game night can live here before it becomes history."
                confirmAction={confirmHangoutProposalAction}
                completeAction={completeHangoutAction}
                cancelAction={cancelHangoutAction}
                createAction={createHangoutAction}
                respondAction={respondToHangoutProposalAction}
                subjectLabel={group.title}
                targetType="group"
                targetId={group.id}
                redirectTo={`/groups/${group.id}`}
                autoExportHangoutId={query.exportHangoutId}
                canCreate={canCreateGroupPlans}
              />
            ),
          },
          {
            id: "history",
            label: "History",
            content: (
              <SectionCard title="Recent timeline" description={`Last touchpoint: ${group.lastTouchpointLabel}`}>
                <TouchpointTimeline
                  touchpoints={timeline}
                  emptyCopy="No group touchpoints yet. Log one event and the timeline becomes the memory surface."
                />
              </SectionCard>
            ),
          },
        ]}
      />

      <DesktopSectionSwitcher
        sections={[
          { id: "manage", label: "Manage" },
          { id: "log", label: "Log" },
          { id: "plans", label: "Plans" },
          { id: "history", label: "History" },
        ]}
      />

      <div className="hidden gap-5 xl:grid-cols-[0.95fr_1.05fr] md:grid">
        <div id="manage" className="grid gap-5 scroll-mt-24">
          <GroupMemberManagementPanel group={group} connections={data.connections} />

          <SectionCard title="Group settings" description={groupSettingsDescription}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <StatusPill health={group.health} />
              <p className="text-sm text-foreground/65">{group.health.summary}</p>
            </div>
            {canManageGroup ? (
              <>
                <EditableDetailsForm
                  action={updateGroupAction}
                  editLabel="Edit group"
                  saveLabel="Save group"
                  helperText="Keep the basics light so updating this group never feels like work."
                  summary={groupSettingsSummary}
                >
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="redirectTo" value={`/groups/${group.id}`} />
                  <label className="grid gap-2">
                    <span className="field-label">Group name</span>
                    <input className="field-input" name="name" type="text" defaultValue={group.title} required />
                  </label>
                  <label className="grid gap-2">
                    <span className="field-label">Description</span>
                    <textarea className="field-input min-h-24" name="description" defaultValue={group.notes ?? ""} />
                  </label>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="grid gap-2">
                      <span className="field-label">Cadence value</span>
                      <input className="field-input" name="cadenceValue" type="number" min="1" max="90" defaultValue={group.cadenceValue} required />
                    </label>
                    <label className="grid gap-2">
                      <span className="field-label">Unit</span>
                      <select className="field-input" name="cadenceUnit" defaultValue={group.cadenceUnit}>
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="field-label">Reminder lead</span>
                      <input className="field-input" name="reminderLeadDays" type="number" min="0" max="30" defaultValue={group.reminderLeadDays} required />
                    </label>
                  </div>
                </EditableDetailsForm>

                <form action={archiveGroupAction} className="mt-4">
                  <input type="hidden" name="groupId" value={group.id} />
                  <ConfirmSubmitButton
                    className="button-secondary w-full sm:w-auto"
                    confirmMessage="Archive this group and remove it from active reminder surfaces?"
                  >
                    Archive group
                  </ConfirmSubmitButton>
                </form>
              </>
            ) : (
              <div className="rounded-lg border border-border/85 bg-white/78 p-3.5 text-sm leading-6 text-foreground/68">
                You can follow this group, see who is in it, and keep up with the shared history. Only the group owner can edit the settings or membership list.
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-5">
          <section id="log" className="scroll-mt-24">
          <SectionCard title="Log a group touchpoint" description="Use this for dinners, hikes, game nights, or any shared check-in worth remembering.">
            <form action={createTouchpointAction} className="grid gap-3">
              <input type="hidden" name="targetType" value="group" />
              <input type="hidden" name="targetId" value={group.id} />
              <input type="hidden" name="redirectTo" value={`/groups/${group.id}`} />
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
                  <input className="field-input" name="activityLabel" type="text" placeholder="Dinner, run club, game night" />
                </label>
                <label className="grid gap-2">
                  <span className="field-label">Location</span>
                  <input className="field-input" name="locationLabel" type="text" placeholder="Optional freeform location" />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="field-label">Note</span>
                <textarea className="field-input min-h-28" name="note" placeholder="Why did this matter, and what should the next plan build on?" />
              </label>
              <PhotoAlbumFields />
              <p className="text-sm leading-6 text-foreground/68">
                Saving here refreshes the group&apos;s memory timeline and moves the cadence anchor forward.
              </p>
              <button className="button-primary" type="submit">
                Save group touchpoint
              </button>
            </form>
          </SectionCard>
          </section>

          <SectionCard
            title="Next plan context"
            description="Use the most recent place and activity as an easy starting point for the next invite."
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
                People with app accounts or saved emails are invited and stay pending until they accept or decline. Local-only people are added immediately.
              </p>
            )}
          </SectionCard>

          <section id="plans" className="scroll-mt-24">
          <HangoutPlansPanel
            hangouts={plannedHangouts}
            emptyCopy="No saved plans yet. The next dinner, hike, or game night can live here before it becomes history."
            confirmAction={confirmHangoutProposalAction}
            completeAction={completeHangoutAction}
            cancelAction={cancelHangoutAction}
            createAction={createHangoutAction}
            respondAction={respondToHangoutProposalAction}
            subjectLabel={group.title}
            targetType="group"
            targetId={group.id}
            redirectTo={`/groups/${group.id}`}
            autoExportHangoutId={query.exportHangoutId}
            canCreate={canCreateGroupPlans}
          />
          </section>

          <section id="history" className="scroll-mt-24">
          <SectionCard title="Recent timeline" description={`Last touchpoint: ${group.lastTouchpointLabel}`}>
            <TouchpointTimeline
              touchpoints={timeline}
              emptyCopy="No group touchpoints yet. Log one event and the timeline becomes the memory surface."
            />
          </SectionCard>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
