import {
  billingPlan,
  getBillingRenewalLabel,
  getBillingStatusLabel,
  isPremiumStatus,
  type BillingProfile,
} from "@/lib/billing";
import { checkoutBlockedByExistingPremium, isSuperUserEmail } from "@/lib/entitlements";

export type CurrentPlanProfile = Pick<
  BillingProfile,
  | "stripe_subscription_id"
  | "stripe_subscription_status"
  | "stripe_current_period_end"
  | "stripe_cancel_at_period_end"
> | null | undefined;

export type CurrentPlanState = {
  title: string;
  detail: string;
};

function toBillingProfile(profile?: CurrentPlanProfile): BillingProfile {
  return {
    stripe_customer_id: null,
    stripe_subscription_id: profile?.stripe_subscription_id ?? null,
    stripe_subscription_status: profile?.stripe_subscription_status ?? null,
    stripe_price_id: null,
    stripe_current_period_end: profile?.stripe_current_period_end ?? null,
    stripe_cancel_at_period_end: profile?.stripe_cancel_at_period_end ?? null,
  };
}

function renewalDetail(profile: BillingProfile) {
  const renewalLabel = getBillingRenewalLabel(profile);

  if (!renewalLabel) {
    return null;
  }

  const verb = profile.stripe_cancel_at_period_end ? "Access ends" : "Renews";
  return `${verb} ${renewalLabel}.`;
}

export function getCurrentPlanState(profile?: CurrentPlanProfile, email?: string | null): CurrentPlanState | null {
  if (!checkoutBlockedByExistingPremium(profile, email)) {
    return null;
  }

  if (isSuperUserEmail(email) && !isPremiumStatus(profile?.stripe_subscription_status)) {
    return {
      title: "Full access enabled",
      detail: "This account has super-user access, so subscription limits do not apply.",
    };
  }

  const billingProfile = toBillingProfile(profile);
  const schedule = renewalDetail(billingProfile);

  if (isPremiumStatus(profile?.stripe_subscription_status)) {
    return {
      title: `${billingPlan.name} is active`,
      detail: schedule ?? "All Premium features are unlocked for this account.",
    };
  }

  return {
    title: getBillingStatusLabel(billingProfile),
    detail: schedule ?? "Manage this subscription in Billing.",
  };
}
