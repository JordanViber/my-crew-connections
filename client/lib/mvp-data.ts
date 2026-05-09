import type { SupabaseClient } from "@supabase/supabase-js";
import { countGroupMemberStatuses, type GroupMemberStatusCounts } from "@/lib/group-members";
import {
  countHangoutResponses,
  type HangoutProposalState,
  type HangoutResponseCounts,
  type HangoutResponseStatus,
} from "@/lib/hangout-participants";
import { formatHangoutWindow, getHangoutWindowBucket, type HangoutStatus } from "@/lib/hangouts";
import { getGroupRoleCapabilities, type GroupRole } from "@/lib/group-collaboration";
import {
  formatCadence,
  formatDateLabel,
  getRelationshipHealth,
  type CadenceUnit,
  type RelationshipHealth,
} from "@/lib/relationship-status";

export type ConnectionRow = {
  id: string;
  display_name: string;
  prefers_profile_name: boolean;
  contact_email: string | null;
  linked_user_id: string | null;
  tags: string[] | null;
  notes: string | null;
  preferred_activities: string | null;
  created_at: string;
};

export type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_user_id: string;
};

export type CadenceRuleRow = {
  id: string;
  target_type: "connection" | "group";
  target_id: string;
  cadence_value: number;
  cadence_unit: CadenceUnit;
  reminder_lead_days: number;
};

export type TouchpointRow = {
  id: string;
  target_type: "connection" | "group";
  target_id: string;
  touchpoint_type: "check-in" | "message" | "call" | "hangout";
  occurred_at: string;
  note: string | null;
  activity_label: string | null;
  location_label: string | null;
  photo_album_label: string | null;
  photo_album_url: string | null;
};

export type HangoutRow = {
  id: string;
  owner_user_id: string;
  target_type: "connection" | "group";
  target_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: string | null;
  place_name: string | null;
  place_address: string | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  yelp_business_id: string | null;
  yelp_url: string | null;
  opentable_url: string | null;
  notes: string | null;
  status: HangoutStatus;
  proposal_state: HangoutProposalState;
  proposal_confirmed_at: string | null;
  photo_album_label: string | null;
  photo_album_url: string | null;
  completed_at: string | null;
  created_at: string;
};

type HangoutParticipantRow = {
  hangout_id: string;
  participant_user_id: string;
  participant_connection_id: string | null;
  response_status: HangoutResponseStatus;
};

type GroupMembershipRow = {
  group_id: string;
  connection_id: string | null;
  user_id: string | null;
  role: GroupRole;
};

type ConnectionInviteRow = {
  connection_id: string;
  invited_email: string;
  created_at: string;
};

type GroupInviteRow = {
  group_id: string;
  connection_id: string;
  invited_email: string;
  created_at: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  revoked_at: string | null;
};

type AcceptedGroupInviteRow = {
  group_id: string;
};

