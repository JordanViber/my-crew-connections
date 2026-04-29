export type BillingInterval = "monthly" | "yearly";

export type BillingProfile = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean | null;
};

const defaultBillingConfig = {
  productId: "prod_UNYDgrpXLyEEWO",
  monthlyPriceId: "price_1TRXutKjuEm9woaeA2HsHmkn",
  yearlyPriceId: "price_1TRXuzKjuEm9woaezoDjLKHc",
  monthlyPaymentLinkUrl: "https://buy.stripe.com/4gM3cw6Lp4C66lD2DjbjW00",
  yearlyPaymentLinkUrl: "https://buy.stripe.com/8x2cN6d9N0lQ8tL3HnbjW01",
};

export const billingPlan = {
  name: "Premium",
  monthlyPrice: "$5",
  yearlyPrice: "$50",
  yearlySavings: "Save $10",
  features: [
    "Unlimited people and groups",
    "Unlimited saved plans and touchpoint history",
    "Premium reminder controls as they roll out",
    "Priority access to new relationship tools",
  ],
};

export function getBillingConfig() {
  return {
    productId: process.env.STRIPE_PREMIUM_PRODUCT_ID || defaultBillingConfig.productId,
    monthlyPriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || defaultBillingConfig.monthlyPriceId,
    yearlyPriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || defaultBillingConfig.yearlyPriceId,
    monthlyPaymentLinkUrl: process.env.STRIPE_PREMIUM_MONTHLY_PAYMENT_LINK_URL || defaultBillingConfig.monthlyPaymentLinkUrl,
    yearlyPaymentLinkUrl: process.env.STRIPE_PREMIUM_YEARLY_PAYMENT_LINK_URL || defaultBillingConfig.yearlyPaymentLinkUrl,
  };
}

export function getPriceIdForInterval(interval: BillingInterval) {
  const config = getBillingConfig();
  return interval === "monthly" ? config.monthlyPriceId : config.yearlyPriceId;
}

export function getPaymentLinkForInterval(interval: BillingInterval, email?: string | null, userId?: string) {
  const config = getBillingConfig();
  const link = interval === "monthly" ? config.monthlyPaymentLinkUrl : config.yearlyPaymentLinkUrl;

  if (!link) {
    return null;
  }

  const url = new URL(link);

  if (email) {
    url.searchParams.set("prefilled_email", email);
  }

  if (userId) {
    url.searchParams.set("client_reference_id", userId);
  }

  return url.toString();
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3100";
}

export function isPremiumStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export function getBillingStatusLabel(profile?: BillingProfile | null) {
  const status = profile?.stripe_subscription_status;

  if (isPremiumStatus(status)) {
    return profile?.stripe_cancel_at_period_end ? "Canceling" : "Active";
  }

  if (status === "past_due") {
    return "Payment due";
  }

  if (status === "incomplete") {
    return "Incomplete";
  }

  if (status === "canceled") {
    return "Canceled";
  }

  return "Free";
}

export function getBillingRenewalLabel(profile?: BillingProfile | null) {
  if (!profile?.stripe_current_period_end) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(profile.stripe_current_period_end));
}
