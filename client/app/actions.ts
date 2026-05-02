"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAppUrl, getPaymentLinkForInterval, getPriceIdForInterval, type BillingInterval } from "@/lib/billing";
import { getStripeClient } from "@/lib/stripe";
import {
  accountEmailSchema,
  accountPasswordSchema,
  accountProfileSchema,
  appFeedbackSchema,
  billingIntervalSchema,
  connectionSchema,
  getString,
  getStringList,
  groupMemberSchema,
  groupSchema,
  hangoutIdSchema,
  hangoutResponseSchema,
  hangoutSchema,
  inviteEmailSchema,
  parseTargetReference,
  parseCommaSeparatedList,
  touchpointSchema,
  touchpointUpdateSchema,
  updateConnectionSchema,
  updateGroupSchema,
} from "@/lib/validations";
import { getDefaultCountry, normalizePhoneNumberForStorage } from "@/lib/account-fields";
import { findAuthUserByEmail, getAuthUserById } from "@/lib/auth-users";
import { formatHangoutWindow } from "@/lib/hangouts";
import { notifyHangoutProposalParticipant } from "@/lib/hangout-notifications";
import {
  getFallbackDisplayNameFromEmail,
  getInviteConnectionLabel,
  shouldUseProfileName,
} from "@/lib/connection-display";
import { notifyConnectionInvite } from "@/lib/connection-invites";
import { notifyGroupInvite } from "@/lib/group-invites";
import { buildConnectionInvitePath, buildGroupInvitePath, normalizeInviteEmail } from "@/lib/invites";
import { canCreateConnection, canCreateGroup } from "@/lib/entitlements";
import { sendPushToUser } from "@/lib/push";

type GroupHangoutMembershipRow = {
  connection_id: string | null;
  user_id: string | null;
  role: string;
};

type GroupHangoutConnectionRow = {
  id: string;
  linked_user_id: string | null;
};

type AcceptedGroupInviteRecipientRow = {
  connection_id: string;
  accepted_by_user_id: string | null;
  accepted_at: string;
};

type GroupHangoutParticipantCandidate = {
  connectionId: string | null;
  participantUserId: string;
};

type ConnectionHangoutTargetRow = {
  id: string;
  display_name: string;
  linked_user_id: string | null;
};

type GroupHangoutTargetRow = {
  id: string;
  name: string;
};

type ConnectionEmailConflict = {
  kind: "saved" | "linked" | "pending";
  connectionId: string;
};

type HangoutProposalResponseStatus = "pending" | "accepted" | "declined";

async function getAuthenticatedSession() {
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return { authSupabase, user };
}

async function getAuthenticatedClient() {
  const { user } = await getAuthenticatedSession();

  const supabase = createServerAdminSupabaseClient();
  return { supabase, user };
}

function assertMutation(error: { message: string } | null, label: string) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function buildDisplayName(firstName: string, lastName: string, email?: string | null) {
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return getFallbackDisplayNameFromEmail(email);
}

function getCurrentUserLabel(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const displayName = typeof user.user_metadata?.display_name === "string"
    ? user.user_metadata.display_name.trim()
    : "";

  if (displayName) {
    return displayName;
  }

  const firstName = typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : "";
  const lastName = typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name : "";

  return buildDisplayName(firstName, lastName, user.email ?? null);
}

async function resolveAutomaticConnectionDisplayName(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  linkedUserId?: string | null,
  contactEmail?: string | null,
) {
  if (!linkedUserId) {
    return getFallbackDisplayNameFromEmail(contactEmail);
  }

  const { data: linkedProfile, error: linkedProfileError } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name")
    .eq("id", linkedUserId)
    .maybeSingle();

  assertMutation(linkedProfileError, "Failed to load linked user profile");

  const linkedProfileName = buildDisplayName(
    linkedProfile?.first_name ?? "",
    linkedProfile?.last_name ?? "",
    linkedProfile?.display_name ?? contactEmail,
  );

  if (linkedProfile?.display_name?.trim() || linkedProfileName) {
    return linkedProfile?.display_name?.trim() || linkedProfileName;
  }

  const linkedUser = await getAuthUserById(supabase, linkedUserId);
  return getFallbackDisplayNameFromEmail(linkedUser?.email ?? contactEmail);
}

