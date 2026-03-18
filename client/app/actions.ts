"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  connectionSchema,
  getString,
  getStringList,
  groupMemberSchema,
  groupSchema,
  parseTargetReference,
  parseCommaSeparatedList,
  touchpointSchema,
  updateConnectionSchema,
  updateGroupSchema,
} from "@/lib/validations";

async function getAuthenticatedClient() {
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const supabase = createServerAdminSupabaseClient();
  return { supabase, user };
}

function assertMutation(error: { message: string } | null, label: string) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function revalidateRelationshipPaths(targetType: "connection" | "group", targetId: string) {
  revalidatePath("/dashboard");
  revalidatePath(targetType === "connection" ? "/connections" : "/groups");
  revalidatePath(`/${targetType === "connection" ? "connections" : "groups"}/${targetId}`);
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  assertMutation(error, "Failed to sign out");
  redirect("/");
}

export async function createConnectionAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = connectionSchema.parse({
    displayName: getString(formData, "displayName"),
    tags: getString(formData, "tags"),
    notes: getString(formData, "notes"),
    preferredActivities: getString(formData, "preferredActivities"),
    cadenceValue: getString(formData, "cadenceValue"),
    cadenceUnit: getString(formData, "cadenceUnit"),
    reminderLeadDays: getString(formData, "reminderLeadDays"),
  });

  const { data: connection, error: connectionError } = await supabase
    .from("connections")
    .insert({
      owner_user_id: user.id,
      display_name: payload.displayName,
      tags: parseCommaSeparatedList(payload.tags),
      notes: payload.notes || null,
      preferred_activities: payload.preferredActivities || null,
    })
    .select("id")
    .single();

  assertMutation(connectionError, "Failed to create connection");

  if (!connection) {
    throw new Error("Failed to create connection: no record returned.");
  }

  const { error: cadenceError } = await supabase.from("cadence_rules").insert({
    owner_user_id: user.id,
    target_type: "connection",
    target_id: connection.id,
    cadence_value: payload.cadenceValue,
    cadence_unit: payload.cadenceUnit,
    reminder_lead_days: payload.reminderLeadDays,
  });

  assertMutation(cadenceError, "Failed to create cadence rule");

  revalidateRelationshipPaths("connection", connection.id);
  redirect(`/connections/${connection.id}`);
}

export async function updateConnectionAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = updateConnectionSchema.parse({
    connectionId: getString(formData, "connectionId"),
    displayName: getString(formData, "displayName"),
    tags: getString(formData, "tags"),
    notes: getString(formData, "notes"),
    preferredActivities: getString(formData, "preferredActivities"),
    cadenceValue: getString(formData, "cadenceValue"),
    cadenceUnit: getString(formData, "cadenceUnit"),
    reminderLeadDays: getString(formData, "reminderLeadDays"),
  });

  const { error: updateError } = await supabase
    .from("connections")
    .update({
      display_name: payload.displayName,
      tags: parseCommaSeparatedList(payload.tags),
      notes: payload.notes || null,
      preferred_activities: payload.preferredActivities || null,
    })
    .eq("id", payload.connectionId)
    .eq("owner_user_id", user.id);

  assertMutation(updateError, "Failed to update connection");

  const { error: cadenceError } = await supabase.from("cadence_rules").upsert(
    {
      owner_user_id: user.id,
      target_type: "connection",
      target_id: payload.connectionId,
      cadence_value: payload.cadenceValue,
      cadence_unit: payload.cadenceUnit,
      reminder_lead_days: payload.reminderLeadDays,
    },
    { onConflict: "owner_user_id,target_type,target_id" },
  );

  assertMutation(cadenceError, "Failed to update cadence rule");

  revalidateRelationshipPaths("connection", payload.connectionId);
}

