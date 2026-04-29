import { billingPlan, isPremiumStatus, type BillingProfile } from "@/lib/billing";

export const freeTierLimits = {
  connections: 1,
  groups: 1,
} as const;

export type SubscriptionStatusProfile = Pick<BillingProfile, "stripe_subscription_status"> | null | undefined;

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

export function hasPremiumAccess(profile?: SubscriptionStatusProfile) {
  return isPremiumStatus(profile?.stripe_subscription_status);
}

export function canCreateConnection(profile: SubscriptionStatusProfile, connectionCount: number) {
  return hasPremiumAccess(profile) || connectionCount < freeTierLimits.connections;
}

export function canCreateGroup(profile: SubscriptionStatusProfile, groupCount: number) {
  return hasPremiumAccess(profile) || groupCount < freeTierLimits.groups;
}

export function getFreeTierUsageLabel(kind: "connection" | "group", count: number) {
  const limit = kind === "connection" ? freeTierLimits.connections : freeTierLimits.groups;
  const label = kind === "connection" ? "person" : "group";

  return `${Math.min(count, limit)} of ${limit} free ${label} ${limit === 1 ? "slot" : "slots"} used`;
}

export function getPremiumValueLine() {
  return `${billingPlan.monthlyPrice}/mo or ${billingPlan.yearlyPrice}/yr unlocks unlimited people, groups, plans, and future premium tools.`;
}
