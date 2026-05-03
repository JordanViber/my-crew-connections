import { type SupabaseClient } from "@supabase/supabase-js";
import { findAuthUserByEmail } from "@/lib/auth-users";
import {
  sendGroupInviteEmail,
  type InviteEmailDeliveryStatus,
  type InviteEmailResult,
} from "@/lib/invite-email";
import { createInAppNotification } from "@/lib/in-app-notifications";
import { normalizeInviteEmail } from "@/lib/invites";
import { sendPushToUser } from "@/lib/push";

type IncomingGroupInviteRow = {
  id: string;
  token: string;
  invited_email: string;
  owner_user_id: string;
  group_id: string;
  connection_id: string;
  created_at: string;
  groups: {
    name: string;
  } | {
    name: string;
  }[] | null;
  connections: {
    display_name: string;
  } | {
    display_name: string;
  }[] | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

export type GroupInviteNotificationResult = {
  delivery: "push" | "email" | "ready";
  pushSent: boolean;
  emailSent: boolean;
  emailMessageId?: string;
  emailStatus: InviteEmailDeliveryStatus;
  errorMessage?: string;
};

export type IncomingGroupInvite = {
  id: string;
  token: string;
  invitedEmail: string;
  groupId: string;
  groupName: string;
  connectionId: string;
  connectionName: string;
  inviterName: string;
  createdAt: string;
};

function getProfileName(profile?: ProfileRow) {
  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return profile?.display_name?.trim() || fullName || "Someone";
}

function getGroupName(row: IncomingGroupInviteRow) {
  const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
  return group?.name ?? "this group";
}

function getConnectionName(row: IncomingGroupInviteRow) {
  const connection = Array.isArray(row.connections) ? row.connections[0] : row.connections;
  return connection?.display_name ?? "you";
}

async function recordGroupInviteEmailResult(
  supabase: SupabaseClient,
  token: string,
  emailResult: InviteEmailResult,
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("group_invites")
    .update({
      email_provider: emailResult.provider,
      email_message_id: emailResult.messageId ?? null,
      email_delivery_status: emailResult.status,
      email_error_message: emailResult.errorMessage ?? null,
      email_last_attempted_at: now,
      email_sent_at: emailResult.sent ? now : null,
      email_updated_at: now,
    })
    .eq("token", token);

  if (error) {
    return { recorded: false, errorMessage: error.message };
  }

  return { recorded: true };
}

export async function getIncomingGroupInvites(
  supabase: SupabaseClient,
  email?: string | null,
) {
  if (!email) {
    return [];
  }

  const normalizedEmail = normalizeInviteEmail(email);
  const { data, error } = await supabase
    .from("group_invites")
    .select("id, token, invited_email, owner_user_id, group_id, connection_id, created_at, groups!inner(name), connections!inner(display_name)")
    .eq("invited_email", normalizedEmail)
    .is("accepted_at", null)
    .is("declined_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load incoming group invites: ${error.message}`);
  }

  const rows = (data ?? []) as IncomingGroupInviteRow[];
  const ownerIds = [...new Set(rows.map((row) => row.owner_user_id))];
  let profiles = new Map<string, ProfileRow>();

  if (ownerIds.length) {
    const profileResult = await supabase
      .from("profiles")
      .select("id, display_name, first_name, last_name")
      .in("id", ownerIds);

    if (profileResult.error) {
      throw new Error(`Failed to load group invite owners: ${profileResult.error.message}`);
    }

    profiles = new Map(((profileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  }

  return rows.map((row) => ({
    id: row.id,
    token: row.token,
    invitedEmail: row.invited_email,
    groupId: row.group_id,
    groupName: getGroupName(row),
    connectionId: row.connection_id,
    connectionName: getConnectionName(row),
    inviterName: getProfileName(profiles.get(row.owner_user_id)),
    createdAt: row.created_at,
  })) satisfies IncomingGroupInvite[];
}

export async function notifyGroupInvite(
  supabase: SupabaseClient,
  email: string,
  token: string,
  groupName: string,
  connectionName: string,
  inviterName?: string | null,
) : Promise<GroupInviteNotificationResult> {
  const normalizedEmail = normalizeInviteEmail(email);
  const recipient = await findAuthUserByEmail(supabase, normalizedEmail);

  if (recipient) {
    await createInAppNotification(supabase, recipient.id, {
      category: "group-invite",
      title: "New group invite",
      body: `${inviterName?.trim() || "Someone"} invited you to join ${groupName}. Open the app to respond.`,
      href: "/dashboard",
      metadata: { token, groupName, connectionName },
    }).catch(() => undefined);

    const pushResult = await sendPushToUser(supabase, recipient.id, {
      title: "New group invite",
      body: `${inviterName?.trim() || "Someone"} invited you to join ${groupName}. Open the app to respond.`,
      url: "/dashboard",
      tag: `group-invite-${token}`,
    }).catch(() => ({ sent: 0 }));

    if (pushResult.sent > 0) {
      const emailResult = {
        provider: null,
        status: "suppressed",
        sent: false,
      } satisfies InviteEmailResult;
      const auditResult = await recordGroupInviteEmailResult(supabase, token, emailResult);

      return {
        delivery: "push",
        pushSent: true,
        emailSent: false,
        emailStatus: emailResult.status,
        errorMessage: auditResult.errorMessage,
      };
    }
  }

  const emailResult = await sendGroupInviteEmail({
    to: normalizedEmail,
    token,
    groupName,
    connectionName,
    inviterName,
  });
  const auditResult = await recordGroupInviteEmailResult(supabase, token, emailResult);

  return {
    delivery: emailResult.sent ? "email" : "ready",
    pushSent: false,
    emailSent: emailResult.sent,
    emailMessageId: emailResult.messageId,
    emailStatus: emailResult.status,
    errorMessage: emailResult.errorMessage ?? auditResult.errorMessage,
  };
}