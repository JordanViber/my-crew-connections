import {
  buildAcceptedLinkedGroupMembership,
  buildLinkedMemberAddedNotification,
  buildLinkedMemberJoinedOwnerNotification,
  classifyGroupMemberAddPath,
  countPromotedLinkedMembersAsAccepted,
  shouldPromoteLinkedConnectionToGroupMember,
} from "@/lib/linked-group-membership";

describe("linked group membership helpers", () => {
  it("promotes two-way-linked users instead of inviting them again", () => {
    expect(classifyGroupMemberAddPath({
      linkedUserId: "user-2",
      contactEmail: "alex@example.com",
    })).toBe("promote");
    expect(shouldPromoteLinkedConnectionToGroupMember({
      linkedUserId: "user-2",
    })).toBe(true);
  });

  it("invites unlinked people who have an email", () => {
    expect(classifyGroupMemberAddPath({
      linkedUserId: null,
      contactEmail: "alex@example.com",
    })).toBe("invite");
    expect(shouldPromoteLinkedConnectionToGroupMember({
      contactEmail: "alex@example.com",
    })).toBe(false);
  });

  it("keeps local-only people as placeholders", () => {
    expect(classifyGroupMemberAddPath({
      linkedUserId: "  ",
      contactEmail: "",
    })).toBe("placeholder");
  });

  it("builds an accepted user membership without a connection placeholder", () => {
    expect(buildAcceptedLinkedGroupMembership({
      groupId: "group-1",
      userId: "user-2",
    })).toEqual({
      group_id: "group-1",
      user_id: "user-2",
      connection_id: null,
      role: "member",
      removed_at: null,
    });
  });

  it("counts promoted linked users as accepted members, not invites", () => {
    expect(countPromotedLinkedMembersAsAccepted({
      promotedCount: 2,
      invitedCount: 1,
      placeholderCount: 3,
    })).toEqual({
      acceptedCount: 5,
      invitedCount: 1,
    });
  });

  it("builds notification copy for the linked member and the group owner", () => {
    expect(buildLinkedMemberAddedNotification({
      adderName: "Jordan",
      groupName: "Friday dinner",
    })).toEqual({
      category: "group-member-added",
      title: "Added to a group",
      body: "Jordan added you to Friday dinner. You can now see shared plans and history.",
      href: "/groups",
    });

    expect(buildLinkedMemberJoinedOwnerNotification({
      memberName: "Alex",
      groupCount: 2,
    })).toEqual({
      category: "group-member-joined",
      title: "Linked member joined your groups",
      body: "Alex is now an accepted member of 2 groups.",
      href: "/groups",
    });
  });
});
