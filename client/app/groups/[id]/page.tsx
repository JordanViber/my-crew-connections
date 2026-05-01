import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConnectionLinkBadge } from "@/components/connection-link-badge";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EditableDetailsForm } from "@/components/editable-details-form";
import { FeedbackBanner } from "@/components/feedback-banner";
import { HangoutPlansPanel } from "@/components/hangout-plans-panel";
import { MobileSectionTabs } from "@/components/mobile-section-tabs";
import { PhotoAlbumFields } from "@/components/photo-album-fields";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { TouchpointTimeline } from "@/components/touchpoint-timeline";
import {
  addGroupMembersAction,
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
import { countGroupMemberStatuses, sortConnectionsForGroupMembers, summarizeGroupMemberStatuses } from "@/lib/group-members";
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
type GroupConnectionSummary = DashboardData["connections"][number];
type PendingGroupMember = DashboardData["groups"][number]["pendingMembers"][number];

function getGroupMembershipSummary(acceptedCount: number, pendingCount: number) {
  const summaryParts = [`${acceptedCount} accepted`];

  if (pendingCount > 0) {
    summaryParts.push(`${pendingCount} pending`);
  }

  return summaryParts.join(" - ");
}

function AcceptedGroupMembersList({
  members,
  emptyCopy,
}: Readonly<{
  members: GroupConnectionSummary[];
  emptyCopy: string;
}>) {
  if (members.length === 0) {
    return <p className="text-sm leading-7 text-foreground/68">{emptyCopy}</p>;
  }

  return members.map((member) => (
    <article key={member.id} className="rounded-lg border border-border/85 bg-white/78 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">{member.title}</p>
          <p className="mt-1 text-sm text-foreground/65">{member.subtitle}</p>
        </div>
        <ConnectionLinkBadge
          linkState={member.linkState}
          pendingInviteEmail={member.pendingInviteEmail}
          linkedLabel="App account connected"
          pendingLabel="Person invite pending"
          unlinkedLabel="Local person"
        />
      </div>
      <div className="mt-3">
        <Link className="button-secondary inline-flex" href={`/connections/${member.id}`}>
          Open person
        </Link>
      </div>
    </article>
  ));
}

function AcceptedGroupMemberNamesList({
  members,
  emptyCopy,
}: Readonly<{
  members: string[];
  emptyCopy: string;
}>) {
  if (members.length === 0) {
    return <p className="text-sm leading-7 text-foreground/68">{emptyCopy}</p>;
  }

  return members.map((member) => (
    <article key={member} className="rounded-lg border border-border/85 bg-white/78 p-3.5">
      <p className="text-base font-semibold text-foreground">{member}</p>
    </article>
  ));
}

function PendingGroupInviteList({
  members,
  emptyCopy,
}: Readonly<{
  members: PendingGroupMember[];
  emptyCopy: string;
}>) {
  if (members.length === 0) {
    return <p className="text-sm leading-7 text-foreground/68">{emptyCopy}</p>;
  }

  return members.map((member) => (
    <article key={member.connectionId} className="warning-surface rounded-lg border p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">{member.name}</p>
          <p className="mt-1 text-sm text-foreground/65">Waiting on {member.invitedEmail} to accept or decline.</p>
        </div>
        <span className="warning-surface-strong warning-text rounded-full px-3 py-1.5 text-xs font-semibold">Pending acceptance</span>
      </div>
      <div className="mt-3">
        <Link className="button-secondary inline-flex" href={`/connections/${member.connectionId}`}>
          Open person
        </Link>
      </div>
    </article>
  ));
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
  const memberConnections = sortConnectionsForGroupMembers(
    data.connections.filter((connection) => group.memberConnectionIds.includes(connection.id)),
  );
  const pendingMemberSummary = group.pendingMembers;
  const availableConnections = sortConnectionsForGroupMembers(
    data.connections.filter(
      (connection) => !group.memberConnectionIds.includes(connection.id) && !group.pendingMemberConnectionIds.includes(connection.id),
    ),
  );
  const feedback = getFeedback(query.feedback);
  const latestActivity = timeline.find((touchpoint) => touchpoint.activityLabel || touchpoint.locationLabel);
  const memberStatusSummary = summarizeGroupMemberStatuses(
    countGroupMemberStatuses(memberConnections.map((member) => member.linkState)),
  );
  const canManageGroup = group.canManage ?? true;
  const acceptedMemberCount = group.memberNames.length;
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
                <SectionCard title="Members" description={getGroupMembershipSummary(acceptedMemberCount, group.pendingMemberCount)}>
                  <div className="grid gap-3">
                    <AcceptedGroupMemberNamesList
                      members={group.memberNames}
                      emptyCopy="No accepted members are attached yet."
                    />
                    {pendingMemberSummary.length > 0 ? (
                      <div className="warning-surface rounded-lg border p-3.5">
                        <p className="warning-text text-[0.72rem] font-semibold uppercase tracking-[0.18em]">Pending group invites</p>
                        <p className="mt-1.5 text-sm leading-6 text-foreground/68">
                          {pendingMemberSummary.map((member) => member.name).join(", ")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </SectionCard>

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
                      You can follow this group, see who is in it, and keep up with the shared history. Only the organizer can edit the settings or membership list.
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Manage members" description="Accepted members are active in the group. Pending members have a group invite waiting for their account.">
                  <div className="mb-5 grid gap-3">
                    <p className="text-sm leading-6 text-foreground/68">
                      {getGroupMembershipSummary(acceptedMemberCount, group.pendingMemberCount)}
                    </p>
                    {canManageGroup && memberConnections.length > 0 ? (
                      <p className="text-sm leading-6 text-foreground/68">{memberStatusSummary}</p>
                    ) : null}
                    {canManageGroup ? (
                      <AcceptedGroupMembersList
                        members={memberConnections}
                        emptyCopy="No accepted members are attached yet. Add people below to turn this into a real crew."
                      />
                    ) : (
                      <AcceptedGroupMemberNamesList
                        members={group.memberNames}
                        emptyCopy="No accepted members are attached yet."
                      />
                    )}
                  </div>

                  {canManageGroup ? (
                    <form action={addGroupMembersAction} className="grid gap-3">
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="redirectTo" value={`/groups/${group.id}`} />
                      <p className="text-sm leading-6 text-foreground/68">
                        Connected app users join immediately. People with a pending person invite can be selected once here, then stay pending in this group until they accept.
                      </p>
                      <fieldset className="grid gap-3 rounded-lg border border-border/85 bg-white/75 p-3.5">
                        <legend className="field-label px-2">Add existing connections</legend>
                        {availableConnections.length === 0 ? (
                          <p className="text-sm leading-7 text-foreground/68">Everyone in your list is already accepted or pending in this group.</p>
                        ) : (
                          availableConnections.map((connection) => (
                            <label key={connection.id} className="flex items-center gap-3 text-sm text-foreground/75">
                              <input className="h-4 w-4" type="checkbox" name="connectionIds" value={connection.id} />
                              <span>{connection.title}</span>
                              <ConnectionLinkBadge
                                linkState={connection.linkState}
                                pendingInviteEmail={connection.pendingInviteEmail}
                                linkedLabel="App account connected"
                                pendingLabel="Person invite pending"
                                unlinkedLabel="Local person"
                              />
                            </label>
                          ))
                        )}
                      </fieldset>
                      <button className="button-secondary" type="submit" disabled={availableConnections.length === 0}>
                        Add or invite selected people
                      </button>
                    </form>
                  ) : null}
                </SectionCard>

                <SectionCard
                  title="Pending invites"
                  description="These people have not accepted yet, so the group still treats them as pending instead of active members."
                >
                  <div className="grid gap-3">
                    <PendingGroupInviteList
                      members={pendingMemberSummary}
                      emptyCopy="No pending invites right now. Everyone attached to this group is either accepted already or still local-only."
                    />
                  </div>
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
                canCreate={canManageGroup}
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

      <div className="hidden gap-5 xl:grid-cols-[0.95fr_1.05fr] md:grid">
        <div className="grid gap-5">
          <SectionCard title="Members" description={getGroupMembershipSummary(acceptedMemberCount, group.pendingMemberCount)}>
            <div className="grid gap-3">
              <AcceptedGroupMemberNamesList
                members={group.memberNames}
                emptyCopy="No accepted members are attached yet."
              />
              {pendingMemberSummary.length > 0 ? (
                <div className="warning-surface rounded-lg border p-3.5">
                  <p className="warning-text text-[0.72rem] font-semibold uppercase tracking-[0.18em]">Pending group invites</p>
                  <p className="mt-1.5 text-sm leading-6 text-foreground/68">
                    {pendingMemberSummary.map((member) => member.name).join(", ")}
                  </p>
                </div>
              ) : null}
            </div>
          </SectionCard>

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
                You can follow this group, see who is in it, and keep up with the shared history. Only the organizer can edit the settings or membership list.
              </div>
            )}
          </SectionCard>
          <SectionCard title="Manage members" description="Accepted members are active in the group. Pending members have a group invite waiting for their account.">
            <div className="mb-5 grid gap-3">
              <p className="text-sm leading-6 text-foreground/68">
                {getGroupMembershipSummary(acceptedMemberCount, group.pendingMemberCount)}
              </p>
              {canManageGroup && memberConnections.length > 0 ? (
                <p className="text-sm leading-6 text-foreground/68">{memberStatusSummary}</p>
              ) : null}
              {canManageGroup ? (
                <AcceptedGroupMembersList
                  members={memberConnections}
                  emptyCopy="No accepted members are attached yet. Add people below to turn this into a real crew."
                />
              ) : (
                <AcceptedGroupMemberNamesList
                  members={group.memberNames}
                  emptyCopy="No accepted members are attached yet."
                />
              )}
            </div>

            {canManageGroup ? (
              <form action={addGroupMembersAction} className="grid gap-3">
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="redirectTo" value={`/groups/${group.id}`} />
                <p className="text-sm leading-6 text-foreground/68">
                  Connected app users join immediately. People with a pending person invite can be selected once here, then stay pending in this group until they accept.
                </p>
                <fieldset className="grid gap-3 rounded-lg border border-border/85 bg-white/75 p-3.5">
                  <legend className="field-label px-2">Add existing connections</legend>
                  {availableConnections.length === 0 ? (
                    <p className="text-sm leading-7 text-foreground/68">Everyone in your list is already accepted or pending in this group.</p>
                  ) : (
                    availableConnections.map((connection) => (
                      <label key={connection.id} className="flex items-center gap-3 text-sm text-foreground/75">
                        <input className="h-4 w-4" type="checkbox" name="connectionIds" value={connection.id} />
                        <span>{connection.title}</span>
                        <ConnectionLinkBadge
                          linkState={connection.linkState}
                          pendingInviteEmail={connection.pendingInviteEmail}
                          linkedLabel="App account connected"
                          pendingLabel="Person invite pending"
                          unlinkedLabel="Local person"
                        />
                      </label>
                    ))
                  )}
                </fieldset>
                <button className="button-secondary" type="submit" disabled={availableConnections.length === 0}>
                  Add or invite selected people
                </button>
              </form>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Pending invites"
            description="These people have not accepted yet, so the group still treats them as pending instead of active members."
          >
            <div className="grid gap-3">
              <PendingGroupInviteList
                members={pendingMemberSummary}
                emptyCopy="No pending invites right now. Everyone attached to this group is either accepted already or still local-only."
              />
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-5">
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
                Log one group touchpoint with an activity or place and this section becomes a lightweight planning shortcut.
              </p>
            )}
          </SectionCard>

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
            canCreate={canManageGroup}
          />

          <SectionCard title="Recent timeline" description={`Last touchpoint: ${group.lastTouchpointLabel}`}>
            <TouchpointTimeline
              touchpoints={timeline}
              emptyCopy="No group touchpoints yet. Log one event and the timeline becomes the memory surface."
            />
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
