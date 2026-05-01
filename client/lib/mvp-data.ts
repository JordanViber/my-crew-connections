import type { SupabaseClient } from "@supabase/supabase-js";
import { countGroupMemberStatuses, type GroupMemberStatusCounts } from "@/lib/group-members";
import {
  countHangoutResponses,
  type HangoutProposalState,
  type HangoutResponseCounts,
  type HangoutResponseStatus,
} from "@/lib/hangout-participants";
import { formatHangoutWindow, getHangoutWindowBucket, type HangoutStatus } from "@/lib/hangouts";
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
  response_status: HangoutResponseStatus;
};

type GroupMembershipRow = {
  group_id: string;
  connection_id: string | null;
  user_id: string | null;
  role: string;
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
};

type AcceptedGroupInviteRow = {
  group_id: string;
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
  membershipRole?: "owner" | "member";
  ownerName?: string;
  canManage?: boolean;
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

function buildGroupMemberMap(
  groups: GroupRow[],
  memberships: GroupMembershipRow[],
  groupConnections: GroupConnectionRow[],
  profiles: Map<string, ProfileRow>,
) {
  const connectionNameMap = new Map(groupConnections.map((connection) => [connection.id, connection.display_name]));
  const memberMap = new Map<string, string[]>();

  groups.forEach((group) => memberMap.set(group.id, []));

  for (const membership of memberships) {
    const names = memberMap.get(membership.group_id);

    if (!names) {
      continue;
    }

    if (membership.user_id) {
      names.push(getProfileName(profiles.get(membership.user_id)));
      continue;
    }

    if (membership.connection_id) {
      const displayName = connectionNameMap.get(membership.connection_id);

      if (displayName) {
        names.push(displayName);
      }
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

export async function getDashboardData(supabase: SupabaseClient, userId: string) {
  const [
    profileResult,
    connectionResult,
    linkedConnectionResult,
    ownedGroupResult,
    cadenceResult,
    touchpointResult,
    hangoutResult,
    inviteResult,
    acceptedGroupInviteResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id, display_name, first_name, last_name").eq("id", userId).maybeSingle(),
    supabase
      .from("connections")
      .select("id, display_name, contact_email, linked_user_id, tags, notes, preferred_activities, created_at")
      .eq("owner_user_id", userId)
      .is("archived_at", null)
      .order("display_name"),
    supabase
      .from("connections")
      .select("id")
      .eq("linked_user_id", userId)
      .is("archived_at", null),
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
      .select("id, owner_user_id, target_type, target_id, title, starts_at, ends_at, timezone, location, notes, status, proposal_state, proposal_confirmed_at, photo_album_label, photo_album_url, completed_at, created_at")
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
  ]);

  assertNoError(profileResult.error, "Failed to load profile");
  assertNoError(connectionResult.error, "Failed to load connections");
  assertNoError(linkedConnectionResult.error, "Failed to load linked connections");
  assertNoError(ownedGroupResult.error, "Failed to load groups");
  assertNoError(cadenceResult.error, "Failed to load cadence rules");
  assertNoError(touchpointResult.error, "Failed to load touchpoints");
  assertNoError(hangoutResult.error, "Failed to load hangouts");
  assertNoError(inviteResult.error, "Failed to load connection invites");
  assertNoError(acceptedGroupInviteResult.error, "Failed to load accepted group invites");

  const connections = (connectionResult.data ?? []) as ConnectionRow[];
  const ownedGroups = (ownedGroupResult.data ?? []) as GroupRow[];
  const cadenceRules = (cadenceResult.data ?? []) as CadenceRuleRow[];
  const baseTouchpoints = (touchpointResult.data ?? []) as TouchpointRow[];
  const baseHangouts = (hangoutResult.data ?? []) as HangoutRow[];
  const invites = (inviteResult.data ?? []) as ConnectionInviteRow[];
  const acceptedGroupInvites = (acceptedGroupInviteResult.data ?? []) as AcceptedGroupInviteRow[];
  const linkedConnectionIds = (linkedConnectionResult.data ?? []).flatMap((connection) => connection.id ? [connection.id] : []);

  let directGroupMemberships: Array<{ group_id: string }> = [];

  if (linkedConnectionIds.length > 0) {
    const directGroupMembershipResult = await supabase
      .from("group_memberships")
      .select("group_id")
      .in("connection_id", linkedConnectionIds)
      .is("removed_at", null);

    assertNoError(directGroupMembershipResult.error, "Failed to load direct group memberships");
    directGroupMemberships = (directGroupMembershipResult.data ?? []) as Array<{ group_id: string }>;
  }

  const ownedGroupIds = new Set(ownedGroups.map((group) => group.id));
  const joinedGroupIds = [...new Set([
    ...acceptedGroupInvites.map((invite) => invite.group_id),
    ...directGroupMemberships.map((membership) => membership.group_id),
  ])].filter((groupId) => !ownedGroupIds.has(groupId));

  let joinedGroups: GroupRow[] = [];
  let extraCadenceRules: CadenceRuleRow[] = [];
  let extraTouchpoints: TouchpointRow[] = [];
  let extraHangouts: HangoutRow[] = [];

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
        .select("id, owner_user_id, target_type, target_id, title, starts_at, ends_at, timezone, location, notes, status, proposal_state, proposal_confirmed_at, photo_album_label, photo_album_url, completed_at, created_at")
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
  const allCadenceRules = [...cadenceRules, ...extraCadenceRules];
  const touchpoints = [...baseTouchpoints, ...extraTouchpoints]
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
    .slice(0, 100);
  const hangouts = [...baseHangouts, ...extraHangouts].sort((left, right) => left.starts_at.localeCompare(right.starts_at));
  let hangoutParticipants: HangoutParticipantRow[] = [];

  if (hangouts.length > 0) {
    const participantResult = await supabase
      .from("hangout_participants")
      .select("hangout_id, participant_user_id, response_status")
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
        .select("group_id, connection_id, invited_email, created_at")
        .in(
          "group_id",
          groups.map((group) => group.id),
        )
        .is("accepted_at", null)
        .is("declined_at", null)
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
  const groupMemberMap = buildGroupMemberMap(groups, memberships, groupConnections, groupProfiles);
  const groupPendingInviteMap = buildGroupPendingInviteMap(groupInvites, groupConnections);
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
    const cadenceRule = cadenceMap.get(key);

    if (!cadenceRule) {
      throw new Error(`Missing cadence rule for connection ${connection.display_name}`);
    }

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
    const cadenceRule = cadenceMap.get(key);

    if (!cadenceRule) {
      throw new Error(`Missing cadence rule for group ${group.name}`);
    }

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
    const membershipRole = group.owner_user_id === userId ? "owner" : "member";

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
      pendingMembers,
      pendingMemberConnectionIds: pendingMembers.map((member) => member.connectionId),
      pendingMemberCount: pendingMembers.length,
      memberStatusCounts,
      membershipRole,
      ownerName: getProfileName(groupProfiles.get(group.owner_user_id)),
      canManage: membershipRole === "owner",
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
    const canManage = viewerRole === "owner";
    const canRespond = viewerRole === "participant" && hangout.target_type === "group" && hangout.status === "planned" && hangout.proposal_state === "pending";
    const canExportCalendar = canManage || hangout.target_type === "connection" || viewerParticipant?.response_status === "accepted";

    return {
      id: hangout.id,
      targetType: hangout.target_type,
      targetId: hangout.target_id,
      targetLabel: targetNames.get(`${hangout.target_type}:${hangout.target_id}`) ?? "Unknown relationship",
      title: hangout.title,
      startsAt: hangout.starts_at,
      endsAt: hangout.ends_at ?? undefined,
      timezone: hangout.timezone,
      location: hangout.location ?? undefined,
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
