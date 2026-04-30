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
  hangoutSchema,
  inviteEmailSchema,
  parseTargetReference,
  parseCommaSeparatedList,
  touchpointSchema,
  updateConnectionSchema,
  updateGroupSchema,
} from "@/lib/validations";
import { getDefaultCountry, normalizePhoneNumberForStorage } from "@/lib/account-fields";
import { findAuthUserByEmail } from "@/lib/auth-users";
import { notifyConnectionInvite } from "@/lib/connection-invites";
import { notifyGroupInvite } from "@/lib/group-invites";
import { buildConnectionInvitePath, buildGroupInvitePath, normalizeInviteEmail } from "@/lib/invites";
import { canCreateConnection, canCreateGroup } from "@/lib/entitlements";

type ConnectionEmailConflict = {
  kind: "saved" | "linked" | "pending";
  connectionId: string;
};

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

function getFallbackDisplayNameFromEmail(email?: string | null) {
  if (!email) {
    return "Linked user";
  }

  return email.split("@")[0] || "Linked user";
}

function buildDisplayName(firstName: string, lastName: string, email?: string | null) {
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return getFallbackDisplayNameFromEmail(email);
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
      display_name: payload.displayName,
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
      payload.displayName,
      user.user_metadata?.display_name ?? user.email,
    );
    feedbackKey = notification.emailSent ? "connection-created-invite-sent" : "connection-created-invite-ready";
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

  const { error: updateError } = await supabase
    .from("connections")
    .update({
      display_name: payload.displayName,
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
    payload.connectionIds,
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
  let fallbackPath = "/dashboard";

  if (payload.targetType === "connection") {
    fallbackPath = `/connections/${payload.targetId}`;
  } else if (payload.targetType === "group") {
    fallbackPath = `/groups/${payload.targetId}`;
  }

  const target = await resolveRedirectTarget(formData, fallbackPath, "touchpoint-saved");
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
  });

  const { error } = await supabase.from("hangouts").insert({
    owner_user_id: user.id,
    target_type: payload.targetType,
    target_id: payload.targetId,
    title: payload.title,
    starts_at: new Date(payload.startsAt).toISOString(),
    ends_at: payload.endsAt ? new Date(payload.endsAt).toISOString() : null,
    timezone: payload.timezone,
    location: payload.location || null,
    notes: payload.notes || null,
  });

  assertMutation(error, "Failed to save hangout plan");
  revalidateHangoutPaths(payload.targetType, payload.targetId);
  const fallbackPath = payload.targetType === "connection" ? `/connections/${payload.targetId}` : `/groups/${payload.targetId}`;
  const target = await resolveRedirectTarget(formData, fallbackPath, "hangout-saved");
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
    .select("display_name")
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
    connection?.display_name ?? "A connection",
    user.user_metadata?.display_name ?? user.email,
  );
  revalidatePath("/dashboard");
  revalidatePath("/connections");
  revalidatePath(`/connections/${connectionId}`);
  redirect(withFeedback(redirectTo || `/connections/${connectionId}`, notification.emailSent ? "invite-sent" : "invite-created"));
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

  if (!invite || invite.revoked_at) {
    redirect(withFeedback("/auth", "invite-created"));
  }

  if (invite.claimed_at) {
    redirect(`${fallbackPath}?claimed=1`);
  }

  if (normalizeInviteEmail(invite.invited_email) !== normalizedUserEmail) {
    redirect(`${fallbackPath}?error=${encodeURIComponent("This invite was created for a different email address.")}`);
  }

  const { data: sourceConnection, error: sourceConnectionError } = await supabase
    .from("connections")
    .select("id, owner_user_id, display_name, tags, preferred_activities, notes")
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
      linked_user_id: user.id,
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
  const { error: membershipError } = await supabase.from("group_memberships").upsert(
    {
      group_id: invite.group_id,
      connection_id: invite.connection_id,
      role: "member",
      removed_at: null,
    },
    { onConflict: "group_id,connection_id" },
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
  const hangoutId = getString(formData, "hangoutId");
  const { data: hangout, error: hangoutError } = await supabase
    .from("hangouts")
    .select("id, owner_user_id, target_type, target_id, title, starts_at, location, notes, status")
    .eq("id", hangoutId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  assertMutation(hangoutError, "Failed to load hangout");

  if (!hangout) {
    throw new Error("Failed to complete hangout: plan not found.");
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
  const hangoutId = getString(formData, "hangoutId");
  const { data: hangout, error: hangoutError } = await supabase
    .from("hangouts")
    .select("id, target_type, target_id")
    .eq("id", hangoutId)
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
    .eq("id", hangoutId)
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
