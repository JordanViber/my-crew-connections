export type BillingInterval = "monthly" | "yearly";

export type BillingProfile = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean | null;
};

const localAppOrigin = "http://127.0.0.1:3100";

const defaultBillingConfig = {
  productId: "prod_UNYDgrpXLyEEWO",
  monthlyPriceId: "price_1TRXutKjuEm9woaeA2HsHmkn",
  yearlyPriceId: "price_1TReLpKjuEm9woae6nWqASQP",
};

export const billingPlan = {
  name: "Premium",
  monthlyPrice: "$5",
  yearlyPrice: "$55",
  yearlySavings: "Save $5",
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
  };
}

export function getPriceIdForInterval(interval: BillingInterval) {
  const config = getBillingConfig();
  return interval === "monthly" ? config.monthlyPriceId : config.yearlyPriceId;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || localAppOrigin;
}

type HeaderReader = {
  get(name: string): string | null;
};

export type CheckoutGrantSource = {
  clientReferenceId?: string | null;
  metadataUserId?: string | null;
  customerEmail?: string | null;
};

export type CheckoutGrantDecision =
  | { grant: true; userId: string }
  | { grant: false; reason: "missing-metadata" | "metadata-mismatch" | "email-only" };

export type StoredBillingIdentity = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
};

export type IncomingBillingIdentity = {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

export type BillingIdentityDecision =
  | { ok: true }
  | { ok: false; reason: "different-customer" | "different-subscription" };

const closedSubscriptionStatuses = new Set(["canceled", "incomplete_expired"]);

function blankToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function normalizeHttpOrigin(value?: string | null) {
  const trimmed = blankToNull(value);

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function readRequestOrigin(headerStore: HeaderReader) {
  const origin = normalizeHttpOrigin(headerStore.get("origin"));

  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const hostname = host?.split(",")[0]?.trim();

  if (!hostname) {
    return null;
  }

  const proto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return normalizeHttpOrigin(`${proto}://${hostname}`);
}

export function resolveCheckoutBaseUrl(configuredUrl?: string | null, requestOrigin?: string | null) {
  return normalizeHttpOrigin(configuredUrl) ?? normalizeHttpOrigin(requestOrigin) ?? localAppOrigin;
}

export function buildBillingCheckoutUrls(baseUrl: string) {
  return {
    successUrl: `${baseUrl}/settings?feedback=billing-started&session_id={CHECKOUT_SESSION_ID}#billing`,
    cancelUrl: `${baseUrl}/settings?feedback=billing-canceled#billing`,
  };
}

export function buildBillingPortalReturnUrl(baseUrl: string) {
  return `${baseUrl}/settings#billing`;
}

export function isClosedSubscriptionStatus(status?: string | null) {
  return closedSubscriptionStatuses.has(status ?? "");
}

export function decideCheckoutPremiumGrant(source: CheckoutGrantSource): CheckoutGrantDecision {
  const metadataUserId = blankToNull(source.metadataUserId);
  const clientReferenceId = blankToNull(source.clientReferenceId);

  if (!metadataUserId) {
    const reason = !clientReferenceId && blankToNull(source.customerEmail) ? "email-only" : "missing-metadata";
    console.error(`Rejected checkout Premium grant: ${reason}`);
    return { grant: false, reason };
  }

  if (metadataUserId !== clientReferenceId) {
    console.error("Rejected checkout Premium grant: metadata-mismatch");
    return { grant: false, reason: "metadata-mismatch" };
  }

  return { grant: true, userId: metadataUserId };
}

export function billingIdentityUpdateAllowed(
  current: StoredBillingIdentity | null | undefined,
  incoming: IncomingBillingIdentity,
): BillingIdentityDecision {
  const currentCustomerId = blankToNull(current?.stripe_customer_id);
  const incomingCustomerId = blankToNull(incoming.stripeCustomerId);

  if (currentCustomerId && incomingCustomerId && currentCustomerId !== incomingCustomerId) {
    console.error("Rejected Stripe billing identity overwrite: different-customer", {
      currentCustomerId,
      incomingCustomerId,
    });
    return { ok: false, reason: "different-customer" };
  }

  const currentSubscriptionId = blankToNull(current?.stripe_subscription_id);
  const incomingSubscriptionId = blankToNull(incoming.stripeSubscriptionId);
  const liveSubscription = Boolean(currentSubscriptionId) && !isClosedSubscriptionStatus(current?.stripe_subscription_status);

  if (liveSubscription && incomingSubscriptionId && currentSubscriptionId !== incomingSubscriptionId) {
    console.error("Rejected Stripe billing identity overwrite: different-subscription", {
      currentSubscriptionId,
      incomingSubscriptionId,
    });
    return { ok: false, reason: "different-subscription" };
  }

  return { ok: true };
}

export function checkoutSessionGrantsPremium(session: {
  mode?: string | null;
  status?: string | null;
}) {
  return session.mode === "subscription" && session.status === "complete";
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