export async function createGroupAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = groupSchema.parse({
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    cadenceValue: getString(formData, "cadenceValue"),
    cadenceUnit: getString(formData, "cadenceUnit"),
    reminderLeadDays: getString(formData, "reminderLeadDays"),
    connectionIds: getStringList(formData, "connectionIds"),
  });

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      owner_user_id: user.id,
      name: payload.name,
      description: payload.description || null,
    })
    .select("id")
    .single();

  assertMutation(groupError, "Failed to create group");

  if (!group) {
    throw new Error("Failed to create group: no record returned.");
  }

  const { error: cadenceError } = await supabase.from("cadence_rules").insert({
    owner_user_id: user.id,
    target_type: "group",
    target_id: group.id,
    cadence_value: payload.cadenceValue,
    cadence_unit: payload.cadenceUnit,
    reminder_lead_days: payload.reminderLeadDays,
  });

  assertMutation(cadenceError, "Failed to create group cadence");

  const membershipRows = [
    { group_id: group.id, user_id: user.id, role: "owner" },
    ...payload.connectionIds.map((connectionId) => ({
      group_id: group.id,
      connection_id: connectionId,
      role: "member",
    })),
  ];

  const { error: membershipError } = await supabase.from("group_memberships").insert(membershipRows);
  assertMutation(membershipError, "Failed to create group memberships");

  revalidateRelationshipPaths("group", group.id);
  redirect(`/groups/${group.id}`);
}

export async function updateGroupAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = updateGroupSchema.parse({
    groupId: getString(formData, "groupId"),
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    cadenceValue: getString(formData, "cadenceValue"),
    cadenceUnit: getString(formData, "cadenceUnit"),
    reminderLeadDays: getString(formData, "reminderLeadDays"),
    connectionIds: [],
  });

  const { error: updateError } = await supabase
    .from("groups")
    .update({
      name: payload.name,
      description: payload.description || null,
    })
    .eq("id", payload.groupId)
    .eq("owner_user_id", user.id);

  assertMutation(updateError, "Failed to update group");

  const { error: cadenceError } = await supabase.from("cadence_rules").upsert(
    {
      owner_user_id: user.id,
      target_type: "group",
      target_id: payload.groupId,
      cadence_value: payload.cadenceValue,
      cadence_unit: payload.cadenceUnit,
      reminder_lead_days: payload.reminderLeadDays,
    },
    { onConflict: "owner_user_id,target_type,target_id" },
  );

  assertMutation(cadenceError, "Failed to update group cadence");
  revalidateRelationshipPaths("group", payload.groupId);
}

export async function addGroupMembersAction(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const payload = groupMemberSchema.parse({
    groupId: getString(formData, "groupId"),
    connectionIds: getStringList(formData, "connectionIds"),
  });

  const { error } = await supabase.from("group_memberships").upsert(
    payload.connectionIds.map((connectionId) => ({
      group_id: payload.groupId,
      connection_id: connectionId,
      role: "member",
      removed_at: null,
    })),
    { onConflict: "group_id,connection_id" },
  );

  assertMutation(error, "Failed to add group members");
  revalidateRelationshipPaths("group", payload.groupId);
}

export async function createTouchpointAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const targetReference = getString(formData, "targetRef");
  const parsedTarget = targetReference ? parseTargetReference(targetReference) : null;
  const payload = touchpointSchema.parse({
    targetType: parsedTarget?.targetType ?? getString(formData, "targetType"),
    targetId: parsedTarget?.targetId ?? getString(formData, "targetId"),
    touchpointType: getString(formData, "touchpointType"),
    occurredAt: getString(formData, "occurredAt"),
    note: getString(formData, "note"),
    activityLabel: getString(formData, "activityLabel"),
    locationLabel: getString(formData, "locationLabel"),
  });

  const { error } = await supabase.from("touchpoints").insert({
    owner_user_id: user.id,
    target_type: payload.targetType,
    target_id: payload.targetId,
    touchpoint_type: payload.touchpointType,
    occurred_at: new Date(payload.occurredAt).toISOString(),
    note: payload.note || null,
    activity_label: payload.activityLabel || null,
    location_label: payload.locationLabel || null,
  });

  assertMutation(error, "Failed to create touchpoint");
  revalidateRelationshipPaths(payload.targetType, payload.targetId);
}