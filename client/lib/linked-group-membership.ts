export type GroupMemberAddPath = "promote" | "invite" | "placeholder";

export type LinkedGroupConnectionInput = {
  linkedUserId?: string | null;
  contactEmail?: string | null;
};

export function classifyGroupMemberAddPath(input: LinkedGroupConnectionInput): GroupMemberAddPath {
  if (input.linkedUserId?.trim()) {
    return "promote";
  }

  if (input.contactEmail?.trim()) {
    return "invite";
  }

  return "placeholder";
}

export function shouldPromoteLinkedConnectionToGroupMember(input: LinkedGroupConnectionInput) {
  return classifyGroupMemberAddPath(input) === "promote";
}

export function buildAcceptedLinkedGroupMembership(input: {
  groupId: string;
  userId: string;
}) {
  return {
    group_id: input.groupId,
    user_id: input.userId,
    connection_id: null,
    role: "member" as const,
    removed_at: null,
  };
}

export function buildLinkedMemberAddedNotification(input: {
  adderName: string;
  groupName: string;
}) {
  const adderName = input.adderName.trim() || "Someone";
  const groupName = input.groupName.trim() || "a group";

  return {
    category: "group-member-added",
    title: "Added to a group",
    body: `${adderName} added you to ${groupName}. You can now see shared plans and history.`,
    href: "/groups",
  };
}

export function buildLinkedMemberJoinedOwnerNotification(input: {
  memberName: string;
  groupCount: number;
}) {
  const memberName = input.memberName.trim() || "Someone";
  const groupNoun = input.groupCount === 1 ? "group" : "groups";

  return {
    category: "group-member-joined",
    title: "Linked member joined your groups",
    body: `${memberName} is now an accepted member of ${input.groupCount} ${groupNoun}.`,
    href: "/groups",
  };
}

export function countPromotedLinkedMembersAsAccepted(input: {
  promotedCount: number;
  invitedCount: number;
  placeholderCount: number;
}) {
  return {
    acceptedCount: input.promotedCount + input.placeholderCount,
    invitedCount: input.invitedCount,
  };
}