async function findConnectionEmailConflict(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  ownerUserId: string,
  email: string,
  excludeConnectionId?: string,
) {
  const normalizedEmail = normalizeInviteEmail(email);

  const { data: existingConnection, error: existingConnectionError } = await supabase
    .from("connections")
    .select("id, linked_user_id")
    .eq("owner_user_id", ownerUserId)
    .eq("contact_email", normalizedEmail)
    .is("archived_at", null)
    .maybeSingle();

  assertMutation(existingConnectionError, "Failed to check saved contact emails");

  if (existingConnection && existingConnection.id !== excludeConnectionId) {
    if (existingConnection.linked_user_id) {
      return {
        kind: "linked",
        connectionId: existingConnection.id,
      } satisfies ConnectionEmailConflict;
    }

    const { data: existingInvite, error: existingInviteError } = await supabase
      .from("connection_invites")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .eq("connection_id", existingConnection.id)
      .eq("invited_email", normalizedEmail)
      .is("claimed_at", null)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle();

    assertMutation(existingInviteError, "Failed to check existing invite for saved contact email");

    return {
      kind: existingInvite ? "pending" : "saved",
      connectionId: existingConnection.id,
    } satisfies ConnectionEmailConflict;
  }

  const recipient = await findAuthUserByEmail(supabase, normalizedEmail);

  if (recipient) {
    const { data: linkedConnection, error: linkedConnectionError } = await supabase
      .from("connections")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .eq("linked_user_id", recipient.id)
      .is("archived_at", null)
      .maybeSingle();

    assertMutation(linkedConnectionError, "Failed to check existing linked connection");

    if (linkedConnection && linkedConnection.id !== excludeConnectionId) {
      return {
        kind: "linked",
        connectionId: linkedConnection.id,
      } satisfies ConnectionEmailConflict;
    }
  }

  const { data: pendingInvites, error: pendingInviteError } = await supabase
    .from("connection_invites")
    .select("connection_id")
    .eq("owner_user_id", ownerUserId)
    .eq("invited_email", normalizedEmail)
    .is("claimed_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  assertMutation(pendingInviteError, "Failed to check existing pending invites");

  const existingInvite = (pendingInvites ?? []).find((invite) => invite.connection_id !== excludeConnectionId);

  if (existingInvite) {
    return {
      kind: "pending",
      connectionId: existingInvite.connection_id,
    } satisfies ConnectionEmailConflict;
  }

  return null;
}

function getConnectionEmailConflictFeedbackKey(conflict: ConnectionEmailConflict) {
  if (conflict.kind === "linked") {
    return "connection-email-already-linked";
  }

  if (conflict.kind === "pending") {
    return "connection-email-invite-pending";
  }

  return "connection-email-already-saved";
}

async function assertCanCreateReciprocalConnectionForInvite(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  userId: string,
  email: string | null | undefined,
  fallbackPath: string,
) {
  const [profile, count] = await Promise.all([
    getBillingStatusProfile(supabase, userId),
    getActiveRelationshipCount(supabase, "connections", userId),
  ]);

  if (!canCreateConnection(profile, count, email)) {
    redirect(
      `${fallbackPath}?error=${encodeURIComponent(
        "You've already used your free person slot. Upgrade or archive an existing person before accepting another invite.",
      )}`,
    );
  }
}

type GroupInviteConnectionRow = {
  id: string;
  display_name: string;
  contact_email: string | null;
  linked_user_id: string | null;
};

type GroupMembershipUpdateSummary = {
  acceptedCount: number;
  invitedCount: number;
};

async function resolveConnectionContactEmail(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  ownerUserId: string,
  connection: GroupInviteConnectionRow,
) {
  if (connection.linked_user_id) {
    const linkedUserResult = await supabase.auth.admin.getUserById(connection.linked_user_id);

    if (linkedUserResult.error) {
      throw new Error(`Failed to load linked user email: ${linkedUserResult.error.message}`);
    }

    const linkedUserEmail = linkedUserResult.data.user?.email
      ? normalizeInviteEmail(linkedUserResult.data.user.email)
      : null;

    if (linkedUserEmail) {
      if (connection.contact_email !== linkedUserEmail) {
        const { error: saveEmailError } = await supabase
          .from("connections")
          .update({ contact_email: linkedUserEmail })
          .eq("id", connection.id)
          .eq("owner_user_id", ownerUserId);

        assertMutation(saveEmailError, "Failed to save linked user email on connection");
      }

      return linkedUserEmail;
    }
  }

  if (!connection.contact_email) {
    const { data: pendingInvite, error: pendingInviteError } = await supabase
      .from("connection_invites")
      .select("invited_email")
      .eq("owner_user_id", ownerUserId)
      .eq("connection_id", connection.id)
      .is("claimed_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    assertMutation(pendingInviteError, "Failed to load pending connection invite email");

    if (pendingInvite?.invited_email) {
      const normalizedInviteEmail = normalizeInviteEmail(pendingInvite.invited_email);
      const { error: savePendingInviteEmailError } = await supabase
        .from("connections")
        .update({ contact_email: normalizedInviteEmail })
        .eq("id", connection.id)
        .eq("owner_user_id", ownerUserId);

      assertMutation(savePendingInviteEmailError, "Failed to save pending invite email on connection");
      return normalizedInviteEmail;
    }
  }

  return connection.contact_email ? normalizeInviteEmail(connection.contact_email) : null;
}

function getGroupMembershipFeedbackKey(summary: GroupMembershipUpdateSummary, mode: "create" | "add") {
  if (summary.invitedCount > 0 && summary.acceptedCount > 0) {
    return mode === "create" ? "group-created-with-members-and-invites" : "members-added-and-invited";
  }

  if (summary.invitedCount > 0) {
    return mode === "create" ? "group-created-with-invites" : "group-invites-created";
  }

  return mode === "create" ? "group-created" : "members-added";
}

const MIN_GROUP_SIZE = 3;

async function addConnectionsToGroup(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  ownerUserId: string,
  ownerDisplayName: string | null | undefined,
  groupId: string,
  groupName: string,
  connectionIds: string[],
) {
  const uniqueConnectionIds = [...new Set(connectionIds)];

  if (uniqueConnectionIds.length === 0) {
    return {
      acceptedCount: 0,
      invitedCount: 0,
    } satisfies GroupMembershipUpdateSummary;
  }

  const [{ data: existingMemberships, error: existingMembershipsError }, { data: connections, error: connectionsError }] = await Promise.all([
    supabase
      .from("group_memberships")
      .select("connection_id")
      .eq("group_id", groupId)
      .is("removed_at", null)
      .in("connection_id", uniqueConnectionIds),
    supabase
      .from("connections")
      .select("id, display_name, contact_email, linked_user_id")
      .eq("owner_user_id", ownerUserId)
      .is("archived_at", null)
      .in("id", uniqueConnectionIds),
  ]);

  assertMutation(existingMembershipsError, "Failed to load existing group memberships");
  assertMutation(connectionsError, "Failed to load selected connections for group");

  const acceptedConnectionIds = new Set((existingMemberships ?? []).flatMap((membership) => membership.connection_id ?? []));
  const availableConnections = ((connections ?? []) as GroupInviteConnectionRow[]).filter(
    (connection) => !acceptedConnectionIds.has(connection.id),
  );
  const availableConnectionIds = new Set(availableConnections.map((connection) => connection.id));

  for (const connectionId of uniqueConnectionIds) {
    if (!acceptedConnectionIds.has(connectionId) && !availableConnectionIds.has(connectionId)) {
      throw new Error("Failed to add group members: one or more selected people could not be loaded.");
    }
  }

  const membershipRows: Array<{ group_id: string; connection_id: string; role: string; removed_at: null }> = [];
  let invitedCount = 0;

  for (const connection of availableConnections) {
    if (connection.linked_user_id) {
      const linkedUser = await getAuthUserById(supabase, connection.linked_user_id);
      const linkedInviteEmail = linkedUser?.email ? normalizeInviteEmail(linkedUser.email) : null;
      const inviteEmail = linkedInviteEmail ?? (connection.contact_email ? normalizeInviteEmail(connection.contact_email) : null);

      if (!inviteEmail) {
        throw new Error("Failed to create group invite: linked account is missing an invite email.");
      }

      if (connection.contact_email !== inviteEmail) {
        const { error: saveEmailError } = await supabase
          .from("connections")
          .update({ contact_email: inviteEmail })
          .eq("id", connection.id)
          .eq("owner_user_id", ownerUserId);

        assertMutation(saveEmailError, "Failed to save linked user email on connection");
      }

      const { error: revokeInviteError } = await supabase
        .from("group_invites")
        .update({ revoked_at: new Date().toISOString() })
        .eq("owner_user_id", ownerUserId)
        .eq("group_id", groupId)
        .eq("connection_id", connection.id)
        .is("accepted_at", null)
        .is("declined_at", null)
        .is("revoked_at", null);

      assertMutation(revokeInviteError, "Failed to replace existing group invite");

      const token = crypto.randomUUID();
      const { error: inviteError } = await supabase.from("group_invites").insert({
        owner_user_id: ownerUserId,
        group_id: groupId,
        connection_id: connection.id,
        invited_email: inviteEmail,
        token,
      });

      assertMutation(inviteError, "Failed to create group invite");
      await notifyGroupInvite(
        supabase,
        inviteEmail,
        token,
        groupName,
        connection.display_name,
        ownerDisplayName,
      );
      invitedCount += 1;
      continue;
    }

    const inviteEmail = await resolveConnectionContactEmail(supabase, ownerUserId, connection);

    if (!inviteEmail) {
      membershipRows.push({
        group_id: groupId,
        connection_id: connection.id,
        role: "member",
        removed_at: null,
      });
      continue;
    }

    const { error: revokeInviteError } = await supabase
      .from("group_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("owner_user_id", ownerUserId)
      .eq("group_id", groupId)
      .eq("connection_id", connection.id)
      .is("accepted_at", null)
      .is("declined_at", null)
      .is("revoked_at", null);

    assertMutation(revokeInviteError, "Failed to replace existing group invite");

    const token = crypto.randomUUID();
    const { error: inviteError } = await supabase.from("group_invites").insert({
      owner_user_id: ownerUserId,
      group_id: groupId,
      connection_id: connection.id,
      invited_email: inviteEmail,
      token,
    });

    assertMutation(inviteError, "Failed to create group invite");
    await notifyGroupInvite(
      supabase,
      inviteEmail,
      token,
      groupName,
      connection.display_name,
      ownerDisplayName,
    );
    invitedCount += 1;
  }

  if (membershipRows.length > 0) {
    const { error: membershipError } = await supabase.from("group_memberships").upsert(membershipRows, {
      onConflict: "group_id,connection_id",
    });

    assertMutation(membershipError, "Failed to add direct group members");
  }

  return {
    acceptedCount: membershipRows.length,
    invitedCount,
  } satisfies GroupMembershipUpdateSummary;
}

function revalidateAccountPaths() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

function revalidateRelationshipPaths(targetType: "connection" | "group", targetId: string) {
  revalidatePath("/dashboard");
  revalidatePath(targetType === "connection" ? "/connections" : "/groups");
  revalidatePath(`/${targetType === "connection" ? "connections" : "groups"}/${targetId}`);
}

function revalidateHangoutPaths(targetType: "connection" | "group", targetId: string) {
  revalidateRelationshipPaths(targetType, targetId);
}

function withFeedback(path: string, feedback: string) {
  const [basePath, hash] = path.split("#", 2);
  const separator = basePath.includes("?") ? "&" : "?";
  const hashSuffix = hash ? `#${hash}` : "";
  return `${basePath}${separator}feedback=${feedback}${hashSuffix}`;
}

function withSearchParam(path: string, key: string, value: string) {
  const url = new URL(path, "https://mycrewconnections.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function getHangoutPath(targetType: "connection" | "group", targetId: string) {
  return targetType === "connection" ? `/connections/${targetId}` : `/groups/${targetId}`;
}

function getHangoutCreateFeedbackKey(targetType: "connection" | "group", shouldShareWithLinkedUser: boolean) {
  if (targetType === "group") {
    return "hangout-proposal-created";
  }

  if (shouldShareWithLinkedUser) {
    return "hangout-share-pending";
  }

  return "hangout-saved";
}

function getHangoutResponseFeedbackKey(
  targetType: "connection" | "group",
  responseStatus: HangoutProposalResponseStatus,
) {
  if (targetType === "group") {
    return responseStatus === "accepted" ? "hangout-response-accepted" : "hangout-response-declined";
  }

  return responseStatus === "accepted" ? "hangout-share-accepted" : "hangout-share-declined";
}

async function createSharedConnectionHangoutParticipant(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  ownerUserId: string,
  hangoutId: string,
  sourceConnection: ConnectionHangoutTargetRow,
) {
  if (!sourceConnection.linked_user_id) {
    throw new Error("Failed to share hangout plan: linked account not found.");
  }

  const { data: reciprocalConnection, error: reciprocalConnectionError } = await supabase
    .from("connections")
    .select("id")
    .eq("owner_user_id", sourceConnection.linked_user_id)
    .eq("linked_user_id", ownerUserId)
    .is("archived_at", null)
    .maybeSingle();

  assertMutation(reciprocalConnectionError, "Failed to load linked connection for shared hangout");

  if (!reciprocalConnection) {
    throw new Error("Failed to share hangout plan: linked account connection is not ready.");
  }

  const { error: participantError } = await supabase.from("hangout_participants").insert({
    hangout_id: hangoutId,
    connection_id: sourceConnection.id,
    participant_user_id: sourceConnection.linked_user_id,
    participant_connection_id: reciprocalConnection.id,
  });

  assertMutation(participantError, "Failed to create shared hangout participant");

  return {
    participantUserId: sourceConnection.linked_user_id,
    participantConnectionId: reciprocalConnection.id,
  };
}

async function notifySharedConnectionHangoutParticipant(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  participantUserId: string,
  participantConnectionId: string,
  title: string,
  ownerUser: { email?: string | null; user_metadata?: Record<string, unknown> },
  hangoutId: string,
) {
  await sendPushToUser(supabase, participantUserId, {
    title: "New shared plan",
    body: `${getCurrentUserLabel(ownerUser)} shared a plan with you: ${title}.`,
    url: `/connections/${participantConnectionId}`,
    tag: `shared-hangout-request-${hangoutId}`,
  }).catch(() => ({ sent: 0 }));
}

function isOpenHangoutProposal(
  hangout?: {
    status: string;
    proposal_state: string;
    target_type: string;
  } | null,
) {
  if (hangout?.status !== "planned" || hangout?.proposal_state !== "pending") {
    return false;
  }

  return hangout.target_type === "group" || hangout.target_type === "connection";
}

async function finalizeConnectionHangoutResponse(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  hangoutId: string,
  responseStatus: HangoutProposalResponseStatus,
) {
  const proposalState = responseStatus === "accepted" ? "confirmed" : "declined";

  const { error: proposalUpdateError } = await supabase
    .from("hangouts")
    .update({
      proposal_state: proposalState,
      proposal_confirmed_at: responseStatus === "accepted" ? new Date().toISOString() : null,
    })
    .eq("id", hangoutId);

  assertMutation(proposalUpdateError, "Failed to finalize shared hangout response");
}

async function notifyHangoutOwnerResponse(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  args: {
    ownerUserId: string;
    responderUserId: string;
    targetType: "connection" | "group";
    targetId: string;
    responseStatus: HangoutProposalResponseStatus;
    responder: { email?: string | null; user_metadata?: Record<string, unknown> };
    hangoutTitle: string;
    hangoutId: string;
  },
) {
  if (args.ownerUserId === args.responderUserId || (args.responseStatus !== "accepted" && args.targetType === "group")) {
    return;
  }

  if (args.targetType === "group") {
    await sendPushToUser(supabase, args.ownerUserId, {
      title: "Hangout proposal accepted",
      body: `${getCurrentUserLabel(args.responder)} accepted your ${args.hangoutTitle} proposal.`,
      url: `/groups/${args.targetId}`,
      tag: `hangout-proposal-accepted-${args.hangoutId}`,
    }).catch(() => ({ sent: 0 }));
    return;
  }

  await sendPushToUser(supabase, args.ownerUserId, {
    title: args.responseStatus === "accepted" ? "Shared plan joined" : "Shared plan passed",
    body: args.responseStatus === "accepted"
      ? `${getCurrentUserLabel(args.responder)} joined your shared plan: ${args.hangoutTitle}.`
      : `${getCurrentUserLabel(args.responder)} passed for now on your shared plan: ${args.hangoutTitle}.`,
    url: `/connections/${args.targetId}`,
    tag: `shared-hangout-response-${args.hangoutId}`,
  }).catch(() => ({ sent: 0 }));
}

async function assertCanManageHangoutTarget(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  userId: string,
  targetType: "connection" | "group",
  targetId: string,
): Promise<ConnectionHangoutTargetRow | GroupHangoutTargetRow> {
  if (targetType === "connection") {
    const { data, error } = await supabase
      .from("connections")
      .select("id, display_name, linked_user_id")
      .eq("id", targetId)
      .eq("owner_user_id", userId)
      .is("archived_at", null)
      .maybeSingle();

    assertMutation(error, "Failed to load connection for hangout");

    if (!data) {
      throw new Error("Failed to save hangout plan: connection not found.");
    }

    return data as ConnectionHangoutTargetRow;
  }

  const { data, error } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", targetId)
    .eq("owner_user_id", userId)
    .is("archived_at", null)
    .maybeSingle();

  assertMutation(error, "Failed to load group for hangout");

  if (!data) {
    throw new Error("Failed to save hangout plan: group not found.");
  }

  return data as GroupHangoutTargetRow;
}

async function getGroupHangoutParticipants(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  groupId: string,
  ownerUserId: string,
) {
  const { data: memberships, error: membershipsError } = await supabase
    .from("group_memberships")
    .select("connection_id, user_id, role")
    .eq("group_id", groupId)
    .is("removed_at", null);

  assertMutation(membershipsError, "Failed to load group memberships for hangout");

  const membershipRows = (memberships ?? []) as GroupHangoutMembershipRow[];
  const connectionIds = membershipRows.flatMap((membership) => membership.connection_id ? [membership.connection_id] : []);

  let connectionRows: GroupHangoutConnectionRow[] = [];
  let acceptedInviteRows: AcceptedGroupInviteRecipientRow[] = [];

  if (connectionIds.length > 0) {
    const [{ data: connections, error: connectionsError }, { data: acceptedInvites, error: acceptedInvitesError }] = await Promise.all([
      supabase
        .from("connections")
        .select("id, linked_user_id")
        .in("id", connectionIds),
      supabase
        .from("group_invites")
        .select("connection_id, accepted_by_user_id, accepted_at")
        .eq("group_id", groupId)
        .in("connection_id", connectionIds)
        .not("accepted_at", "is", null)
        .is("revoked_at", null)
        .order("accepted_at", { ascending: false }),
    ]);

    assertMutation(connectionsError, "Failed to load connection links for hangout");
    assertMutation(acceptedInvitesError, "Failed to load accepted group invites for hangout");

    connectionRows = (connections ?? []) as GroupHangoutConnectionRow[];
    acceptedInviteRows = (acceptedInvites ?? []) as AcceptedGroupInviteRecipientRow[];
  }

  const connectionMap = new Map(connectionRows.map((connection) => [connection.id, connection]));
  const acceptedInviteMap = acceptedInviteRows.reduce<Map<string, string>>((accumulator, invite) => {
    if (!invite.accepted_by_user_id || accumulator.has(invite.connection_id)) {
      return accumulator;
    }

    accumulator.set(invite.connection_id, invite.accepted_by_user_id);
    return accumulator;
  }, new Map());
  const participants = new Map<string, GroupHangoutParticipantCandidate>();

  for (const membership of membershipRows) {
    if (membership.role === "owner") {
      continue;
    }

    const participantUserId = membership.user_id
      ?? (membership.connection_id ? connectionMap.get(membership.connection_id)?.linked_user_id ?? acceptedInviteMap.get(membership.connection_id) : undefined);

    if (!participantUserId || participantUserId === ownerUserId || participants.has(participantUserId)) {
      continue;
    }

    participants.set(participantUserId, {
      connectionId: membership.connection_id,
      participantUserId,
    });
  }

  return [...participants.values()];
}

async function getBillingStatusProfile(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("stripe_subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

async function getActiveRelationshipCount(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  table: "connections" | "groups",
  userId: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", userId)
    .is("archived_at", null);

  assertMutation(error, `Failed to count ${table}`);
  return count ?? 0;
}

async function assertCanCreateRelationship(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  userId: string,
  email: string | null | undefined,
  kind: "connection" | "group",
) {
  const [profile, count] = await Promise.all([
    getBillingStatusProfile(supabase, userId),
    getActiveRelationshipCount(supabase, kind === "connection" ? "connections" : "groups", userId),
  ]);
  const allowed = kind === "connection"
    ? canCreateConnection(profile, count, email)
    : canCreateGroup(profile, count, email);

  if (!allowed) {
    redirect(withFeedback("/settings#billing", kind === "connection" ? "connection-limit-reached" : "group-limit-reached"));
  }
}

async function resolveRedirectTarget(formData: FormData, fallbackPath: string, feedback: string) {
  const redirectTo = getString(formData, "redirectTo");

  if (redirectTo) {
    return withFeedback(redirectTo, feedback);
  }

  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer");

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return withFeedback(`${refererUrl.pathname}${refererUrl.search}`, feedback);
    } catch {
      return withFeedback(fallbackPath, feedback);
    }
  }

  return withFeedback(fallbackPath, feedback);
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  assertMutation(error, "Failed to sign out");
  redirect("/");
}

export async function signOutToPathAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const redirectTo = getString(formData, "redirectTo") || "/";
  const { error } = await supabase.auth.signOut();

  assertMutation(error, "Failed to sign out");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function updateProfileAction(formData: FormData) {
  const { authSupabase, user } = await getAuthenticatedSession();
  const supabase = createServerAdminSupabaseClient();
  const payload = accountProfileSchema.parse({
    firstName: getString(formData, "firstName"),
    lastName: getString(formData, "lastName"),
    phoneNumber: normalizePhoneNumberForStorage(getString(formData, "phoneNumber")),
    addressLine1: getString(formData, "addressLine1"),
    addressLine2: getString(formData, "addressLine2"),
    city: getString(formData, "city"),
    region: getString(formData, "region"),
    postalCode: getString(formData, "postalCode"),
    country: getDefaultCountry(getString(formData, "country")),
  });
  const displayName = buildDisplayName(payload.firstName, payload.lastName, user.email);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      first_name: payload.firstName,
      last_name: payload.lastName,
      phone_number: payload.phoneNumber || null,
      billing_address_line1: payload.addressLine1 || null,
      billing_address_line2: payload.addressLine2 || null,
      billing_city: payload.city || null,
      billing_region: payload.region || null,
      billing_postal_code: payload.postalCode || null,
      billing_country: payload.country || null,
    },
    { onConflict: "id" },
  );

  assertMutation(profileError, "Failed to update profile");

  const { error: metadataError } = await authSupabase.auth.updateUser({
    data: {
      display_name: displayName,
      first_name: payload.firstName,
      last_name: payload.lastName,
      phone_number: payload.phoneNumber || null,
      billing_address_line1: payload.addressLine1 || null,
      billing_address_line2: payload.addressLine2 || null,
      billing_city: payload.city || null,
      billing_region: payload.region || null,
      billing_postal_code: payload.postalCode || null,
      billing_country: payload.country || null,
    },
  });

  assertMutation(metadataError, "Failed to update account metadata");
  revalidateAccountPaths();
  redirect(withFeedback("/settings", "profile-saved"));
}

export async function updateAccountEmailAction(formData: FormData) {
  const { authSupabase, user } = await getAuthenticatedSession();
  const payload = accountEmailSchema.parse({
    email: getString(formData, "email"),
  });

  if ((user.email ?? "").toLowerCase() === payload.email.toLowerCase()) {
    redirect("/settings");
  }

  const { error } = await authSupabase.auth.updateUser({ email: payload.email });
  assertMutation(error, "Failed to update account email");
  revalidateAccountPaths();
  redirect(withFeedback("/settings", "email-update-sent"));
}

export async function updateAccountPasswordAction(formData: FormData) {
  const { authSupabase } = await getAuthenticatedSession();
  const payload = accountPasswordSchema.parse({
    password: getString(formData, "password"),
    confirmPassword: getString(formData, "confirmPassword"),
  });

  const { error } = await authSupabase.auth.updateUser({ password: payload.password });
  assertMutation(error, "Failed to update password");
  revalidateAccountPaths();
  redirect(withFeedback("/settings", "password-updated"));
}

export async function submitFeedbackAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const requestHeaders = await headers();
  const payload = appFeedbackSchema.parse({
    category: getString(formData, "category"),
    message: getString(formData, "message"),
    pagePath: getString(formData, "redirectTo"),
  });

  const { error } = await supabase.from("app_feedback").insert({
    user_id: user.id,
    category: payload.category,
    message: payload.message,
    page_path: payload.pagePath || null,
    user_email: user.email ?? null,
    user_agent: requestHeaders.get("user-agent"),
  });

  if (error) {
    redirect(withFeedback(payload.pagePath || "/dashboard", "feedback-unavailable"));
  }

  redirect(withFeedback(payload.pagePath || "/dashboard", "feedback-sent"));
}

async function getOrCreateStripeCustomer(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  user: Awaited<ReturnType<typeof getAuthenticatedSession>>["user"],
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  assertMutation(error, "Failed to load billing profile");

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const stripe = getStripeClient();

  if (!stripe) {
    return null;
  }

  const name = profile?.display_name
    || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
    || user.email
    || undefined;
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name,
    metadata: {
      supabase_user_id: user.id,
    },
  });

  const { error: updateError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      stripe_customer_id: customer.id,
    },
    { onConflict: "id" },
  );

  assertMutation(updateError, "Failed to save billing customer");
  return customer.id;
}

