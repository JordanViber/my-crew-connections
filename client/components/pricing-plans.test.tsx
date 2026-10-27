import { render, screen } from "@testing-library/react";
import { PricingPlans } from "@/components/pricing-plans";
import { billingPlan } from "@/lib/billing";
import { freeTierLimits } from "@/lib/entitlements";

const checkoutAction = vi.fn();

describe("PricingPlans", () => {
  beforeEach(() => {
    checkoutAction.mockReset();
  });

  it("shows free and premium prices from the billing constants and sends guests to sign-up", () => {
    const { container } = render(<PricingPlans signedIn={false} checkoutAction={checkoutAction} />);

    expect(screen.getByText(`${freeTierLimits.connections} person + ${freeTierLimits.groups} group`)).toBeVisible();
    expect(screen.getByText(`${billingPlan.monthlyPrice}/mo or ${billingPlan.yearlyPrice}/yr`)).toBeVisible();
    expect(screen.getByText(billingPlan.yearlySavings)).toBeVisible();
    expect(screen.getByRole("link", { name: "Create free account" })).toHaveAttribute("href", "/auth/create");
    expect(screen.getByRole("link", { name: "Continue monthly" })).toHaveAttribute("href", "/auth/create?next=/pricing");
    expect(screen.getByRole("link", { name: "Continue yearly" })).toHaveAttribute("href", "/auth/create?next=/pricing");
    expect(container.querySelector('a[href*="buy.stripe.com"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Checkout monthly" })).not.toBeInTheDocument();
  });

  it("starts signed-in premium checkout through the checkout action", () => {
    const { container } = render(<PricingPlans signedIn checkoutAction={checkoutAction} />);

    expect(screen.getByRole("link", { name: "Go to the app" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("button", { name: "Checkout monthly" }).closest("form")).toContainElement(
      container.querySelector('input[name="interval"][value="monthly"]'),
    );
    expect(screen.getByRole("button", { name: "Checkout yearly" }).closest("form")).toContainElement(
      container.querySelector('input[name="interval"][value="yearly"]'),
    );
    expect(container.querySelector('a[href*="buy.stripe.com"]')).toBeNull();
    expect(container.innerHTML).not.toContain("buy.stripe.com");
  });
});
