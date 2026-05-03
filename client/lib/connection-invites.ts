import { type SupabaseClient } from "@supabase/supabase-js";
import { findAuthUserByEmail } from "@/lib/auth-users";
import { getInviteConnectionLabel } from "@/lib/connection-display";
import { normalizeInviteEmail } from "@/lib/invites";
import {
  sendConnectionInviteEmail,
  type InviteEmailDeliveryStatus,
  type InviteEmailResult,
} from "@/lib/invite-email";
import { createInAppNotification } from "@/lib/in-app-notifications";
import { sendPushToUser } from "@/lib/push";

type IncomingInviteRow = {
  id: string;
  token: string;
  invited_email: string;
  owner_user_id: string;
  connection_id: string;
  created_at: string;
  connections: {
    display_name: string;
    prefers_profile_name: boolean;
  } | {
    display_name: string;
    prefers_profile_name: boolean;
  }[] | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

export type InviteNotificationResult = {
  delivery: "push" | "email" | "ready";
  pushSent: boolean;
  emailSent: boolean;
  emailMessageId?: string;
  emailStatus: InviteEmailDeliveryStatus;
  errorMessage?: string;
};

export type IncomingConnectionInvite = {
  id: string;
  token: string;
  invitedEmail: string;
  connectionName: string;
  inviterName: string;
  createdAt: string;
};

function getConnectionName(row: IncomingInviteRow) {
  const connection = Array.isArray(row.connections) ? row.connections[0] : row.connections;
  return connection ? getInviteConnectionLabel(connection.display_name, connection.prefers_profile_name) : "Someone";
}

function getProfileName(profile?: ProfileRow) {
  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return profile?.display_name?.trim() || fullName || "Someone";
}

async function recordInviteEmailResult(
  supabase: SupabaseClient,
  token: string,
  emailResult: InviteEmailResult,
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("connection_invites")
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

export async function getIncomingConnectionInvites(
  supabase: SupabaseClient,
  email?: string | null,
) {
  if (!email) {
    return [];
  }

  const normalizedEmail = normalizeInviteEmail(email);
  const { data, error } = await supabase
    .from("connection_invites")
    .select("id, token, invited_email, owner_user_id, connection_id, created_at, connections!inner(display_name, prefers_profile_name)")
    .eq("invited_email", normalizedEmail)
    .is("claimed_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load incoming invites: ${error.message}`);
  }

  const rows = (data ?? []) as IncomingInviteRow[];
  const ownerIds = [...new Set(rows.map((row) => row.owner_user_id))];
  let profiles = new Map<string, ProfileRow>();

  if (ownerIds.length) {
    const profileResult = await supabase
      .from("profiles")
      .select("id, display_name, first_name, last_name")
      .in("id", ownerIds);

    if (profileResult.error) {
      throw new Error(`Failed to load invite owners: ${profileResult.error.message}`);
    }

    profiles = new Map(((profileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  }

  return rows.map((row) => ({
    id: row.id,
    token: row.token,
    invitedEmail: row.invited_email,
    connectionName: getConnectionName(row),
    inviterName: getProfileName(profiles.get(row.owner_user_id)),
    createdAt: row.created_at,
  })) satisfies IncomingConnectionInvite[];
}

export async function notifyConnectionInvite(
  supabase: SupabaseClient,
  email: string,
  token: string,
  connectionName: string,
  inviterName?: string | null,
) : Promise<InviteNotificationResult> {
  const normalizedEmail = normalizeInviteEmail(email);
  const recipient = await findAuthUserByEmail(supabase, normalizedEmail);

  if (recipient) {
    await createInAppNotification(supabase, recipient.id, {
      category: "connection-invite",
      title: "New connection invite",
      body: `${connectionName} is waiting for you in My Crew Connections. Review it in your dashboard.`,
      href: "/dashboard",
      metadata: { token },
    }).catch(() => undefined);

    const pushResult = await sendPushToUser(supabase, recipient.id, {
      title: "New connection invite",
      body: `${connectionName} is waiting for you in My Crew Connections. Open the app to review it.`,
      url: "/dashboard",
      tag: `connection-invite-${token}`,
    }).catch(() => ({ sent: 0 }));

    if (pushResult.sent > 0) {
      const emailResult = {
        provider: null,
        status: "suppressed",
        sent: false,
      } satisfies InviteEmailResult;
      const auditResult = await recordInviteEmailResult(supabase, token, emailResult);

      return {
        delivery: "push",
        pushSent: true,
        emailSent: false,
        emailStatus: emailResult.status,
        errorMessage: auditResult.errorMessage,
      };
    }
  }

  const emailResult = await sendConnectionInviteEmail({
    to: normalizedEmail,
    token,
    connectionName,
    inviterName,
  });
  const auditResult = await recordInviteEmailResult(supabase, token, emailResult);

  return {
    delivery: emailResult.sent ? "email" : "ready",
    pushSent: false,
    emailSent: emailResult.sent,
    emailMessageId: emailResult.messageId,
    emailStatus: emailResult.status,
    errorMessage: emailResult.errorMessage ?? auditResult.errorMessage,
  };
}