export async function createBillingCheckoutAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const interval = billingIntervalSchema.parse(getString(formData, "interval")) as BillingInterval;
  const priceId = getPriceIdForInterval(interval);
  const stripe = getStripeClient();

  if (!priceId) {
    redirect(withFeedback("/settings#billing", "billing-unavailable"));
  }

  if (!stripe) {
    const paymentLink = getPaymentLinkForInterval(interval, user.email, user.id);

    if (paymentLink) {
      redirect(paymentLink);
    }

    redirect(withFeedback("/settings#billing", "billing-unavailable"));
  }

  const customerId = await getOrCreateStripeCustomer(supabase, user);

  if (!customerId) {
    redirect(withFeedback("/settings#billing", "billing-unavailable"));
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/settings?feedback=billing-started&session_id={CHECKOUT_SESSION_ID}#billing`,
    cancel_url: `${appUrl}/settings?feedback=billing-canceled#billing`,
    metadata: {
      supabase_user_id: user.id,
      billing_interval: interval,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        billing_interval: interval,
      },
    },
  });

  if (!session.url) {
    redirect(withFeedback("/settings#billing", "billing-unavailable"));
  }

  redirect(session.url);
}

export async function createBillingPortalAction() {
  const { supabase, user } = await getAuthenticatedClient();
  const stripe = getStripeClient();

  if (!stripe) {
    redirect(withFeedback("/settings#billing", "billing-portal-unavailable"));
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  assertMutation(error, "Failed to load billing profile");

  if (!profile?.stripe_customer_id) {
    redirect(withFeedback("/settings#billing", "billing-portal-unavailable"));
  }

  let portalUrl: string;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getAppUrl()}/settings#billing`,
    });
    portalUrl = portalSession.url;
  } catch {
    redirect(withFeedback("/settings#billing", "billing-portal-unavailable"));
  }

  redirect(portalUrl);
}

