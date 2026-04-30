import type { SupabaseClient } from "@supabase/supabase-js";
import { countGroupMemberStatuses, type GroupMemberStatusCounts } from "@/lib/group-members";
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
};

export type HangoutRow = {
  id: string;
  target_type: "connection" | "group";
  target_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: string | null;
  notes: string | null;
  status: HangoutStatus;
  completed_at: string | null;
  created_at: string;
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

function buildGroupMemberMap(groups: GroupRow[], memberships: GroupMembershipRow[], connections: ConnectionRow[]) {
  const connectionNameMap = new Map(connections.map((connection) => [connection.id, connection.display_name]));
  const memberMap = new Map<string, string[]>();

  groups.forEach((group) => memberMap.set(group.id, []));

  for (const membership of memberships) {
    const names = memberMap.get(membership.group_id);

    if (!names) {
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
  const [profileResult, connectionResult, groupResult, cadenceResult, touchpointResult, hangoutResult, inviteResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("connections")
      .select("id, display_name, contact_email, linked_user_id, tags, notes, preferred_activities, created_at")
      .eq("owner_user_id", userId)
      .is("archived_at", null)
      .order("display_name"),
    supabase
      .from("groups")
      .select("id, name, description, created_at")
      .eq("owner_user_id", userId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("cadence_rules")
      .select("id, target_type, target_id, cadence_value, cadence_unit, reminder_lead_days")
      .eq("owner_user_id", userId),
    supabase
      .from("touchpoints")
      .select("id, target_type, target_id, touchpoint_type, occurred_at, note, activity_label, location_label")
      .eq("owner_user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase
      .from("hangouts")
      .select("id, target_type, target_id, title, starts_at, ends_at, timezone, location, notes, status, completed_at, created_at")
      .eq("owner_user_id", userId)
      .order("starts_at"),
    supabase
      .from("connection_invites")
      .select("connection_id, invited_email, created_at")
      .eq("owner_user_id", userId)
      .is("claimed_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  assertNoError(profileResult.error, "Failed to load profile");
  assertNoError(connectionResult.error, "Failed to load connections");
  assertNoError(groupResult.error, "Failed to load groups");
  assertNoError(cadenceResult.error, "Failed to load cadence rules");
  assertNoError(touchpointResult.error, "Failed to load touchpoints");
  assertNoError(hangoutResult.error, "Failed to load hangouts");
  assertNoError(inviteResult.error, "Failed to load connection invites");

  const connections = (connectionResult.data ?? []) as ConnectionRow[];
  const groups = (groupResult.data ?? []) as GroupRow[];
  const cadenceRules = (cadenceResult.data ?? []) as CadenceRuleRow[];
  const touchpoints = (touchpointResult.data ?? []) as TouchpointRow[];
  const hangouts = (hangoutResult.data ?? []) as HangoutRow[];
  const invites = (inviteResult.data ?? []) as ConnectionInviteRow[];

  let memberships: GroupMembershipRow[] = [];
  let groupInvites: GroupInviteRow[] = [];

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
        .eq("owner_user_id", userId)
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
  }

  const cadenceMap = new Map(cadenceRules.map((rule) => [`${rule.target_type}:${rule.target_id}`, rule]));
  const latestTouchpoints = latestTouchpointMap(touchpoints);
  const groupMemberMap = buildGroupMemberMap(groups, memberships, connections);
  const groupPendingInviteMap = buildGroupPendingInviteMap(groupInvites, connections);
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

  const connectionSummaryMap = new Map(connectionSummaries.map((connection) => [connection.id, connection]));

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
      memberConnectionIds.map((connectionId) => connectionSummaryMap.get(connectionId)?.linkState),
    );

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
  const hangoutSummaries: HangoutSummary[] = hangouts.map((hangout) => ({
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
    windowLabel: formatHangoutWindow({
      startsAt: hangout.starts_at,
      endsAt: hangout.ends_at ?? undefined,
      timezone: hangout.timezone,
    }),
    bucketLabel: getHangoutWindowBucket(hangout.starts_at),
  }));
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
  } satisfies DashboardData;
}
