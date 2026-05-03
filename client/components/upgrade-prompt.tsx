import { PrefetchLink } from "@/components/prefetch-link";
import { billingPlan } from "@/lib/billing";
import { getPremiumValueLine, premiumTierFeatures } from "@/lib/entitlements";

export function UpgradePrompt({
  title,
  body,
  usageLabel,
  compact = false,
}: Readonly<{
  title: string;
  body: string;
  usageLabel?: string;
  compact?: boolean;
}>) {
  const featureLimit = compact ? 2 : 4;

  return (
    <section className="section-card overflow-hidden p-0">
      <div className="grid gap-4 bg-[linear-gradient(135deg,var(--surface-strong)_0%,rgba(216,239,231,0.62)_48%,rgba(248,210,202,0.72)_100%)] p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-foreground px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-background">
                {billingPlan.name}
              </span>
              {usageLabel ? (
                <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground/70">
                  {usageLabel}
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-[1.25rem] font-semibold tracking-tight text-foreground md:text-[1.45rem]">{title}</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-foreground/70">{body}</p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-[1.35rem] font-semibold leading-none tracking-tight text-foreground">
              {billingPlan.monthlyPrice}
              <span className="text-sm font-semibold text-foreground/62">/mo</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-accent-strong">{billingPlan.yearlySavings} yearly</p>
          </div>
        </div>

        {!compact ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {premiumTierFeatures.slice(0, featureLimit).map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm font-medium text-foreground/76">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PrefetchLink className="button-primary" href="/settings#billing">
            Upgrade in billing
          </PrefetchLink>
          <p className="text-sm leading-6 text-foreground/64">{getPremiumValueLine()}</p>
        </div>
      </div>
    </section>
  );
}
