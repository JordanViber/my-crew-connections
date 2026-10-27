import { billingPlan, isPremiumStatus, type BillingProfile } from "@/lib/billing";

export const freeTierLimits = {
  connections: 1,
  groups: 1,
} as const;

export type SubscriptionStatusProfile = Pick<BillingProfile, "stripe_subscription_status"> | null | undefined;

const superUserEmails = new Set([
  "jordankdog44@yahoo.com",
  "jaynaykeller@yahoo.com",
]);

const closedSubscriptionStatuses = new Set(["canceled", "incomplete_expired"]);

export const freeTierFeatures = [
  "1 person",
  "1 group",
  "Core reminders",
];

export const premiumTierFeatures = [
  "Unlimited people and groups",
  "Unlimited plans and touchpoint history",
  "Premium reminder controls as they roll out",
  "Priority access to new relationship tools",
];

export function isSuperUserEmail(email?: string | null) {
  return Boolean(email && superUserEmails.has(email.trim().toLowerCase()));
}

export function hasPremiumAccess(profile?: SubscriptionStatusProfile, email?: string | null) {
  return isPremiumStatus(profile?.stripe_subscription_status) || isSuperUserEmail(email);
}

export function checkoutBlockedByExistingPremium(
  profile?: Pick<BillingProfile, "stripe_subscription_status" | "stripe_subscription_id"> | null,
  email?: string | null,
) {
  if (hasPremiumAccess(profile, email)) {
    return true;
  }

  const subscriptionId = profile?.stripe_subscription_id?.trim();

  if (!subscriptionId) {
    return false;
  }

  return !closedSubscriptionStatuses.has(profile?.stripe_subscription_status ?? "");
}

export function canCreateConnection(profile: SubscriptionStatusProfile, connectionCount: number, email?: string | null) {
  return hasPremiumAccess(profile, email) || connectionCount < freeTierLimits.connections;
}

export function canCreateGroup(profile: SubscriptionStatusProfile, groupCount: number, email?: string | null) {
  return hasPremiumAccess(profile, email) || groupCount < freeTierLimits.groups;
}

export function getFreeTierUsageLabel(kind: "connection" | "group", count: number) {
  const limit = kind === "connection" ? freeTierLimits.connections : freeTierLimits.groups;
  const label = kind === "connection" ? "person" : "group";

  return `${Math.min(count, limit)} of ${limit} free ${label} ${limit === 1 ? "slot" : "slots"} used`;
}

export function getPremiumValueLine() {
  return `${billingPlan.monthlyPrice}/mo or ${billingPlan.yearlyPrice}/yr unlocks unlimited people, groups, plans, and future premium tools.`;
}
