import { getCurrentPlanState, type CurrentPlanProfile } from "@/lib/current-plan";
import { checkoutBlockedByExistingPremium } from "@/lib/entitlements";

const periodEnd = "2026-11-01T12:00:00.000Z";

function profile(status: string | null, subscriptionId: string | null, cancelAtPeriodEnd = false) {
  return {
    stripe_subscription_id: subscriptionId,
    stripe_subscription_status: status,
    stripe_current_period_end: periodEnd,
    stripe_cancel_at_period_end: cancelAtPeriodEnd,
  };
}

describe("getCurrentPlanState", () => {
  const cases: Array<[CurrentPlanProfile, string]> = [
    [profile("active", "sub_active"), "person@example.com"],
    [profile("trialing", "sub_trial"), "person@example.com"],
    [profile("past_due", "sub_past_due"), "person@example.com"],
    [profile("incomplete", "sub_incomplete"), "person@example.com"],
    [profile("canceled", "sub_canceled"), "person@example.com"],
    [profile("incomplete_expired", "sub_expired"), "person@example.com"],
    [profile(null, null), "person@example.com"],
    [profile(null, "  "), "person@example.com"],
    [null, "jordankdog44@yahoo.com"],
    [profile("active", "sub_active", true), "person@example.com"],
  ];

  it("is present exactly when checkoutBlockedByExistingPremium blocks checkout", () => {
    for (const [billingProfile, email] of cases) {
      expect(getCurrentPlanState(billingProfile, email) !== null).toBe(
        checkoutBlockedByExistingPremium(billingProfile, email),
      );
    }
  });

  it("describes an active Premium plan and a plan that ends this period", () => {
    expect(getCurrentPlanState(profile("active", "sub_active"), "person@example.com")).toMatchObject({
      title: "Premium is active",
      detail: expect.stringMatching(/^Renews /),
    });
    expect(getCurrentPlanState(profile("active", "sub_active", true), "person@example.com")).toMatchObject({
      title: "Premium is active",
      detail: expect.stringMatching(/^Access ends /),
    });
  });

  it("shows the billing status for an open subscription that is not Premium", () => {
    expect(getCurrentPlanState(profile("past_due", "sub_past_due"), "person@example.com")?.title).toBe("Payment due");
    expect(getCurrentPlanState(profile("incomplete", "sub_incomplete"), "person@example.com")?.title).toBe("Incomplete");
  });

  it("shows full access for a super-user without a Premium subscription", () => {
    expect(getCurrentPlanState(null, "jordankdog44@yahoo.com")).toEqual({
      title: "Full access enabled",
      detail: "This account has super-user access, so subscription limits do not apply.",
    });
  });
});
