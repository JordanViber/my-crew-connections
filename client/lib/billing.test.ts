import {
  billingIdentityUpdateAllowed,
  buildBillingCheckoutUrls,
  checkoutSessionGrantsPremium,
  decideCheckoutPremiumGrant,
  getBillingStatusLabel,
  isPremiumStatus,
  readRequestOrigin,
  resolveCheckoutBaseUrl,
  type BillingProfile,
} from "@/lib/billing";
import { checkoutBlockedByExistingPremium } from "@/lib/entitlements";

const freeProfile: BillingProfile = {
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_subscription_status: null,
  stripe_price_id: null,
  stripe_current_period_end: null,
  stripe_cancel_at_period_end: false,
};

describe("checkout webhook user matching", () => {
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorLog.mockRestore();
  });

  it("grants Premium when metadata.supabase_user_id equals client_reference_id", () => {
    expect(decideCheckoutPremiumGrant({
      clientReferenceId: "user-1",
      metadataUserId: "user-1",
      customerEmail: "other@example.com",
    })).toEqual({ grant: true, userId: "user-1" });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("rejects a session with missing metadata", () => {
    expect(decideCheckoutPremiumGrant({
      clientReferenceId: "user-from-reference",
      metadataUserId: " ",
      customerEmail: null,
    })).toEqual({ grant: false, reason: "missing-metadata" });
    expect(errorLog).toHaveBeenCalledWith("Rejected checkout Premium grant: missing-metadata");
  });

  it("rejects a metadata and client_reference_id mismatch", () => {
    expect(decideCheckoutPremiumGrant({
      clientReferenceId: "user-from-reference",
      metadataUserId: "user-from-metadata",
      customerEmail: "person@example.com",
    })).toEqual({ grant: false, reason: "metadata-mismatch" });
    expect(errorLog).toHaveBeenCalledWith("Rejected checkout Premium grant: metadata-mismatch");
  });

  it("rejects an email-only session", () => {
    expect(decideCheckoutPremiumGrant({
      clientReferenceId: null,
      metadataUserId: null,
      customerEmail: "person@example.com",
    })).toEqual({ grant: false, reason: "email-only" });
    expect(errorLog).toHaveBeenCalledWith("Rejected checkout Premium grant: email-only");
  });

  it("rejects a different live subscription id", () => {
    expect(billingIdentityUpdateAllowed({
      stripe_customer_id: "cus_same",
      stripe_subscription_id: "sub_live",
      stripe_subscription_status: "active",
    }, {
      stripeCustomerId: "cus_same",
      stripeSubscriptionId: "sub_other",
    })).toEqual({ ok: false, reason: "different-subscription" });
    expect(errorLog).toHaveBeenCalledWith(
      "Rejected Stripe billing identity overwrite: different-subscription",
      { currentSubscriptionId: "sub_live", incomingSubscriptionId: "sub_other" },
    );
  });

  it("rejects a different customer id", () => {
    expect(billingIdentityUpdateAllowed({
      stripe_customer_id: "cus_existing",
      stripe_subscription_id: null,
      stripe_subscription_status: null,
    }, {
      stripeCustomerId: "cus_other",
      stripeSubscriptionId: "sub_new",
    })).toEqual({ ok: false, reason: "different-customer" });
    expect(errorLog).toHaveBeenCalledWith(
      "Rejected Stripe billing identity overwrite: different-customer",
      { currentCustomerId: "cus_existing", incomingCustomerId: "cus_other" },
    );
  });
});

describe("already premium checkout guard", () => {
  it("blocks a second checkout when Premium access or a live subscription id is present", () => {
    expect(checkoutBlockedByExistingPremium({
      ...freeProfile,
      stripe_subscription_status: "active",
      stripe_subscription_id: "sub_active",
    }, "person@example.com")).toBe(true);
    expect(checkoutBlockedByExistingPremium(freeProfile, "jordankdog44@yahoo.com")).toBe(true);
    expect(checkoutBlockedByExistingPremium({
      ...freeProfile,
      stripe_subscription_status: "past_due",
      stripe_subscription_id: "sub_past_due",
    }, "person@example.com")).toBe(true);
    expect(checkoutBlockedByExistingPremium({
      ...freeProfile,
      stripe_subscription_status: "canceled",
      stripe_subscription_id: "sub_canceled",
    }, "person@example.com")).toBe(false);
    expect(checkoutBlockedByExistingPremium(freeProfile, "person@example.com")).toBe(false);
    expect(checkoutBlockedByExistingPremium(null, "person@example.com")).toBe(false);
  });
});

describe("canceled checkout", () => {
  it("leaves the account Free", () => {
    expect(checkoutSessionGrantsPremium({ mode: "subscription", status: "complete" })).toBe(true);
    expect(checkoutSessionGrantsPremium({ mode: "subscription", status: "open" })).toBe(false);
    expect(checkoutSessionGrantsPremium({ mode: "subscription", status: "expired" })).toBe(false);
    expect(checkoutSessionGrantsPremium({ mode: "payment", status: "complete" })).toBe(false);
    expect(isPremiumStatus(freeProfile.stripe_subscription_status)).toBe(false);
    expect(getBillingStatusLabel(freeProfile)).toBe("Free");
    expect(getBillingStatusLabel(null)).toBe("Free");
  });
});

describe("billing checkout return urls", () => {
  it("builds success and cancel urls from NEXT_PUBLIC_APP_URL", () => {
    const baseUrl = resolveCheckoutBaseUrl("https://mycrewconnections.app/", "https://preview.example");

    expect(baseUrl).toBe("https://mycrewconnections.app");
    expect(buildBillingCheckoutUrls(baseUrl)).toEqual({
      successUrl: "https://mycrewconnections.app/settings?feedback=billing-started&session_id={CHECKOUT_SESSION_ID}#billing",
      cancelUrl: "https://mycrewconnections.app/settings?feedback=billing-canceled#billing",
    });
  });

  it("falls back to the request origin when the app url is unset or unsafe", () => {
    expect(resolveCheckoutBaseUrl(undefined, "https://mycrewconnections.app/settings")).toBe("https://mycrewconnections.app");
    expect(resolveCheckoutBaseUrl("javascript:alert(1)", "https://mycrewconnections.app")).toBe("https://mycrewconnections.app");
    expect(readRequestOrigin({
      get(name: string) {
        if (name === "x-forwarded-host") {
          return "mycrewconnections.app, internal.example";
        }

        if (name === "x-forwarded-proto") {
          return "https";
        }

        return null;
      },
    })).toBe("https://mycrewconnections.app");
    expect(resolveCheckoutBaseUrl(null, null)).toBe("http://127.0.0.1:3100");
  });
});
