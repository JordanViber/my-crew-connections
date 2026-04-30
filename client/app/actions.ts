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
import { notifyConnectionInvite } from "@/lib/connection-invites";
import { buildConnectionInvitePath, normalizeInviteEmail } from "@/lib/invites";
import { canCreateConnection, canCreateGroup } from "@/lib/entitlements";

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
  return `${basePath}${separator}feedback=${feedback}${hash ? `#${hash}` : ""}`;
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

  const payload = connectionSchema.parse({
    displayName: getString(formData, "displayName"),
    inviteEmail: getString(formData, "inviteEmail"),
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

  let feedbackKey = "connection-created";

  if (payload.inviteEmail) {
    const normalizedEmail = normalizeInviteEmail(payload.inviteEmail);
    const token = crypto.randomUUID();

    const { error: inviteError } = await supabase.from("connection_invites").insert({
      owner_user_id: user.id,
      connection_id: connection.id,
      invited_email: normalizedEmail,
      token,
    });

    assertMutation(inviteError, "Failed to create connection invite");
    const notification = await notifyConnectionInvite(supabase, normalizedEmail, token, payload.displayName);
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
  redirect(withFeedback(`/groups/${group.id}`, "group-created"));
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
  redirect(withFeedback(`/groups/${payload.groupId}`, "members-added"));
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
  const fallbackPath = payload.targetType === "connection"
    ? `/connections/${payload.targetId}`
    : payload.targetType === "group"
      ? `/groups/${payload.targetId}`
      : "/dashboard";
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

  const { error: revokeError } = await supabase
    .from("connection_invites")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("owner_user_id", user.id)
    .eq("connection_id", connectionId)
    .eq("invited_email", normalizedEmail)
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

  const { error: updateConnectionError } = await supabase
    .from("connections")
    .update({
      linked_user_id: user.id,
    })
    .eq("id", invite.connection_id);

  assertMutation(updateConnectionError, "Failed to link connection");

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
