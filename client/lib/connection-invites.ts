import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/billing";
import { findAuthUserByEmail } from "@/lib/auth-users";
import { buildConnectionInvitePath, normalizeInviteEmail } from "@/lib/invites";
import { sendPushToUser } from "@/lib/push";
import { env } from "@/lib/env";

type IncomingInviteRow = {
  id: string;
  token: string;
  invited_email: string;
  owner_user_id: string;
  connection_id: string;
  created_at: string;
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
  return connection?.display_name ?? "Someone";
}

function getProfileName(profile?: ProfileRow) {
  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return profile?.display_name?.trim() || fullName || "Someone";
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
    .select("id, token, invited_email, owner_user_id, connection_id, created_at, connections!inner(display_name)")
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

function createAnonSupabaseClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function notifyConnectionInvite(
  supabase: SupabaseClient,
  email: string,
  token: string,
  connectionName: string,
) {
  const normalizedEmail = normalizeInviteEmail(email);
  const invitePath = buildConnectionInvitePath(token);
  const appUrl = getAppUrl();
  const redirectTo = `${appUrl}/auth/confirm?next=${encodeURIComponent(invitePath)}`;
  const anonSupabase = createAnonSupabaseClient();
  const { error } = await anonSupabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  const recipient = await findAuthUserByEmail(supabase, normalizedEmail);

  if (recipient) {
    await sendPushToUser(supabase, recipient.id, {
      title: "New connection invite",
      body: `${connectionName} is waiting for you in My Crew Connections.`,
      url: invitePath,
      tag: `connection-invite-${token}`,
    }).catch(() => ({ sent: 0 }));
  }

  return { emailSent: !error, errorMessage: error?.message };
}
