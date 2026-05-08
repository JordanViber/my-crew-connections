import { ConnectionLinkBadge } from "@/components/connection-link-badge";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { GroupRosterBuilder } from "@/components/group-roster-builder";
import { SectionCard } from "@/components/section-card";
import {
  addGroupMembersAction,
  cancelGroupInviteAction,
  inviteLocalGroupMemberAction,
  removeGroupConnectionMemberAction,
  removeGroupUserMemberAction,
  resendGroupInviteAction,
} from "@/app/actions";
import { summarizeGroupMemberStatuses } from "@/lib/group-members";
import type { RelationshipSummary } from "@/lib/mvp-data";

function getMembershipSummary(acceptedCount: number, pendingCount: number) {
  const summaryParts = [`${acceptedCount} accepted`];

  if (pendingCount > 0) {
    summaryParts.push(`${pendingCount} pending`);
  }

  return summaryParts.join(" - ");
}

export function GroupMemberManagementPanel({
  group,
  connections,
}: Readonly<{
  group: RelationshipSummary;
  connections: RelationshipSummary[];
}>) {
  const canManageGroup = group.canManage ?? false;
  const rosterMembers = group.rosterMembers ?? [];
  const pendingRosterMembers = rosterMembers.filter((m) => m.role === "pending");
  const acceptedRosterMembers = rosterMembers.filter((m) => m.role !== "pending");
  const excludedConnectionIds = [...new Set(
    rosterMembers.flatMap((member) => member.connectionId ? [member.connectionId] : []),
  )];
  const memberStatusSummary = group.memberStatusCounts ? summarizeGroupMemberStatuses(group.memberStatusCounts) : null;

  return (
    <SectionCard
      title="Roster management"
      description={canManageGroup
        ? "Add people, invite local-only members, and manage pending invites from one roster."
        : "Accepted members are active in the group. Pending invites stay pending until the owner hears back."}
    >
      <div className="grid gap-3">
        <p className="text-sm leading-6 text-foreground/68">
          {getMembershipSummary(group.memberNames.length, group.pendingMemberCount)}
        </p>
        {canManageGroup && memberStatusSummary ? (
          <p className="text-sm leading-6 text-foreground/68">{memberStatusSummary}</p>
        ) : null}

        {canManageGroup ? (
          <div className="grid gap-3">
            {acceptedRosterMembers.map((member) => (
              <article key={member.key} className="grid gap-3 rounded-lg border border-border/80 bg-white/78 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{member.title}</p>
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-foreground/70">
                        {member.isOwner ? "Owner" : "Member"}
                      </span>
                      <ConnectionLinkBadge
                        linkState={member.linkState}
                        pendingInviteEmail={member.pendingInviteEmail}
                        linkedLabel="Connected in app"
                        pendingLabel="Group invite pending"
                        unlinkedLabel="Local-only"
                      />
                    </div>
                    <p className="mt-1 text-sm text-foreground/62">{member.subtitle}</p>
                    {member.pendingInviteEmail ? (
                      <p className="mt-1 text-sm text-foreground/62">Invite email: {member.pendingInviteEmail}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {member.canResendInvite && member.connectionId ? (
                      <form action={resendGroupInviteAction}>
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="connectionId" value={member.connectionId} />
                        <button className="button-secondary" type="submit">Resend invite</button>
                      </form>
                    ) : null}
                    {member.canCancelInvite && member.connectionId ? (
                      <form action={cancelGroupInviteAction}>
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="connectionId" value={member.connectionId} />
                        <button className="button-secondary" type="submit">Cancel invite</button>
                      </form>
                    ) : null}
                    {member.canRemove && member.userId ? (
                      <form action={removeGroupUserMemberAction}>
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="userId" value={member.userId} />
                        <ConfirmSubmitButton className="button-secondary" confirmMessage="Remove this member from the group?">
                          Remove member
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                    {member.canRemove && !member.userId && member.connectionId ? (
                      <form action={removeGroupConnectionMemberAction}>
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="connectionId" value={member.connectionId} />
                        <ConfirmSubmitButton className="button-secondary" confirmMessage="Remove this member from the group?">
                          Remove member
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                </div>

                {member.canInviteLocal && member.connectionId ? (
                  <form action={inviteLocalGroupMemberAction} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="connectionId" value={member.connectionId} />
                    <input
                      className="field-input"
                      name="contactEmail"
                      type="email"
                      placeholder="name@example.com"
                      required
                    />
                    <button className="button-secondary" type="submit">Add email + invite</button>
                  </form>
                ) : null}
              </article>
            ))}
            {pendingRosterMembers.length > 0 ? (
              <div className="grid gap-3">
                <h3 className="text-sm font-semibold text-foreground">Pending invites</h3>
                {pendingRosterMembers.map((member) => (
                  <article key={member.key} className="grid gap-3 rounded-lg border border-border/80 bg-white/78 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{member.title}</p>
                          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-foreground/70">
                            Pending
                          </span>
                          <ConnectionLinkBadge
                            linkState={member.linkState}
                            pendingInviteEmail={member.pendingInviteEmail}
                            linkedLabel="Connected in app"
                            pendingLabel="Group invite pending"
                            unlinkedLabel="Local-only"
                          />
                        </div>
                        <p className="mt-1 text-sm text-foreground/62">{member.subtitle}</p>
                        {member.pendingInviteEmail ? (
                          <p className="mt-1 text-sm text-foreground/62">Invite email: {member.pendingInviteEmail}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {member.canResendInvite && member.connectionId ? (
                          <form action={resendGroupInviteAction}>
                            <input type="hidden" name="groupId" value={group.id} />
                            <input type="hidden" name="connectionId" value={member.connectionId} />
                            <button className="button-secondary" type="submit">Resend invite</button>
                          </form>
                        ) : null}
                        {member.canCancelInvite && member.connectionId ? (
                          <form action={cancelGroupInviteAction}>
                            <input type="hidden" name="groupId" value={group.id} />
                            <input type="hidden" name="connectionId" value={member.connectionId} />
                            <button className="button-secondary" type="submit">Cancel invite</button>
                          </form>
                        ) : null}
                        {member.canRemove && member.connectionId ? (
                          <form action={removeGroupConnectionMemberAction}>
                            <input type="hidden" name="groupId" value={group.id} />
                            <input type="hidden" name="connectionId" value={member.connectionId} />
                            <ConfirmSubmitButton className="button-secondary" confirmMessage="Remove this member from the group?">
                              Remove member
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3">
            {group.memberNames.length > 0 ? (
              group.memberNames.map((memberName) => (
                <article key={memberName} className="rounded-lg border border-border/80 bg-white/78 p-3">
                  <p className="font-semibold text-foreground">{memberName}</p>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-foreground/68">No accepted members are attached yet.</p>
            )}
            {group.pendingMembers.length > 0 ? (
              <div className="warning-surface rounded-lg border p-3">
                <h3 className="warning-text text-[0.72rem] font-semibold uppercase tracking-[0.18em]">Pending invites</h3>
                <p className="mt-1.5 text-sm leading-6 text-foreground/68">
                  {group.pendingMembers.map((member) => `${member.name} (${member.invitedEmail})`).join(", ")}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {canManageGroup ? (
          <form action={addGroupMembersAction} className="grid gap-3">
            <input type="hidden" name="groupId" value={group.id} />
            <input type="hidden" name="redirectTo" value={`/groups/${group.id}`} />
            <GroupRosterBuilder
              connections={connections}
              excludedConnectionIds={excludedConnectionIds}
              mode="manage"
            />
            <button className="button-secondary w-full sm:w-auto" type="submit">
              Add or invite people
            </button>
          </form>
        ) : null}
      </div>
    </SectionCard>
  );
}
