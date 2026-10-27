import { PrefetchLink } from "@/components/prefetch-link";
import { billingPlan, type BillingInterval } from "@/lib/billing";
import {
  freeTierFeatures,
  freeTierLimits,
  premiumTierFeatures,
} from "@/lib/entitlements";

export type CheckoutAction = (formData: FormData) => void | Promise<void>;

const freePlanSummary = `${freeTierLimits.connections} person + ${freeTierLimits.groups} group`;
const premiumPriceSummary = `${billingPlan.monthlyPrice}/mo or ${billingPlan.yearlyPrice}/yr`;
const premiumSignUpHref = "/auth/create?next=/pricing";

const premiumChoices: {
  interval: BillingInterval;
  label: string;
  guestLabel: string;
}[] = [
  {
    interval: "monthly",
    label: "Checkout monthly",
    guestLabel: "Continue monthly",
  },
  {
    interval: "yearly",
    label: "Checkout yearly",
    guestLabel: "Continue yearly",
  },
];

function PlanFeatures({ features }: Readonly<{ features: readonly string[] }>) {
  return (
    <ul className="grid gap-2 text-sm leading-6 text-foreground/75">
      {features.map((feature) => (
        <li key={feature}>{feature}</li>
      ))}
    </ul>
  );
}

function CheckoutForm({
  action,
  interval,
  label,
}: Readonly<{
  action: CheckoutAction;
  interval: BillingInterval;
  label: string;
}>) {
  return (
    <form action={action}>
      <input name="interval" type="hidden" value={interval} />
      <button className="button-primary w-full" type="submit">
        {label}
      </button>
    </form>
  );
}

export function PricingPlans({
  signedIn,
  checkoutAction,
  titleAs = "h2",
}: Readonly<{
  signedIn: boolean;
  checkoutAction: CheckoutAction;
  titleAs?: "h1" | "h2";
}>) {
  const TitleTag = titleAs === "h1" ? "h1" : "h2";

  return (
    <section id="pricing" aria-label="Pricing" className="grid gap-3">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-strong">
          Pricing
        </p>
        <TitleTag className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Free, or Premium when your circle grows.
        </TitleTag>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="section-card grid content-start gap-4 p-4 md:p-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Free</h3>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {freePlanSummary}
            </p>
          </div>
          <PlanFeatures features={freeTierFeatures} />
          {signedIn ? (
            <PrefetchLink className="button-secondary w-full" href="/dashboard">
              Go to the app
            </PrefetchLink>
          ) : (
            <PrefetchLink
              className="button-secondary w-full"
              href="/auth/create"
            >
              Create free account
            </PrefetchLink>
          )}
        </article>

        <article className="section-card grid content-start gap-4 border-accent/30 p-4 md:p-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {billingPlan.name}
            </h3>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {premiumPriceSummary}
            </p>
            <p className="mt-1 text-sm font-semibold text-accent-strong">
              {billingPlan.yearlySavings}
            </p>
          </div>
          <PlanFeatures features={premiumTierFeatures} />
          <div className="grid gap-2">
            {premiumChoices.map((choice) =>
              signedIn ? (
                <CheckoutForm
                  key={choice.interval}
                  action={checkoutAction}
                  interval={choice.interval}
                  label={choice.label}
                />
              ) : (
                <PrefetchLink
                  key={choice.interval}
                  className="button-primary w-full"
                  href={premiumSignUpHref}
                >
                  {choice.guestLabel}
                </PrefetchLink>
              ),
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