export async function createConnectionAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  await assertCanCreateRelationship(supabase, user.id, user.email, "connection");
  const shouldSendInvite = getString(formData, "sendInviteNow") === "true";

  const payload = connectionSchema.parse({
    displayName: getString(formData, "displayName"),
    contactEmail: getString(formData, "contactEmail") || getString(formData, "inviteEmail"),
    tags: getString(formData, "tags"),
    notes: getString(formData, "notes"),
    preferredActivities: getString(formData, "preferredActivities"),
    cadenceValue: getString(formData, "cadenceValue"),
    cadenceUnit: getString(formData, "cadenceUnit"),
    reminderLeadDays: getString(formData, "reminderLeadDays"),
  });
  const normalizedContactEmail = payload.contactEmail ? normalizeInviteEmail(payload.contactEmail) : null;
  const prefersProfileName = shouldUseProfileName(payload.displayName, normalizedContactEmail);
  const storedDisplayName = prefersProfileName
    ? getFallbackDisplayNameFromEmail(normalizedContactEmail)
    : payload.displayName;

  if (normalizedContactEmail) {
    const conflict = await findConnectionEmailConflict(supabase, user.id, normalizedContactEmail);

    if (conflict) {
      redirect(withFeedback(`/connections/${conflict.connectionId}`, getConnectionEmailConflictFeedbackKey(conflict)));
    }
  }

  const { data: connection, error: connectionError } = await supabase
    .from("connections")
    .insert({
      owner_user_id: user.id,
      display_name: storedDisplayName,
      prefers_profile_name: prefersProfileName,
      contact_email: normalizedContactEmail,
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

  let feedbackKey = "connection-created";

  if (shouldSendInvite && normalizedContactEmail) {
    const token = crypto.randomUUID();

    const { error: inviteError } = await supabase.from("connection_invites").insert({
      owner_user_id: user.id,
      connection_id: connection.id,
      invited_email: normalizedContactEmail,
      token,
    });

    assertMutation(inviteError, "Failed to create connection invite");
    const notification = await notifyConnectionInvite(
      supabase,
      normalizedContactEmail,
      token,
      getInviteConnectionLabel(storedDisplayName, prefersProfileName),
      user.user_metadata?.display_name ?? user.email,
    );
    if (notification.delivery === "push") {
      feedbackKey = "connection-created-invite-pushed";
    } else if (notification.emailSent) {
      feedbackKey = "connection-created-invite-sent";
    } else {
      feedbackKey = "connection-created-invite-ready";
    }
  }

  revalidateRelationshipPaths("connection", connection.id);
  redirect(withFeedback(`/connections/${connection.id}`, feedbackKey));
}

export async function updateConnectionAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = updateConnectionSchema.parse({
    connectionId: getString(formData, "connectionId"),
    displayName: getString(formData, "displayName"),
    contactEmail: getString(formData, "contactEmail"),
    tags: getString(formData, "tags"),
    notes: getString(formData, "notes"),
    preferredActivities: getString(formData, "preferredActivities"),
    cadenceValue: getString(formData, "cadenceValue"),
    cadenceUnit: getString(formData, "cadenceUnit"),
    reminderLeadDays: getString(formData, "reminderLeadDays"),
  });
  const normalizedContactEmail = payload.contactEmail ? normalizeInviteEmail(payload.contactEmail) : null;

  if (normalizedContactEmail) {
    const conflict = await findConnectionEmailConflict(supabase, user.id, normalizedContactEmail, payload.connectionId);

    if (conflict) {
      redirect(withFeedback(`/connections/${conflict.connectionId}`, getConnectionEmailConflictFeedbackKey(conflict)));
    }
  }

  const { data: currentConnection, error: currentConnectionError } = await supabase
    .from("connections")
    .select("linked_user_id")
    .eq("id", payload.connectionId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  assertMutation(currentConnectionError, "Failed to load connection");

  if (!currentConnection) {
    throw new Error("Failed to update connection: connection not found.");
  }

  const prefersProfileName = shouldUseProfileName(payload.displayName, normalizedContactEmail);
  const storedDisplayName = prefersProfileName
    ? await resolveAutomaticConnectionDisplayName(supabase, currentConnection.linked_user_id, normalizedContactEmail)
    : payload.displayName;

  const { error: updateError } = await supabase
    .from("connections")
    .update({
      display_name: storedDisplayName,
      prefers_profile_name: prefersProfileName,
      contact_email: normalizedContactEmail,
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
  redirect(withFeedback(`/connections/${payload.connectionId}`, "connection-saved"));
}

export async function createGroupAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  await assertCanCreateRelationship(supabase, user.id, user.email, "group");

  const payload = groupSchema.parse({
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    cadenceValue: getString(formData, "cadenceValue"),
    cadenceUnit: getString(formData, "cadenceUnit"),
    reminderLeadDays: getString(formData, "reminderLeadDays"),
    connectionIds: getStringList(formData, "connectionIds"),
    quickConnectionName: getString(formData, "quickConnectionName"),
    quickConnectionEmail: getString(formData, "quickConnectionEmail"),
  });

  const selectedConnectionIds = new Set(payload.connectionIds);
  const normalizedQuickConnectionEmail = payload.quickConnectionEmail
    ? normalizeInviteEmail(payload.quickConnectionEmail)
    : null;
  const hasQuickConnectionInput = Boolean(payload.quickConnectionName || normalizedQuickConnectionEmail);
  let quickConnectionConflict: ConnectionEmailConflict | null = null;

  if (hasQuickConnectionInput && normalizedQuickConnectionEmail) {
    quickConnectionConflict = await findConnectionEmailConflict(supabase, user.id, normalizedQuickConnectionEmail);

    if (quickConnectionConflict) {
      selectedConnectionIds.add(quickConnectionConflict.connectionId);
    }
  }

  const shouldCreateQuickConnection = hasQuickConnectionInput && !quickConnectionConflict;

  if (selectedConnectionIds.size + (shouldCreateQuickConnection ? 1 : 0) < MIN_GROUP_SIZE - 1) {
    redirect(withFeedback("/groups?tab=create", "group-minimum-members"));
  }

  if (shouldCreateQuickConnection) {
    const quickConnectionName = payload.quickConnectionName || getFallbackDisplayNameFromEmail(normalizedQuickConnectionEmail);

    if (!quickConnectionName) {
      throw new Error("Failed to create group: enter a name for the quick-added person.");
    }

    const { data: quickConnection, error: quickConnectionError } = await supabase
      .from("connections")
      .insert({
        owner_user_id: user.id,
        display_name: quickConnectionName,
        prefers_profile_name: false,
        contact_email: normalizedQuickConnectionEmail,
        tags: [],
        notes: null,
        preferred_activities: null,
      })
      .select("id")
      .single();

    assertMutation(quickConnectionError, "Failed to quick-add connection for group creation");

    if (!quickConnection) {
      throw new Error("Failed to quick-add connection for group creation.");
    }

    const { error: quickCadenceError } = await supabase.from("cadence_rules").insert({
      owner_user_id: user.id,
      target_type: "connection",
      target_id: quickConnection.id,
      cadence_value: 3,
      cadence_unit: "weeks",
      reminder_lead_days: 5,
    });

    assertMutation(quickCadenceError, "Failed to create quick-added connection cadence");
    selectedConnectionIds.add(quickConnection.id);
  }

  if (selectedConnectionIds.size < MIN_GROUP_SIZE - 1) {
    redirect(withFeedback("/groups?tab=create", "group-minimum-members"));
  }

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

  const { error: membershipError } = await supabase.from("group_memberships").insert({
    group_id: group.id,
    user_id: user.id,
    role: "owner",
  });

  assertMutation(membershipError, "Failed to create group owner membership");

  const membershipSummary = await addConnectionsToGroup(
    supabase,
    user.id,
    user.user_metadata?.display_name ?? user.email,
    group.id,
    payload.name,
    [...selectedConnectionIds],
  );

  revalidateRelationshipPaths("group", group.id);
  redirect(withFeedback(`/groups/${group.id}`, getGroupMembershipFeedbackKey(membershipSummary, "create")));
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
  redirect(withFeedback(`/groups/${payload.groupId}`, "group-saved"));
}

export async function addGroupMembersAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = groupMemberSchema.parse({
    groupId: getString(formData, "groupId"),
    connectionIds: getStringList(formData, "connectionIds"),
  });
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", payload.groupId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  assertMutation(groupError, "Failed to load group for member changes");

  if (!group) {
    throw new Error("Failed to add group members: group not found.");
  }

  const membershipSummary = await addConnectionsToGroup(
    supabase,
    user.id,
    user.user_metadata?.display_name ?? user.email,
    payload.groupId,
    group.name,
    payload.connectionIds,
  );

  revalidateRelationshipPaths("group", payload.groupId);
  const target = await resolveRedirectTarget(
    formData,
    `/groups/${payload.groupId}`,
    getGroupMembershipFeedbackKey(membershipSummary, "add"),
  );
  redirect(target);
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
    photoAlbumLabel: getString(formData, "photoAlbumLabel"),
    photoAlbumUrl: getString(formData, "photoAlbumUrl"),
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
    photo_album_label: payload.photoAlbumLabel || null,
    photo_album_url: payload.photoAlbumUrl || null,
  });

  assertMutation(error, "Failed to create touchpoint");
  revalidateRelationshipPaths(payload.targetType, payload.targetId);
  let fallbackPath = "/dashboard";

  if (payload.targetType === "connection") {
    fallbackPath = `/connections/${payload.targetId}`;
  } else if (payload.targetType === "group") {
    fallbackPath = `/groups/${payload.targetId}`;
  }

  const target = await resolveRedirectTarget(formData, fallbackPath, "touchpoint-saved");
  redirect(target);
}

