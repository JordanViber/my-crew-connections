import type { SupabaseClient } from "@supabase/supabase-js";
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

type GroupMembershipRow = {
  group_id: string;
  connection_id: string | null;
  user_id: string | null;
  role: string;
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
  preferredActivities?: string;
  lastTouchpointAt?: string;
  lastTouchpointLabel: string;
  touchpointCount: number;
  memberNames: string[];
};

export type RecentTouchpoint = {
  id: string;
  targetLabel: string;
  touchpointType: string;
  occurredAtLabel: string;
  note: string;
};

export type DashboardData = {
  profileName: string;
  relationships: RelationshipSummary[];
  overdue: RelationshipSummary[];
  dueSoon: RelationshipSummary[];
  onTrack: RelationshipSummary[];
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

    if (membership.user_id) {
      names.push(membership.role === "owner" ? "You" : "Linked member");
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

export async function getDashboardData(supabase: SupabaseClient, userId: string) {
  const [profileResult, connectionResult, groupResult, cadenceResult, touchpointResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("connections")
      .select("id, display_name, tags, notes, preferred_activities, created_at")
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
  ]);

  assertNoError(profileResult.error, "Failed to load profile");
  assertNoError(connectionResult.error, "Failed to load connections");
  assertNoError(groupResult.error, "Failed to load groups");
  assertNoError(cadenceResult.error, "Failed to load cadence rules");
  assertNoError(touchpointResult.error, "Failed to load touchpoints");

  const connections = (connectionResult.data ?? []) as ConnectionRow[];
  const groups = (groupResult.data ?? []) as GroupRow[];
  const cadenceRules = (cadenceResult.data ?? []) as CadenceRuleRow[];
  const touchpoints = (touchpointResult.data ?? []) as TouchpointRow[];

  let memberships: GroupMembershipRow[] = [];

  if (groups.length > 0) {
    const membershipResult = await supabase
      .from("group_memberships")
      .select("group_id, connection_id, user_id, role")
      .in(
        "group_id",
        groups.map((group) => group.id),
      )
      .is("removed_at", null);

    assertNoError(membershipResult.error, "Failed to load group memberships");
    memberships = (membershipResult.data ?? []) as GroupMembershipRow[];
  }

  const cadenceMap = new Map(cadenceRules.map((rule) => [`${rule.target_type}:${rule.target_id}`, rule]));
  const latestTouchpoints = latestTouchpointMap(touchpoints);
  const groupMemberMap = buildGroupMemberMap(groups, memberships, connections);
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
    const health = getRelationshipHealth({
      createdAt: connection.created_at,
      lastTouchpointAt: latestTouchpoint?.occurred_at,
      cadenceValue: cadenceRule.cadence_value,
      cadenceUnit: cadenceRule.cadence_unit,
      reminderLeadDays: cadenceRule.reminder_lead_days,
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
      preferredActivities: connection.preferred_activities ?? undefined,
      lastTouchpointAt: latestTouchpoint?.occurred_at,
      lastTouchpointLabel: formatDateLabel(latestTouchpoint?.occurred_at),
      touchpointCount: touchpointCounts.get(key) ?? 0,
      memberNames: [],
    };
  });

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
    });

    const memberNames = groupMemberMap.get(group.id) ?? [];

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
      touchpointCount: touchpointCounts.get(key) ?? 0,
      memberNames,
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
  const recentTouchpoints: RecentTouchpoint[] = touchpoints.slice(0, 8).map((touchpoint) => ({
    id: touchpoint.id,
    targetLabel: targetNames.get(`${touchpoint.target_type}:${touchpoint.target_id}`) ?? "Unknown relationship",
    touchpointType: touchpoint.touchpoint_type,
    occurredAtLabel: formatDateLabel(touchpoint.occurred_at),
    note: touchpoint.note ?? touchpoint.activity_label ?? touchpoint.location_label ?? "No extra context yet",
  }));

  return {
    profileName: profileResult.data?.display_name ?? "there",
    relationships,
    overdue: relationships.filter((relationship) => relationship.health.state === "overdue"),
    dueSoon: relationships.filter((relationship) => relationship.health.state === "due-soon"),
    onTrack: relationships.filter((relationship) => relationship.health.state === "on-track"),
    recentTouchpoints,
    connections: connectionSummaries,
    groups: groupSummaries,
  } satisfies DashboardData;
}