type ActiveUserGroupMembershipRow = {
  group_id: string;
  role: GroupRole;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

type GroupConnectionRow = ConnectionRow & {
  owner_user_id: string;
};

type PendingGroupMember = {
  connectionId: string;
  name: string;
  invitedEmail: string;
};

export type GroupRosterMember = {
  key: string;
  title: string;
  subtitle: string;
  role: GroupRole | "pending";
  linkState: "linked" | "pending" | "unlinked";
  connectionId?: string;
  userId?: string;
  pendingInviteEmail?: string;
  isOwner: boolean;
  hasAcceptedMembership: boolean;
  canRemove: boolean;
  canCancelInvite: boolean;
  canResendInvite: boolean;
  canInviteLocal: boolean;
};

export type RelationshipSummary = {
  id: string;
  targetType: "connection" | "group";
  title: string;
  subtitle: string;
  cadenceLabel: string;
  cadenceValue: number;
  cadenceUnit: CadenceUnit;
  reminderLeadDays: number;
  health: RelationshipHealth;
  notes?: string;
  tags: string[];
  linkedUserId?: string;
  contactEmail?: string;
  prefersProfileName?: boolean;
  linkState?: "linked" | "pending" | "unlinked";
  pendingInviteEmail?: string;
  preferredActivities?: string;
  lastTouchpointAt?: string;
  lastTouchpointLabel: string;
  nextHangoutLabel?: string;
  touchpointCount: number;
  memberNames: string[];
  memberConnectionIds: string[];
  pendingMembers: PendingGroupMember[];
  pendingMemberConnectionIds: string[];
  pendingMemberCount: number;
  memberStatusCounts?: GroupMemberStatusCounts;
  membershipRole?: GroupRole;
  ownerName?: string;
  canManage?: boolean;
  canCreatePlans?: boolean;
  canLogTouchpoints?: boolean;
  canManagePlans?: boolean;
  rosterMembers?: GroupRosterMember[];
};

export type HangoutSummary = {
  id: string;
  targetType: "connection" | "group";
  targetId: string;
  targetLabel: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  location?: string;
  placeName?: string;
  placeAddress?: string;
  googlePlaceId?: string;
  googleMapsUrl?: string;
  yelpBusinessId?: string;
  yelpUrl?: string;
  opentableUrl?: string;
  notes?: string;
  status: HangoutStatus;
  proposalState: HangoutProposalState;
  proposalConfirmedAt?: string;
  responseCounts: HangoutResponseCounts;
  viewerRole: "owner" | "participant" | "observer";
  viewerResponse?: HangoutResponseStatus;
  canRespond: boolean;
  canManage: boolean;
  canExportCalendar: boolean;
  photoAlbumLabel?: string;
  photoAlbumUrl?: string;
  windowLabel: string;
  bucketLabel: string;
};

export type RecentTouchpoint = {
  id: string;
  targetType: "connection" | "group";
  targetId: string;
  targetLabel: string;
  touchpointType: string;
  occurredAtLabel: string;
  note: string;
  activityLabel?: string;
  locationLabel?: string;
  photoAlbumLabel?: string;
  photoAlbumUrl?: string;
};

export type DashboardData = {
  profileName: string;
  relationships: RelationshipSummary[];
  overdue: RelationshipSummary[];
  dueSoon: RelationshipSummary[];
  onTrack: RelationshipSummary[];
  hangouts: HangoutSummary[];
  upcomingHangouts: HangoutSummary[];
  recentTouchpoints: RecentTouchpoint[];
  connections: RelationshipSummary[];
  groups: RelationshipSummary[];
  ownedGroupCount: number;
};

function assertNoError(error: { message: string } | null, label: string) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function getFallbackCadenceRule(targetType: "connection" | "group", targetId: string): CadenceRuleRow {
  if (targetType === "group") {
    return {
      id: `fallback-group:${targetId}`,
      target_type: "group",
      target_id: targetId,
      cadence_value: 1,
      cadence_unit: "months",
      reminder_lead_days: 7,
    };
  }

  return {
    id: `fallback-connection:${targetId}`,
    target_type: "connection",
    target_id: targetId,
    cadence_value: 3,
    cadence_unit: "weeks",
    reminder_lead_days: 5,
  };
}

function latestTouchpointMap(touchpoints: TouchpointRow[]) {
  const latest = new Map<string, TouchpointRow>();

  for (const touchpoint of touchpoints) {
    const key = `${touchpoint.target_type}:${touchpoint.target_id}`;
    const current = latest.get(key);

    if (!current || current.occurred_at < touchpoint.occurred_at) {
      latest.set(key, touchpoint);
    }
  }

  return latest;
}

function getProfileName(profile?: ProfileRow) {
  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return profile?.display_name?.trim() || fullName || "Someone";
}

function resolveGroupMemberName({
  membership,
  connectionMap,
  profiles,
  viewerUserId,
  viewerProfileName,
}: Readonly<{
  membership: GroupMembershipRow;
  connectionMap: Map<string, GroupConnectionRow>;
  profiles: Map<string, ProfileRow>;
  viewerUserId: string;
  viewerProfileName: string;
}>) {
  if (membership.user_id) {
    return membership.user_id === viewerUserId
      ? viewerProfileName
      : getProfileName(profiles.get(membership.user_id));
  }

  if (!membership.connection_id) {
    return null;
  }

  const connection = connectionMap.get(membership.connection_id);

  if (!connection) {
    return null;
  }

  return connection.linked_user_id === viewerUserId ? viewerProfileName : connection.display_name;
}

function buildGroupMemberMap(
  groups: GroupRow[],
  memberships: GroupMembershipRow[],
  groupConnections: GroupConnectionRow[],
  profiles: Map<string, ProfileRow>,
  viewerUserId: string,
  viewerProfileName: string,
) {
  const connectionMap = new Map(groupConnections.map((connection) => [connection.id, connection]));
  const memberMap = new Map<string, string[]>();

  groups.forEach((group) => memberMap.set(group.id, []));

  for (const membership of memberships) {
    const names = memberMap.get(membership.group_id);

    if (!names) {
      continue;
    }

    const memberName = resolveGroupMemberName({
      membership,
      connectionMap,
      profiles,
      viewerUserId,
      viewerProfileName,
    });

    if (memberName) {
      names.push(memberName);
    }
  }

  return memberMap;
}

function buildGroupPendingInviteMap(groupInvites: GroupInviteRow[], connections: ConnectionRow[]) {
  const connectionNameMap = new Map(connections.map((connection) => [connection.id, connection.display_name]));

  return groupInvites.reduce<Map<string, PendingGroupMember[]>>((accumulator, invite) => {
    const pendingMembers = accumulator.get(invite.group_id) ?? [];

    pendingMembers.push({
      connectionId: invite.connection_id,
      name: connectionNameMap.get(invite.connection_id) ?? invite.invited_email,
      invitedEmail: invite.invited_email,
    });
    accumulator.set(invite.group_id, pendingMembers);
    return accumulator;
  }, new Map());
}

function getRosterLinkState(connection?: GroupConnectionRow | null, connectionInvite?: ConnectionInviteRow) {
  if (connection?.linked_user_id) {
    return "linked" as const;
  }

  if (connectionInvite) {
    return "pending" as const;
  }

  return "unlinked" as const;
}

function compareGroupRosterMembers(left: GroupRosterMember, right: GroupRosterMember) {
  const stateOrder = {
    linked: 0,
    pending: 1,
    unlinked: 2,
  } as const;

  if (left.isOwner !== right.isOwner) {
    return left.isOwner ? -1 : 1;
  }

  if (left.hasAcceptedMembership !== right.hasAcceptedMembership) {
    return left.hasAcceptedMembership ? -1 : 1;
  }

  const linkStateDifference = stateOrder[left.linkState] - stateOrder[right.linkState];

  if (linkStateDifference !== 0) {
    return linkStateDifference;
  }

  return left.title.localeCompare(right.title);
}

export function buildGroupRosterMembers({
  group,
  memberships,
  groupConnections,
  connectionInviteMap,
  groupInvites,
  profiles,
  viewerUserId,
  viewerProfileName,
  membershipRole,
}: Readonly<{
  group: GroupRow;
  memberships: GroupMembershipRow[];
  groupConnections: GroupConnectionRow[];
  connectionInviteMap: Map<string, ConnectionInviteRow>;
  groupInvites: GroupInviteRow[];
  profiles: Map<string, ProfileRow>;
  viewerUserId: string;
  viewerProfileName: string;
  membershipRole?: GroupRole;
}>) {
  if (!getGroupRoleCapabilities(membershipRole).canManageMembers) {
    return [];
  }

  const connectionMap = new Map(groupConnections.map((connection) => [connection.id, connection]));
  const groupMemberships = memberships.filter((membership) => membership.group_id === group.id);
  const activeGroupInvites = groupInvites.filter(
    (invite) => invite.group_id === group.id && !invite.accepted_at && !invite.declined_at && !invite.revoked_at,
  );
  const acceptedInviteByUserId = groupInvites.reduce<Map<string, GroupInviteRow>>((accumulator, invite) => {
    if (
      invite.group_id !== group.id
      || !invite.accepted_at
      || !invite.accepted_by_user_id
      || accumulator.has(invite.accepted_by_user_id)
    ) {
      return accumulator;
    }

    accumulator.set(invite.accepted_by_user_id, invite);
    return accumulator;
  }, new Map());
  const activeInviteByConnectionId = activeGroupInvites.reduce<Map<string, GroupInviteRow>>((accumulator, invite) => {
    if (!accumulator.has(invite.connection_id)) {
      accumulator.set(invite.connection_id, invite);
    }

    return accumulator;
  }, new Map());
  const rosterMembers: GroupRosterMember[] = [];
  const seenKeys = new Set<string>();

  function pushMember(member: GroupRosterMember) {
    if (seenKeys.has(member.key)) {
      return;
    }

    seenKeys.add(member.key);
    rosterMembers.push(member);
  }

  pushMember({
    key: `user:${group.owner_user_id}`,
    title: group.owner_user_id === viewerUserId ? viewerProfileName : getProfileName(profiles.get(group.owner_user_id)),
    subtitle: "Group owner",
    role: "owner",
    linkState: "linked",
    userId: group.owner_user_id,
    isOwner: true,
    hasAcceptedMembership: true,
    canRemove: false,
    canCancelInvite: false,
    canResendInvite: false,
    canInviteLocal: false,
  });

  for (const membership of groupMemberships) {
    if (membership.role === "owner" || membership.user_id === group.owner_user_id) {
      continue;
    }

    if (membership.connection_id) {
      const connection = connectionMap.get(membership.connection_id);

      if (!connection) {
        continue;
      }

      const activeInvite = activeInviteByConnectionId.get(connection.id);
      const connectionInvite = connectionInviteMap.get(connection.id);

      pushMember({
        key: `connection:${connection.id}`,
        title: connection.display_name,
        subtitle: activeInvite
          ? `Invite pending for ${activeInvite.invited_email}.`
          : connection.contact_email
            ? `Accepted member with ${connection.contact_email} on file.`
            : "Local-only member.",
        role: membership.role,
        linkState: activeInvite ? "pending" : getRosterLinkState(connection, connectionInvite),
        connectionId: connection.id,
        pendingInviteEmail: activeInvite?.invited_email ?? undefined,
        isOwner: false,
        hasAcceptedMembership: true,
        canRemove: true,
        canCancelInvite: Boolean(activeInvite),
        canResendInvite: Boolean(activeInvite),
        canInviteLocal: !activeInvite && !connection.linked_user_id && !connection.contact_email,
      });
      continue;
    }

    if (!membership.user_id) {
      continue;
    }

    const acceptedInvite = acceptedInviteByUserId.get(membership.user_id);
    const matchedConnection = acceptedInvite
      ? connectionMap.get(acceptedInvite.connection_id)
      : groupConnections.find((connection) => connection.linked_user_id === membership.user_id);

    pushMember({
      key: `user:${membership.user_id}`,
      title: membership.user_id === viewerUserId ? viewerProfileName : getProfileName(profiles.get(membership.user_id)),
      subtitle: matchedConnection
        ? `Accepted member linked through ${matchedConnection.display_name}.`
        : "Accepted member with an app account.",
      role: membership.role,
      linkState: "linked",
      connectionId: matchedConnection?.id,
      userId: membership.user_id,
      isOwner: false,
      hasAcceptedMembership: true,
      canRemove: true,
      canCancelInvite: false,
      canResendInvite: false,
      canInviteLocal: false,
    });
  }

  for (const invite of activeGroupInvites) {
    const key = `connection:${invite.connection_id}`;

    if (seenKeys.has(key)) {
      continue;
    }

    const connection = connectionMap.get(invite.connection_id);
    pushMember({
      key,
      title: connection?.display_name ?? invite.invited_email,
      subtitle: `Invite pending for ${invite.invited_email}.`,
      role: "pending",
      linkState: "pending",
      connectionId: invite.connection_id,
      pendingInviteEmail: invite.invited_email,
      isOwner: false,
      hasAcceptedMembership: false,
      canRemove: false,
      canCancelInvite: true,
      canResendInvite: true,
      canInviteLocal: false,
    });
  }

  return rosterMembers.sort(compareGroupRosterMembers);
}

export async function getDashboardData(supabase: SupabaseClient, userId: string) {
  const [
    profileResult,
    connectionResult,
    ownedGroupResult,
    cadenceResult,
    touchpointResult,
    hangoutResult,
    inviteResult,
    acceptedGroupInviteResult,
    activeUserGroupMembershipResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id, display_name, first_name, last_name").eq("id", userId).maybeSingle(),
    supabase
      .from("connections")
      .select("id, display_name, prefers_profile_name, contact_email, linked_user_id, tags, notes, preferred_activities, created_at")
      .eq("owner_user_id", userId)
      .is("archived_at", null)
      .order("display_name"),
    supabase
      .from("groups")
      .select("id, name, description, created_at, owner_user_id")
      .eq("owner_user_id", userId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("cadence_rules")
      .select("id, target_type, target_id, cadence_value, cadence_unit, reminder_lead_days")
      .eq("owner_user_id", userId),
    supabase
      .from("touchpoints")
      .select("id, target_type, target_id, touchpoint_type, occurred_at, note, activity_label, location_label, photo_album_label, photo_album_url")
      .eq("owner_user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase
      .from("hangouts")
      .select("id, owner_user_id, target_type, target_id, title, starts_at, ends_at, timezone, location, place_name, place_address, google_place_id, google_maps_url, yelp_business_id, yelp_url, opentable_url, notes, status, proposal_state, proposal_confirmed_at, photo_album_label, photo_album_url, completed_at, created_at")
      .eq("owner_user_id", userId)
      .order("starts_at"),
    supabase
      .from("connection_invites")
      .select("connection_id, invited_email, created_at")
      .eq("owner_user_id", userId)
      .is("claimed_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_invites")
      .select("group_id")
      .eq("accepted_by_user_id", userId)
      .not("accepted_at", "is", null)
      .is("revoked_at", null),
    supabase
      .from("group_memberships")
      .select("group_id, role")
      .eq("user_id", userId)
      .is("removed_at", null),
  ]);

  assertNoError(profileResult.error, "Failed to load profile");
  assertNoError(connectionResult.error, "Failed to load connections");
  assertNoError(ownedGroupResult.error, "Failed to load groups");
  assertNoError(cadenceResult.error, "Failed to load cadence rules");
  assertNoError(touchpointResult.error, "Failed to load touchpoints");
  assertNoError(hangoutResult.error, "Failed to load hangouts");
  assertNoError(inviteResult.error, "Failed to load connection invites");
  assertNoError(acceptedGroupInviteResult.error, "Failed to load accepted group invites");
  assertNoError(activeUserGroupMembershipResult.error, "Failed to load active group memberships");

  const viewerProfileName = getProfileName((profileResult.data ?? undefined) as ProfileRow | undefined);

  const connections = (connectionResult.data ?? []) as ConnectionRow[];
  const ownedGroups = (ownedGroupResult.data ?? []) as GroupRow[];
  const cadenceRules = (cadenceResult.data ?? []) as CadenceRuleRow[];
  const baseTouchpoints = (touchpointResult.data ?? []) as TouchpointRow[];
  const baseHangouts = (hangoutResult.data ?? []) as HangoutRow[];
  const invites = (inviteResult.data ?? []) as ConnectionInviteRow[];
  const acceptedGroupInvites = (acceptedGroupInviteResult.data ?? []) as AcceptedGroupInviteRow[];
  const activeUserGroupMemberships = (activeUserGroupMembershipResult.data ?? []) as ActiveUserGroupMembershipRow[];

  const participantConnectionRowsResult = await supabase
    .from("hangout_participants")
    .select("hangout_id, participant_user_id, participant_connection_id, response_status")
    .eq("participant_user_id", userId);

  assertNoError(participantConnectionRowsResult.error, "Failed to load shared connection hangout participants");
  const participantConnectionRows = (participantConnectionRowsResult.data ?? []) as HangoutParticipantRow[];
  const participantConnectionHangoutIds = [...new Set(
    participantConnectionRows.map((participant) => participant.hangout_id),
  )];

  const ownedGroupIds = new Set(ownedGroups.map((group) => group.id));
  const joinedGroupIds = [...new Set([
    ...acceptedGroupInvites.map((invite) => invite.group_id),
    ...activeUserGroupMemberships.map((membership) => membership.group_id),
  ])].filter((groupId) => !ownedGroupIds.has(groupId));

  let joinedGroups: GroupRow[] = [];
  let extraCadenceRules: CadenceRuleRow[] = [];
  let extraTouchpoints: TouchpointRow[] = [];
  let extraHangouts: HangoutRow[] = [];
  let participantConnectionHangouts: HangoutRow[] = [];
  let sharedGroupTouchpoints: TouchpointRow[] = [];
  let sharedGroupHangouts: HangoutRow[] = [];

  if (participantConnectionHangoutIds.length > 0) {
    const participantConnectionHangoutResult = await supabase
      .from("hangouts")
      .select("id, owner_user_id, target_type, target_id, title, starts_at, ends_at, timezone, location, place_name, place_address, google_place_id, google_maps_url, yelp_business_id, yelp_url, opentable_url, notes, status, proposal_state, proposal_confirmed_at, photo_album_label, photo_album_url, completed_at, created_at")
      .eq("target_type", "connection")
      .in("id", participantConnectionHangoutIds)
      .order("starts_at");

    assertNoError(participantConnectionHangoutResult.error, "Failed to load shared connection hangouts");
    participantConnectionHangouts = (participantConnectionHangoutResult.data ?? []) as HangoutRow[];
  }

  if (joinedGroupIds.length > 0) {
    const [joinedGroupResult, joinedCadenceResult, joinedTouchpointResult, joinedHangoutResult] = await Promise.all([
      supabase
        .from("groups")
        .select("id, name, description, created_at, owner_user_id")
        .in("id", joinedGroupIds)
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("cadence_rules")
        .select("id, target_type, target_id, cadence_value, cadence_unit, reminder_lead_days")
        .eq("target_type", "group")
        .in("target_id", joinedGroupIds),
      supabase
        .from("touchpoints")
        .select("id, target_type, target_id, touchpoint_type, occurred_at, note, activity_label, location_label, photo_album_label, photo_album_url")
        .eq("target_type", "group")
        .in("target_id", joinedGroupIds)
        .order("occurred_at", { ascending: false })
        .limit(100),
      supabase
        .from("hangouts")
        .select("id, owner_user_id, target_type, target_id, title, starts_at, ends_at, timezone, location, place_name, place_address, google_place_id, google_maps_url, yelp_business_id, yelp_url, opentable_url, notes, status, proposal_state, proposal_confirmed_at, photo_album_label, photo_album_url, completed_at, created_at")
        .eq("target_type", "group")
        .in("target_id", joinedGroupIds)
        .order("starts_at"),
    ]);

    assertNoError(joinedGroupResult.error, "Failed to load joined groups");
    assertNoError(joinedCadenceResult.error, "Failed to load joined group cadence rules");
    assertNoError(joinedTouchpointResult.error, "Failed to load joined group touchpoints");
    assertNoError(joinedHangoutResult.error, "Failed to load joined group hangouts");

    joinedGroups = (joinedGroupResult.data ?? []) as GroupRow[];
    extraCadenceRules = (joinedCadenceResult.data ?? []) as CadenceRuleRow[];
    extraTouchpoints = (joinedTouchpointResult.data ?? []) as TouchpointRow[];
    extraHangouts = (joinedHangoutResult.data ?? []) as HangoutRow[];
  }

  const groups = [...ownedGroups, ...joinedGroups].sort((left, right) => left.name.localeCompare(right.name));
  const accessibleGroupIds = groups.map((group) => group.id);

  if (accessibleGroupIds.length > 0) {
    const [sharedGroupTouchpointResult, sharedGroupHangoutResult] = await Promise.all([
      supabase
        .from("touchpoints")
        .select("id, target_type, target_id, touchpoint_type, occurred_at, note, activity_label, location_label, photo_album_label, photo_album_url")
        .eq("target_type", "group")
        .in("target_id", accessibleGroupIds)
        .order("occurred_at", { ascending: false })
        .limit(100),
      supabase
        .from("hangouts")
        .select("id, owner_user_id, target_type, target_id, title, starts_at, ends_at, timezone, location, place_name, place_address, google_place_id, google_maps_url, yelp_business_id, yelp_url, opentable_url, notes, status, proposal_state, proposal_confirmed_at, photo_album_label, photo_album_url, completed_at, created_at")
        .eq("target_type", "group")
        .in("target_id", accessibleGroupIds)
        .order("starts_at"),
    ]);

    assertNoError(sharedGroupTouchpointResult.error, "Failed to load shared group touchpoints");
    assertNoError(sharedGroupHangoutResult.error, "Failed to load shared group hangouts");

    sharedGroupTouchpoints = (sharedGroupTouchpointResult.data ?? []) as TouchpointRow[];
    sharedGroupHangouts = (sharedGroupHangoutResult.data ?? []) as HangoutRow[];
  }

  const allCadenceRules = [...cadenceRules, ...extraCadenceRules];
  const dedupedTouchpointsById = new Map<string, TouchpointRow>();

  for (const touchpoint of [...baseTouchpoints, ...extraTouchpoints, ...sharedGroupTouchpoints]) {
    dedupedTouchpointsById.set(touchpoint.id, touchpoint);
  }

  const touchpoints = [...dedupedTouchpointsById.values()]
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
    .slice(0, 100);
  const dedupedHangoutsById = new Map<string, HangoutRow>();

  for (const hangout of [...baseHangouts, ...extraHangouts, ...participantConnectionHangouts, ...sharedGroupHangouts]) {
    dedupedHangoutsById.set(hangout.id, hangout);
  }

  const hangouts = [...dedupedHangoutsById.values()].sort((left, right) => left.starts_at.localeCompare(right.starts_at));
  let hangoutParticipants: HangoutParticipantRow[] = [];

  if (hangouts.length > 0) {
    const participantResult = await supabase
      .from("hangout_participants")
      .select("hangout_id, participant_user_id, participant_connection_id, response_status")
      .in("hangout_id", hangouts.map((hangout) => hangout.id));

    assertNoError(participantResult.error, "Failed to load hangout participants");
    hangoutParticipants = (participantResult.data ?? []) as HangoutParticipantRow[];
  }

  let memberships: GroupMembershipRow[] = [];
  let groupInvites: GroupInviteRow[] = [];
  let groupConnections: GroupConnectionRow[] = [];
  let groupConnectionInvites: ConnectionInviteRow[] = [];
  let groupProfiles = new Map<string, ProfileRow>();

  if (groups.length > 0) {
    const [membershipResult, groupInviteResult] = await Promise.all([
      supabase
        .from("group_memberships")
        .select("group_id, connection_id, user_id, role")
        .in(
          "group_id",
          groups.map((group) => group.id),
        )
        .is("removed_at", null),
      supabase
        .from("group_invites")
        .select("group_id, connection_id, invited_email, created_at, accepted_by_user_id, accepted_at, declined_at, revoked_at")
        .in(
          "group_id",
          groups.map((group) => group.id),
        )
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
    ]);

    assertNoError(membershipResult.error, "Failed to load group memberships");
    assertNoError(groupInviteResult.error, "Failed to load group invites");
    memberships = (membershipResult.data ?? []) as GroupMembershipRow[];
    groupInvites = (groupInviteResult.data ?? []) as GroupInviteRow[];

    const groupConnectionIds = [...new Set([
      ...memberships.flatMap((membership) => membership.connection_id ? [membership.connection_id] : []),
      ...groupInvites.map((invite) => invite.connection_id),
    ])];
    const groupProfileIds = [...new Set([
      ...groups.map((group) => group.owner_user_id),
      ...memberships.flatMap((membership) => membership.user_id ? [membership.user_id] : []),
    ])];

    const [groupConnectionResult, groupConnectionInviteResult, groupProfileResult] = await Promise.all([
      groupConnectionIds.length > 0
        ? supabase
            .from("connections")
            .select("id, owner_user_id, display_name, contact_email, linked_user_id, tags, notes, preferred_activities, created_at")
            .in("id", groupConnectionIds)
        : Promise.resolve({ data: [], error: null }),
      groupConnectionIds.length > 0
        ? supabase
            .from("connection_invites")
            .select("connection_id, invited_email, created_at")
            .in("connection_id", groupConnectionIds)
            .is("claimed_at", null)
            .is("revoked_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      groupProfileIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, display_name, first_name, last_name")
            .in("id", groupProfileIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    assertNoError(groupConnectionResult.error, "Failed to load group connections");
    assertNoError(groupConnectionInviteResult.error, "Failed to load group connection invites");
    assertNoError(groupProfileResult.error, "Failed to load group profiles");

    groupConnections = (groupConnectionResult.data ?? []) as GroupConnectionRow[];
    groupConnectionInvites = (groupConnectionInviteResult.data ?? []) as ConnectionInviteRow[];
    groupProfiles = new Map(((groupProfileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  }

  const cadenceMap = new Map(allCadenceRules.map((rule) => [`${rule.target_type}:${rule.target_id}`, rule]));
  const latestTouchpoints = latestTouchpointMap(touchpoints);
  const groupMemberMap = buildGroupMemberMap(
    groups,
    memberships,
    groupConnections,
    groupProfiles,
    userId,
    viewerProfileName,
  );
  const activeGroupInvites = groupInvites.filter((invite) => !invite.accepted_at && !invite.declined_at && !invite.revoked_at);
  const groupPendingInviteMap = buildGroupPendingInviteMap(activeGroupInvites, groupConnections);
  const groupMemberIdsMap = memberships.reduce<Map<string, string[]>>((accumulator, membership) => {
    if (!membership.connection_id) {
      return accumulator;
    }

    const current = accumulator.get(membership.group_id) ?? [];
    current.push(membership.connection_id);
    accumulator.set(membership.group_id, current);
    return accumulator;
  }, new Map());
  const inviteMap = invites.reduce<Map<string, ConnectionInviteRow>>((accumulator, current) => {
    if (!accumulator.has(current.connection_id)) {
      accumulator.set(current.connection_id, current);
    }

    return accumulator;
  }, new Map());
  const groupConnectionInviteMap = groupConnectionInvites.reduce<Map<string, ConnectionInviteRow>>((accumulator, current) => {
    if (!accumulator.has(current.connection_id)) {
      accumulator.set(current.connection_id, current);
    }

    return accumulator;
  }, new Map());
  const viewerGroupRoleMap = groups.reduce<Map<string, GroupRole>>((accumulator, group) => {
    if (group.owner_user_id === userId) {
      accumulator.set(group.id, "owner");
    }

    return accumulator;
  }, new Map());

  for (const membership of memberships) {
    if (membership.user_id === userId && !viewerGroupRoleMap.has(membership.group_id)) {
      viewerGroupRoleMap.set(membership.group_id, membership.role);
    }
  }

  const nextHangoutMap = hangouts.reduce<Map<string, HangoutRow>>((accumulator, current) => {
    if (current.status !== "planned") {
      return accumulator;
    }

    const key = `${current.target_type}:${current.target_id}`;

    if (!accumulator.has(key)) {
      accumulator.set(key, current);
    }

    return accumulator;
  }, new Map());
  const touchpointCounts = touchpoints.reduce<Map<string, number>>((accumulator, current) => {
    const key = `${current.target_type}:${current.target_id}`;
    accumulator.set(key, (accumulator.get(key) ?? 0) + 1);
    return accumulator;
  }, new Map());

  const connectionSummaries: RelationshipSummary[] = connections.map((connection) => {
    const key = `connection:${connection.id}`;
    const cadenceRule = cadenceMap.get(key) ?? getFallbackCadenceRule("connection", connection.id);

    const latestTouchpoint = latestTouchpoints.get(key);
    const pendingInvite = inviteMap.get(connection.id);
    const nextHangout = nextHangoutMap.get(key);
    let linkState: RelationshipSummary["linkState"] = "unlinked";

    if (connection.linked_user_id) {
      linkState = "linked";
    } else if (pendingInvite) {
      linkState = "pending";
    }

    const health = getRelationshipHealth({
      createdAt: connection.created_at,
      lastTouchpointAt: latestTouchpoint?.occurred_at,
      cadenceValue: cadenceRule.cadence_value,
      cadenceUnit: cadenceRule.cadence_unit,
      reminderLeadDays: cadenceRule.reminder_lead_days,
      subjectType: "connection",
    });

    return {
      id: connection.id,
      targetType: "connection",
      title: connection.display_name,
      subtitle: connection.tags?.length ? connection.tags.join(" • ") : "Personal connection",
      cadenceLabel: formatCadence(cadenceRule.cadence_value, cadenceRule.cadence_unit),
      cadenceValue: cadenceRule.cadence_value,
      cadenceUnit: cadenceRule.cadence_unit,
      reminderLeadDays: cadenceRule.reminder_lead_days,
      health,
      notes: connection.notes ?? undefined,
      tags: connection.tags ?? [],
      linkedUserId: connection.linked_user_id ?? undefined,
      contactEmail: connection.contact_email ?? undefined,
      prefersProfileName: connection.prefers_profile_name,
      linkState,
      pendingInviteEmail: pendingInvite?.invited_email,
      preferredActivities: connection.preferred_activities ?? undefined,
      lastTouchpointAt: latestTouchpoint?.occurred_at,
      lastTouchpointLabel: formatDateLabel(latestTouchpoint?.occurred_at),
      nextHangoutLabel: nextHangout
        ? formatHangoutWindow({
            startsAt: nextHangout.starts_at,
            endsAt: nextHangout.ends_at ?? undefined,
            timezone: nextHangout.timezone,
          })
        : undefined,
      touchpointCount: touchpointCounts.get(key) ?? 0,
      memberNames: [],
      memberConnectionIds: [],
      pendingMembers: [],
      pendingMemberConnectionIds: [],
      pendingMemberCount: 0,
    };
  });

  const groupConnectionSummaryMap = new Map(
    groupConnections.map((connection) => {
      const pendingInvite = groupConnectionInviteMap.get(connection.id);
      let linkState: RelationshipSummary["linkState"] = "unlinked";

      if (connection.linked_user_id) {
        linkState = "linked";
      } else if (pendingInvite) {
        linkState = "pending";
      }

      return [
        connection.id,
        {
          linkState,
          pendingInviteEmail: pendingInvite?.invited_email,
        },
      ] as const;
    }),
  );

  const groupSummaries: RelationshipSummary[] = groups.map((group) => {
    const key = `group:${group.id}`;
    const cadenceRule = cadenceMap.get(key) ?? getFallbackCadenceRule("group", group.id);

    const latestTouchpoint = latestTouchpoints.get(key);
    const health = getRelationshipHealth({
      createdAt: group.created_at,
      lastTouchpointAt: latestTouchpoint?.occurred_at,
      cadenceValue: cadenceRule.cadence_value,
      cadenceUnit: cadenceRule.cadence_unit,
      reminderLeadDays: cadenceRule.reminder_lead_days,
      subjectType: "group",
    });

    const memberNames = groupMemberMap.get(group.id) ?? [];
    const memberConnectionIds = groupMemberIdsMap.get(group.id) ?? [];
    const pendingMembers = groupPendingInviteMap.get(group.id) ?? [];
    const nextHangout = nextHangoutMap.get(key);
    const memberStatusCounts = countGroupMemberStatuses(
      memberConnectionIds.map((connectionId) => groupConnectionSummaryMap.get(connectionId)?.linkState),
    );
    const membershipRole = viewerGroupRoleMap.get(group.id) ?? (group.owner_user_id === userId ? "owner" : undefined);
    const capabilities = getGroupRoleCapabilities(membershipRole);
    const visiblePendingMembers = capabilities.canManageMembers ? pendingMembers : [];
    const rosterMembers = buildGroupRosterMembers({
      group,
      memberships,
      groupConnections,
      connectionInviteMap: groupConnectionInviteMap,
      groupInvites,
      profiles: groupProfiles,
      viewerUserId: userId,
      viewerProfileName,
      membershipRole,
    });

    return {
      id: group.id,
      targetType: "group",
      title: group.name,
      subtitle: group.description ?? "Recurring crew",
      cadenceLabel: formatCadence(cadenceRule.cadence_value, cadenceRule.cadence_unit),
      cadenceValue: cadenceRule.cadence_value,
      cadenceUnit: cadenceRule.cadence_unit,
      reminderLeadDays: cadenceRule.reminder_lead_days,
      health,
      notes: group.description ?? undefined,
      tags: [],
      lastTouchpointAt: latestTouchpoint?.occurred_at,
      lastTouchpointLabel: formatDateLabel(latestTouchpoint?.occurred_at),
      nextHangoutLabel: nextHangout
        ? formatHangoutWindow({
            startsAt: nextHangout.starts_at,
            endsAt: nextHangout.ends_at ?? undefined,
            timezone: nextHangout.timezone,
          })
        : undefined,
      touchpointCount: touchpointCounts.get(key) ?? 0,
      memberNames,
      memberConnectionIds,
      pendingMembers: visiblePendingMembers,
      pendingMemberConnectionIds: visiblePendingMembers.map((member) => member.connectionId),
      pendingMemberCount: pendingMembers.length,
      memberStatusCounts,
      membershipRole,
      ownerName: getProfileName(groupProfiles.get(group.owner_user_id)),
      canManage: capabilities.canManageSettings,
      canCreatePlans: capabilities.canCreatePlans,
      canLogTouchpoints: capabilities.canLogTouchpoints,
      canManagePlans: capabilities.canManagePlans,
      rosterMembers,
    };
  });

  const relationships = [...connectionSummaries, ...groupSummaries].sort((left, right) => {
    if (left.health.state !== right.health.state) {
      const order = { overdue: 0, "due-soon": 1, "on-track": 2 } as const;
      return order[left.health.state] - order[right.health.state];
    }

    return left.health.daysUntilDue - right.health.daysUntilDue;
  });

  const targetNames = new Map(relationships.map((relationship) => [`${relationship.targetType}:${relationship.id}`, relationship.title]));
  const hangoutParticipantMap = hangoutParticipants.reduce<Map<string, HangoutParticipantRow[]>>((accumulator, participant) => {
    const current = accumulator.get(participant.hangout_id) ?? [];
    current.push(participant);
    accumulator.set(participant.hangout_id, current);
    return accumulator;
  }, new Map());
  const hangoutSummaries: HangoutSummary[] = hangouts.map((hangout) => {
    const participants = hangoutParticipantMap.get(hangout.id) ?? [];
    const viewerParticipant = participants.find((participant) => participant.participant_user_id === userId);
    let viewerRole: HangoutSummary["viewerRole"] = "observer";

    if (hangout.owner_user_id === userId) {
      viewerRole = "owner";
    } else if (viewerParticipant) {
      viewerRole = "participant";
    }
    const responseCounts = countHangoutResponses(participants.map((participant) => participant.response_status));
    const groupCapabilities = hangout.target_type === "group"
      ? getGroupRoleCapabilities(viewerGroupRoleMap.get(hangout.target_id))
      : null;
    const canManage = hangout.target_type === "group" ? groupCapabilities?.canManagePlans ?? false : viewerRole === "owner";
    const canRespond =
      viewerRole === "participant"
      && hangout.status === "planned"
      && hangout.proposal_state === "pending"
      && (hangout.target_type === "group" || hangout.target_type === "connection");
    const canExportCalendar =
      canManage
      || viewerRole === "owner"
      || viewerParticipant?.response_status === "accepted";
    const effectiveTargetId =
      hangout.target_type === "connection"
      && viewerRole === "participant"
      && viewerParticipant?.participant_connection_id
        ? viewerParticipant.participant_connection_id
        : hangout.target_id;

    return {
      id: hangout.id,
      targetType: hangout.target_type,
      targetId: effectiveTargetId,
      targetLabel: targetNames.get(`${hangout.target_type}:${effectiveTargetId}`) ?? "Unknown relationship",
      title: hangout.title,
      startsAt: hangout.starts_at,
      endsAt: hangout.ends_at ?? undefined,
      timezone: hangout.timezone,
      location: hangout.location ?? undefined,
      placeName: hangout.place_name ?? undefined,
      placeAddress: hangout.place_address ?? undefined,
      googlePlaceId: hangout.google_place_id ?? undefined,
      googleMapsUrl: hangout.google_maps_url ?? undefined,
      yelpBusinessId: hangout.yelp_business_id ?? undefined,
      yelpUrl: hangout.yelp_url ?? undefined,
      opentableUrl: hangout.opentable_url ?? undefined,
      notes: hangout.notes ?? undefined,
      status: hangout.status,
      proposalState: hangout.proposal_state,
      proposalConfirmedAt: hangout.proposal_confirmed_at ?? undefined,
      responseCounts,
      viewerRole,
      viewerResponse: viewerParticipant?.response_status,
      canRespond,
      canManage,
      canExportCalendar,
      photoAlbumLabel: hangout.photo_album_label ?? undefined,
      photoAlbumUrl: hangout.photo_album_url ?? undefined,
      windowLabel: formatHangoutWindow({
        startsAt: hangout.starts_at,
        endsAt: hangout.ends_at ?? undefined,
        timezone: hangout.timezone,
      }),
      bucketLabel: getHangoutWindowBucket(hangout.starts_at),
    };
  });
  const recentTouchpoints: RecentTouchpoint[] = touchpoints.slice(0, 8).map((touchpoint) => ({
    id: touchpoint.id,
    targetType: touchpoint.target_type,
    targetId: touchpoint.target_id,
    targetLabel: targetNames.get(`${touchpoint.target_type}:${touchpoint.target_id}`) ?? "Unknown relationship",
    touchpointType: touchpoint.touchpoint_type,
    occurredAtLabel: formatDateLabel(touchpoint.occurred_at),
    note: touchpoint.note ?? touchpoint.activity_label ?? touchpoint.location_label ?? "No extra context yet",
    activityLabel: touchpoint.activity_label ?? undefined,
    locationLabel: touchpoint.location_label ?? undefined,
    photoAlbumLabel: touchpoint.photo_album_label ?? undefined,
    photoAlbumUrl: touchpoint.photo_album_url ?? undefined,
  }));

  return {
    profileName: profileResult.data?.display_name ?? "there",
    relationships,
    overdue: relationships.filter((relationship) => relationship.health.state === "overdue"),
    dueSoon: relationships.filter((relationship) => relationship.health.state === "due-soon"),
    onTrack: relationships.filter((relationship) => relationship.health.state === "on-track"),
    hangouts: hangoutSummaries,
    upcomingHangouts: hangoutSummaries.filter((hangout) => hangout.status === "planned").slice(0, 6),
    recentTouchpoints,
    connections: connectionSummaries,
    groups: groupSummaries,
    ownedGroupCount: ownedGroups.length,
  } satisfies DashboardData;
}