export async function updateTouchpointAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = touchpointUpdateSchema.parse({
    touchpointId: getString(formData, "touchpointId"),
    touchpointType: getString(formData, "touchpointType"),
    occurredAt: getString(formData, "occurredAt"),
    note: getString(formData, "note"),
    activityLabel: getString(formData, "activityLabel"),
    locationLabel: getString(formData, "locationLabel"),
    photoAlbumLabel: getString(formData, "photoAlbumLabel"),
    photoAlbumUrl: getString(formData, "photoAlbumUrl"),
  });

  const { data: touchpoint, error: touchpointError } = await supabase
    .from("touchpoints")
    .select("id, target_type, target_id")
    .eq("id", payload.touchpointId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  assertMutation(touchpointError, "Failed to load touchpoint for update");

  if (!touchpoint) {
    throw new Error("Failed to update touchpoint: touchpoint not found.");
  }

  const { error: updateError } = await supabase
    .from("touchpoints")
    .update({
      touchpoint_type: payload.touchpointType,
      occurred_at: new Date(payload.occurredAt).toISOString(),
      note: payload.note || null,
      activity_label: payload.activityLabel || null,
      location_label: payload.locationLabel || null,
      photo_album_label: payload.photoAlbumLabel || null,
      photo_album_url: payload.photoAlbumUrl || null,
    })
    .eq("id", payload.touchpointId)
    .eq("owner_user_id", user.id);

  assertMutation(updateError, "Failed to update touchpoint");

  revalidateRelationshipPaths(touchpoint.target_type, touchpoint.target_id);
  revalidatePath("/dashboard");
  revalidatePath(`/touchpoints/${payload.touchpointId}`);

  const target = await resolveRedirectTarget(formData, `/touchpoints/${payload.touchpointId}`, "touchpoint-updated");
  redirect(target);
}

