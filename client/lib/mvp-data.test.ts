import { buildGroupRosterMembers } from "@/lib/mvp-data";

const group = {
  id: "group-1",
  name: "Dinner Crew",
  description: "Monthly dinner",
  created_at: "2026-05-01T00:00:00.000Z",
  owner_user_id: "owner-1",
};

const ownerConnection = {
  id: "connection-1",
  owner_user_id: "owner-1",
  display_name: "Jordan Local",
  prefers_profile_name: false,
  contact_email: null,
  linked_user_id: null,
  tags: null,
  notes: null,
  preferred_activities: null,
  created_at: "2026-05-01T00:00:00.000Z",
};

describe("buildGroupRosterMembers", () => {
  it("collapses a local membership with an active group invite into one row", () => {
    const rosterMembers = buildGroupRosterMembers({
      group,
      memberships: [
        { group_id: group.id, connection_id: ownerConnection.id, user_id: null, role: "member" as const },
      ],
      groupConnections: [ownerConnection],
      connectionInviteMap: new Map(),
      groupInvites: [
        {
          group_id: group.id,
          connection_id: ownerConnection.id,
          invited_email: "jordan@example.com",
          created_at: "2026-05-02T00:00:00.000Z",
          accepted_by_user_id: null,
          accepted_at: null,
          declined_at: null,
          revoked_at: null,
        },
      ],
      profiles: new Map([
        ["owner-1", { id: "owner-1", display_name: "Owner One", first_name: "Owner", last_name: "One" }],
      ]),
      viewerUserId: "owner-1",
      viewerProfileName: "Owner One",
      membershipRole: "owner",
    });

    expect(rosterMembers).toHaveLength(2);
    expect(rosterMembers[1]).toMatchObject({
      key: `connection:${ownerConnection.id}`,
      title: "Jordan Local",
      linkState: "pending",
      hasAcceptedMembership: true,
      canCancelInvite: true,
      canResendInvite: true,
      canInviteLocal: false,
      pendingInviteEmail: "jordan@example.com",
    });
  });

  it("hides manager-only roster details from non-owners", () => {
    const rosterMembers = buildGroupRosterMembers({
      group,
      memberships: [],
      groupConnections: [],
      connectionInviteMap: new Map(),
      groupInvites: [],
      profiles: new Map(),
      viewerUserId: "member-1",
      viewerProfileName: "Member One",
      membershipRole: "member",
    });

    expect(rosterMembers).toEqual([]);
  });

  it("maps accepted app members back to their connection when invite history exists", () => {
    const rosterMembers = buildGroupRosterMembers({
      group,
      memberships: [
        { group_id: group.id, connection_id: null, user_id: "member-2", role: "member" as const },
      ],
      groupConnections: [
        {
          ...ownerConnection,
          id: "connection-2",
          display_name: "Taylor Accepted",
        },
      ],
      connectionInviteMap: new Map(),
      groupInvites: [
        {
          group_id: group.id,
          connection_id: "connection-2",
          invited_email: "taylor@example.com",
          created_at: "2026-05-03T00:00:00.000Z",
          accepted_by_user_id: "member-2",
          accepted_at: "2026-05-04T00:00:00.000Z",
          declined_at: null,
          revoked_at: null,
        },
      ],
      profiles: new Map([
        ["member-2", { id: "member-2", display_name: "Taylor", first_name: "Taylor", last_name: "Accepted" }],
      ]),
      viewerUserId: "owner-1",
      viewerProfileName: "Owner One",
      membershipRole: "owner",
    });

    expect(rosterMembers[1]).toMatchObject({
      key: "user:member-2",
      title: "Taylor",
      connectionId: "connection-2",
      canRemove: true,
      linkState: "linked",
    });
  });
});
