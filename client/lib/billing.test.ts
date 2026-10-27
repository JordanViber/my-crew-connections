import {
  buildBillingCheckoutUrls,
  checkoutSessionGrantsPremium,
  getBillingStatusLabel,
  isPremiumStatus,
  readRequestOrigin,
  resolveCheckoutBaseUrl,
  resolveCheckoutUserId,
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
  it("matches the user from client_reference_id before metadata or email", async () => {
    const findUserIdByEmail = vi.fn(async () => "user-from-email");

    await expect(resolveCheckoutUserId({
      clientReferenceId: "user-from-reference",
      metadataUserId: "user-from-metadata",
      customerEmail: "other@example.com",
    }, findUserIdByEmail)).resolves.toBe("user-from-reference");

    expect(findUserIdByEmail).not.toHaveBeenCalled();
  });

  it("uses metadata when client_reference_id is blank, then customer email", async () => {
    const findUserIdByEmail = vi.fn(async () => "user-from-email");

    await expect(resolveCheckoutUserId({
      clientReferenceId: "  ",
      metadataUserId: "user-from-metadata",
      customerEmail: "person@example.com",
    }, findUserIdByEmail)).resolves.toBe("user-from-metadata");

    await expect(resolveCheckoutUserId({
      clientReferenceId: null,
      metadataUserId: "",
      customerEmail: "Person@Example.com",
    }, findUserIdByEmail)).resolves.toBe("user-from-email");

    expect(findUserIdByEmail).toHaveBeenCalledTimes(1);
    expect(findUserIdByEmail).toHaveBeenCalledWith("person@example.com");
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