export async function createHangoutAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = hangoutSchema.parse({
    targetType: getString(formData, "targetType"),
    targetId: getString(formData, "targetId"),
    title: getString(formData, "title"),
    startsAt: getString(formData, "startsAt"),
    endsAt: getString(formData, "endsAt"),
    timezone: getString(formData, "timezone"),
    location: getString(formData, "location"),
    notes: getString(formData, "notes"),
    photoAlbumLabel: getString(formData, "photoAlbumLabel"),
    photoAlbumUrl: getString(formData, "photoAlbumUrl"),
    shareWithLinkedUser: getString(formData, "shareWithLinkedUser"),
  });

  const target = await assertCanManageHangoutTarget(supabase, user.id, payload.targetType, payload.targetId);
  const shouldShareWithLinkedUser = payload.targetType === "connection" && payload.shareWithLinkedUser === "true";
  const { data: hangout, error } = await supabase.from("hangouts").insert({
    owner_user_id: user.id,
    target_type: payload.targetType,
    target_id: payload.targetId,
    title: payload.title,
    starts_at: new Date(payload.startsAt).toISOString(),
    ends_at: payload.endsAt ? new Date(payload.endsAt).toISOString() : null,
    timezone: payload.timezone,
    location: payload.location || null,
    notes: payload.notes || null,
    proposal_state: payload.targetType === "group" || shouldShareWithLinkedUser ? "pending" : "confirmed",
    proposal_confirmed_at: payload.targetType === "group" || shouldShareWithLinkedUser ? null : new Date().toISOString(),
    photo_album_label: payload.photoAlbumLabel || null,
    photo_album_url: payload.photoAlbumUrl || null,
  }).select("id, starts_at, ends_at, timezone").single();

  assertMutation(error, "Failed to save hangout plan");

  if (payload.targetType === "group" && hangout) {
    const group = target as GroupHangoutTargetRow;
    const participants = await getGroupHangoutParticipants(supabase, payload.targetId, user.id);

    if (participants.length > 0) {
      const { error: participantError } = await supabase.from("hangout_participants").insert(
        participants.map((participant) => ({
          hangout_id: hangout.id,
          connection_id: participant.connectionId,
          participant_user_id: participant.participantUserId,
        })),
      );

      assertMutation(participantError, "Failed to create hangout participants");

      const whenLabel = formatHangoutWindow({
        startsAt: hangout.starts_at,
        endsAt: hangout.ends_at ?? undefined,
        timezone: hangout.timezone,
      });

      await Promise.allSettled(
        participants.map((participant) => notifyHangoutProposalParticipant(
          supabase,
          participant.participantUserId,
          payload.targetId,
          group.name,
          hangout.id,
          payload.title,
          whenLabel,
          payload.location || null,
          user.user_metadata?.display_name ?? user.email,
        )),
      );
    }
  }

  if (payload.targetType === "connection" && hangout && shouldShareWithLinkedUser) {
    const connection = target as ConnectionHangoutTargetRow;

    const participant = await createSharedConnectionHangoutParticipant(supabase, user.id, hangout.id, connection);
    await notifySharedConnectionHangoutParticipant(
      supabase,
      participant.participantUserId,
      participant.participantConnectionId,
      payload.title,
      user,
      hangout.id,
    );
    revalidateHangoutPaths("connection", participant.participantConnectionId);
  }

  revalidateHangoutPaths(payload.targetType, payload.targetId);
  const fallbackPath = getHangoutPath(payload.targetType, payload.targetId);
  const feedbackKey = getHangoutCreateFeedbackKey(payload.targetType, shouldShareWithLinkedUser);
  const redirectTarget = await resolveRedirectTarget(formData, fallbackPath, feedbackKey);
  redirect(redirectTarget);
}

export async function respondToHangoutProposalAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = hangoutResponseSchema.parse({
    hangoutId: getString(formData, "hangoutId"),
    responseStatus: getString(formData, "responseStatus"),
    downloadCalendar: getString(formData, "downloadCalendar"),
  });

  const { data: participant, error: participantError } = await supabase
    .from("hangout_participants")
    .select("id, response_status, participant_connection_id")
    .eq("hangout_id", payload.hangoutId)
    .eq("participant_user_id", user.id)
    .maybeSingle();

  assertMutation(participantError, "Failed to load hangout participant");

  if (!participant) {
    throw new Error("Failed to respond to hangout: participant not found.");
  }

  const { data: hangout, error: hangoutError } = await supabase
    .from("hangouts")
    .select("id, owner_user_id, target_type, target_id, title, status, proposal_state")
    .eq("id", payload.hangoutId)
    .maybeSingle();

  assertMutation(hangoutError, "Failed to load hangout for response");

  if (!hangout || !isOpenHangoutProposal(hangout)) {
    throw new Error("Failed to respond to hangout: proposal is no longer open.");
  }

  if (participant.response_status === "declined") {
    throw new Error("Failed to respond to hangout: response already finalized.");
  }

  const { error: updateError } = await supabase
    .from("hangout_participants")
    .update({
      response_status: payload.responseStatus,
      responded_at: new Date().toISOString(),
    })
    .eq("id", participant.id);

  assertMutation(updateError, "Failed to save hangout response");

  if (hangout.target_type === "connection") {
    await finalizeConnectionHangoutResponse(supabase, hangout.id, payload.responseStatus);
  }

  await notifyHangoutOwnerResponse(
    supabase,
    {
      ownerUserId: hangout.owner_user_id,
      responderUserId: user.id,
      targetType: hangout.target_type,
      targetId: hangout.target_id,
      responseStatus: payload.responseStatus,
      responder: user,
      hangoutTitle: hangout.title,
      hangoutId: hangout.id,
    },
  );

  revalidateHangoutPaths(hangout.target_type, hangout.target_id);

  if (hangout.target_type === "connection" && participant.participant_connection_id) {
    revalidateHangoutPaths("connection", participant.participant_connection_id);
  }

  const fallbackPath = getHangoutPath(hangout.target_type, hangout.target_id);
  const feedbackKey = getHangoutResponseFeedbackKey(hangout.target_type, payload.responseStatus);
  let target = await resolveRedirectTarget(formData, fallbackPath, feedbackKey);

  if (payload.responseStatus === "accepted" && payload.downloadCalendar === "true") {
    target = withSearchParam(target, "exportHangoutId", hangout.id);
  }

  redirect(target);
}

export async function confirmHangoutProposalAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = hangoutIdSchema.parse({
    hangoutId: getString(formData, "hangoutId"),
  });
  const { data: hangout, error: hangoutError } = await supabase
    .from("hangouts")
    .select("id, target_type, target_id, proposal_state")
    .eq("id", payload.hangoutId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  assertMutation(hangoutError, "Failed to load hangout proposal");

  if (hangout?.target_type !== "group") {
    throw new Error("Failed to confirm hangout proposal: plan not found.");
  }

  if (hangout.proposal_state === "confirmed") {
    const target = await resolveRedirectTarget(formData, `/groups/${hangout.target_id}`, "hangout-proposal-confirmed");
    redirect(target);
  }

  const { error: updateError } = await supabase
    .from("hangouts")
    .update({
      proposal_state: "confirmed",
      proposal_confirmed_at: new Date().toISOString(),
    })
    .eq("id", hangout.id)
    .eq("owner_user_id", user.id);

  assertMutation(updateError, "Failed to confirm hangout proposal");
  revalidateHangoutPaths("group", hangout.target_id);
  const target = await resolveRedirectTarget(formData, `/groups/${hangout.target_id}`, "hangout-proposal-confirmed");
  redirect(target);
}

export async function createConnectionInviteAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const connectionId = getString(formData, "connectionId");
  const redirectTo = getString(formData, "redirectTo");
  const payload = inviteEmailSchema.parse({
    email: getString(formData, "email"),
  });
  const normalizedEmail = normalizeInviteEmail(payload.email);
  const conflict = await findConnectionEmailConflict(supabase, user.id, normalizedEmail, connectionId);

  if (conflict) {
    redirect(withFeedback(`/connections/${conflict.connectionId}`, getConnectionEmailConflictFeedbackKey(conflict)));
  }

  const { error: revokeError } = await supabase
    .from("connection_invites")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("owner_user_id", user.id)
    .eq("connection_id", connectionId)
    .is("claimed_at", null)
    .is("revoked_at", null);

  assertMutation(revokeError, "Failed to replace existing invite");

  const { data: connection, error: connectionError } = await supabase
    .from("connections")
    .select("display_name, prefers_profile_name")
    .eq("id", connectionId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  assertMutation(connectionError, "Failed to load connection for invite");

  const { error: saveContactEmailError } = await supabase
    .from("connections")
    .update({ contact_email: normalizedEmail })
    .eq("id", connectionId)
    .eq("owner_user_id", user.id);

  assertMutation(saveContactEmailError, "Failed to save contact email for invite");

  const token = crypto.randomUUID();
  const { error } = await supabase.from("connection_invites").insert({
    owner_user_id: user.id,
    connection_id: connectionId,
    invited_email: normalizedEmail,
    token,
  });

  assertMutation(error, "Failed to create invite");
  const notification = await notifyConnectionInvite(
    supabase,
    normalizedEmail,
    token,
    getInviteConnectionLabel(connection?.display_name ?? "A connection", connection?.prefers_profile_name ?? false),
    user.user_metadata?.display_name ?? user.email,
  );
  revalidatePath("/dashboard");
  revalidatePath("/connections");
  revalidatePath(`/connections/${connectionId}`);
  let feedbackKey = "invite-created";

  if (notification.delivery === "push") {
    feedbackKey = "invite-pushed";
  } else if (notification.emailSent) {
    feedbackKey = "invite-sent";
  }

  redirect(withFeedback(redirectTo || `/connections/${connectionId}`, feedbackKey));
}

export async function claimConnectionInviteAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const token = getString(formData, "token");
  const fallbackPath = buildConnectionInvitePath(token);
  const normalizedUserEmail = normalizeInviteEmail(user.email ?? "");

  const { data: invite, error } = await supabase
    .from("connection_invites")
    .select("id, connection_id, invited_email, claimed_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  assertMutation(error, "Failed to load invite");

  if (!invite) {
    redirect(withFeedback("/auth", "invite-created"));
  }

  if (invite.revoked_at) {
    redirect(`${fallbackPath}?error=${encodeURIComponent("This invite is no longer active.")}`);
  }

  if (invite.claimed_at) {
    redirect(`${fallbackPath}?claimed=1`);
  }

  if (normalizeInviteEmail(invite.invited_email) !== normalizedUserEmail) {
    redirect(`${fallbackPath}?error=${encodeURIComponent("This invite was created for a different email address.")}`);
  }

  const { data: sourceConnection, error: sourceConnectionError } = await supabase
    .from("connections")
    .select("id, owner_user_id, display_name, prefers_profile_name, contact_email, tags, preferred_activities, notes")
    .eq("id", invite.connection_id)
    .maybeSingle();

  assertMutation(sourceConnectionError, "Failed to load source connection");

  if (!sourceConnection) {
    throw new Error("Failed to claim invite: source connection not found.");
  }

  const { data: sourceCadence, error: sourceCadenceError } = await supabase
    .from("cadence_rules")
    .select("cadence_value, cadence_unit, reminder_lead_days")
    .eq("owner_user_id", sourceConnection.owner_user_id)
    .eq("target_type", "connection")
    .eq("target_id", sourceConnection.id)
    .maybeSingle();

  assertMutation(sourceCadenceError, "Failed to load source cadence");

  const { data: ownerProfile, error: ownerProfileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", sourceConnection.owner_user_id)
    .maybeSingle();

  assertMutation(ownerProfileError, "Failed to load inviter profile");

  const ownerUserResult = await supabase.auth.admin.getUserById(sourceConnection.owner_user_id);
  if (ownerUserResult.error) {
    throw new Error(`Failed to load inviter account: ${ownerUserResult.error.message}`);
  }

  const reciprocalDisplayName = ownerProfile?.display_name?.trim()
    || getFallbackDisplayNameFromEmail(ownerUserResult.data.user?.email);

  const { data: reciprocalConnection, error: reciprocalConnectionError } = await supabase
    .from("connections")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("linked_user_id", sourceConnection.owner_user_id)
    .is("archived_at", null)
    .maybeSingle();

  assertMutation(reciprocalConnectionError, "Failed to load reciprocal connection");

  let reciprocalConnectionId = reciprocalConnection?.id;

  if (!reciprocalConnectionId) {
    await assertCanCreateReciprocalConnectionForInvite(supabase, user.id, user.email, fallbackPath);

    const { data: createdReciprocalConnection, error: createReciprocalConnectionError } = await supabase
      .from("connections")
      .insert({
        owner_user_id: user.id,
        linked_user_id: sourceConnection.owner_user_id,
        display_name: reciprocalDisplayName,
        tags: [],
      })
      .select("id")
      .single();

    assertMutation(createReciprocalConnectionError, "Failed to create reciprocal connection");

    if (!createdReciprocalConnection) {
      throw new Error("Failed to create reciprocal connection: no record returned.");
    }

    reciprocalConnectionId = createdReciprocalConnection.id;
  }

  if (!reciprocalConnectionId) {
    throw new Error("Failed to create or load reciprocal connection.");
  }

  const cadenceValue = sourceCadence?.cadence_value ?? 3;
  const cadenceUnit = sourceCadence?.cadence_unit ?? "weeks";
  const reminderLeadDays = sourceCadence?.reminder_lead_days ?? 5;

  const { error: reciprocalCadenceError } = await supabase.from("cadence_rules").upsert(
    {
      owner_user_id: user.id,
      target_type: "connection",
      target_id: reciprocalConnectionId,
      cadence_value: cadenceValue,
      cadence_unit: cadenceUnit,
      reminder_lead_days: reminderLeadDays,
    },
    { onConflict: "owner_user_id,target_type,target_id" },
  );

  assertMutation(reciprocalCadenceError, "Failed to create reciprocal cadence");

  const { error: updateConnectionError } = await supabase
    .from("connections")
    .update({
      display_name: sourceConnection.prefers_profile_name
        ? await resolveAutomaticConnectionDisplayName(supabase, user.id, normalizedUserEmail)
        : sourceConnection.display_name,
      linked_user_id: user.id,
      contact_email: normalizedUserEmail,
    })
    .eq("id", invite.connection_id);

  assertMutation(updateConnectionError, "Failed to link connection");

  const { error: claimError } = await supabase
    .from("connection_invites")
    .update({
      claimed_by_user_id: user.id,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  assertMutation(claimError, "Failed to claim invite");

  await sendPushToUser(supabase, sourceConnection.owner_user_id, {
    title: "Connection invite accepted",
    body: `${getCurrentUserLabel(user)} accepted your connection invite.`,
    url: `/connections/${invite.connection_id}`,
    tag: `connection-invite-accepted-${invite.id}`,
  }).catch(() => ({ sent: 0 }));

  revalidatePath("/dashboard");
  revalidatePath("/connections");
  revalidatePath(`/connections/${invite.connection_id}`);
  revalidatePath(`/connections/${reciprocalConnectionId}`);
  redirect(`${fallbackPath}?claimed=1`);
}

export async function acceptGroupInviteAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const token = getString(formData, "token");
  const redirectTo = getString(formData, "redirectTo");
  const fallbackPath = buildGroupInvitePath(token);
  const normalizedUserEmail = normalizeInviteEmail(user.email ?? "");

  const { data: invite, error } = await supabase
    .from("group_invites")
    .select("id, group_id, connection_id, invited_email, accepted_at, declined_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  assertMutation(error, "Failed to load group invite");

  if (!invite || invite.revoked_at) {
    redirect(`${fallbackPath}?error=${encodeURIComponent("This group invite is no longer active.")}`);
  }

  if (invite.accepted_at) {
    if (redirectTo) {
      redirect(withFeedback(redirectTo, "group-invite-accepted"));
    }

    redirect(`${fallbackPath}?accepted=1`);
  }

  if (invite.declined_at) {
    if (redirectTo) {
      redirect(withFeedback(redirectTo, "group-invite-declined"));
    }

    redirect(`${fallbackPath}?declined=1`);
  }

  if (normalizeInviteEmail(invite.invited_email) !== normalizedUserEmail) {
    redirect(`${fallbackPath}?error=${encodeURIComponent("This invite was created for a different email address.")}`);
  }

  const acceptedAt = new Date().toISOString();
  const { error: clearConnectionMembershipError } = await supabase
    .from("group_memberships")
    .update({ removed_at: acceptedAt })
    .eq("group_id", invite.group_id)
    .eq("connection_id", invite.connection_id)
    .is("removed_at", null);

  assertMutation(clearConnectionMembershipError, "Failed to clear stale connection membership");

  const { error: membershipError } = await supabase.from("group_memberships").upsert(
    {
      group_id: invite.group_id,
      user_id: user.id,
      connection_id: null,
      role: "member",
      removed_at: null,
    },
    { onConflict: "group_id,user_id" },
  );

  assertMutation(membershipError, "Failed to accept group invite");

  const { error: updateError } = await supabase
    .from("group_invites")
    .update({
      accepted_by_user_id: user.id,
      accepted_at: acceptedAt,
      declined_by_user_id: null,
      declined_at: null,
    })
    .eq("id", invite.id);

  assertMutation(updateError, "Failed to record accepted group invite");
  revalidateRelationshipPaths("group", invite.group_id);

  if (redirectTo) {
    redirect(withFeedback(redirectTo, "group-invite-accepted"));
  }

  redirect(`${fallbackPath}?accepted=1`);
}

export async function declineGroupInviteAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const token = getString(formData, "token");
  const redirectTo = getString(formData, "redirectTo");
  const fallbackPath = buildGroupInvitePath(token);
  const normalizedUserEmail = normalizeInviteEmail(user.email ?? "");

  const { data: invite, error } = await supabase
    .from("group_invites")
    .select("id, group_id, invited_email, accepted_at, declined_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  assertMutation(error, "Failed to load group invite");

  if (!invite || invite.revoked_at) {
    redirect(`${fallbackPath}?error=${encodeURIComponent("This group invite is no longer active.")}`);
  }

  if (invite.accepted_at) {
    if (redirectTo) {
      redirect(withFeedback(redirectTo, "group-invite-accepted"));
    }

    redirect(`${fallbackPath}?accepted=1`);
  }

  if (invite.declined_at) {
    if (redirectTo) {
      redirect(withFeedback(redirectTo, "group-invite-declined"));
    }

    redirect(`${fallbackPath}?declined=1`);
  }

  if (normalizeInviteEmail(invite.invited_email) !== normalizedUserEmail) {
    redirect(`${fallbackPath}?error=${encodeURIComponent("This invite was created for a different email address.")}`);
  }

  const { error: updateError } = await supabase
    .from("group_invites")
    .update({
      declined_by_user_id: user.id,
      declined_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  assertMutation(updateError, "Failed to record declined group invite");
  revalidateRelationshipPaths("group", invite.group_id);

  if (redirectTo) {
    redirect(withFeedback(redirectTo, "group-invite-declined"));
  }

  redirect(`${fallbackPath}?declined=1`);
}

export async function completeHangoutAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = hangoutIdSchema.parse({
    hangoutId: getString(formData, "hangoutId"),
  });
  const { data: hangout, error: hangoutError } = await supabase
    .from("hangouts")
    .select("id, owner_user_id, target_type, target_id, title, starts_at, location, notes, status, proposal_state, photo_album_label, photo_album_url")
    .eq("id", payload.hangoutId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  assertMutation(hangoutError, "Failed to load hangout");

  if (!hangout) {
    throw new Error("Failed to complete hangout: plan not found.");
  }

  if (hangout.target_type === "group" && hangout.proposal_state !== "confirmed") {
    throw new Error("Failed to complete hangout: confirm the proposal before logging it as completed.");
  }

  const occurredAt = new Date(Math.min(Date.now(), new Date(hangout.starts_at).getTime())).toISOString();
  const note = hangout.notes || `Completed planned hangout: ${hangout.title}`;

  const { error: touchpointError } = await supabase.from("touchpoints").insert({
    owner_user_id: user.id,
    target_type: hangout.target_type,
    target_id: hangout.target_id,
    touchpoint_type: "hangout",
    occurred_at: occurredAt,
    note,
    activity_label: hangout.title,
    location_label: hangout.location || null,
    photo_album_label: hangout.photo_album_label || null,
    photo_album_url: hangout.photo_album_url || null,
  });

  assertMutation(touchpointError, "Failed to log completed hangout");

  const { error: updateError } = await supabase
    .from("hangouts")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", hangout.id)
    .eq("owner_user_id", user.id);

  assertMutation(updateError, "Failed to mark hangout as completed");
  revalidateHangoutPaths(hangout.target_type, hangout.target_id);
  const fallbackPath = hangout.target_type === "connection" ? `/connections/${hangout.target_id}` : `/groups/${hangout.target_id}`;
  const target = await resolveRedirectTarget(formData, fallbackPath, "hangout-completed");
  redirect(target);
}

export async function cancelHangoutAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const payload = hangoutIdSchema.parse({
    hangoutId: getString(formData, "hangoutId"),
  });
  const { data: hangout, error: hangoutError } = await supabase
    .from("hangouts")
    .select("id, target_type, target_id")
    .eq("id", payload.hangoutId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  assertMutation(hangoutError, "Failed to load hangout");

  if (!hangout) {
    throw new Error("Failed to cancel hangout: plan not found.");
  }

  const { error } = await supabase
    .from("hangouts")
    .update({
      status: "canceled",
    })
    .eq("id", payload.hangoutId)
    .eq("owner_user_id", user.id);

  assertMutation(error, "Failed to cancel hangout");
  revalidateHangoutPaths(hangout.target_type, hangout.target_id);
  const fallbackPath = hangout.target_type === "connection" ? `/connections/${hangout.target_id}` : `/groups/${hangout.target_id}`;
  const target = await resolveRedirectTarget(formData, fallbackPath, "hangout-canceled");
  redirect(target);
}

export async function archiveConnectionAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const connectionId = getString(formData, "connectionId");

  const { error } = await supabase
    .from("connections")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("owner_user_id", user.id);

  assertMutation(error, "Failed to archive connection");
  revalidatePath("/dashboard");
  revalidatePath("/connections");
  redirect(withFeedback("/connections", "connection-archived"));
}

export async function archiveGroupAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const groupId = getString(formData, "groupId");

  const { error } = await supabase
    .from("groups")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", groupId)
    .eq("owner_user_id", user.id);

  assertMutation(error, "Failed to archive group");
  revalidatePath("/dashboard");
  revalidatePath("/groups");
  redirect(withFeedback("/groups", "group-archived"));
}
