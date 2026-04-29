import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BillingPlanSelector } from "@/components/billing-plan-selector";
import { FeedbackBanner } from "@/components/feedback-banner";
import { NotificationSettingRow } from "@/components/notification-setting-row";
import { AccountSettingsEditor, SecuritySettingsEditor } from "@/components/settings-edit-sections";
import { ThemeSettingRow } from "@/components/theme-setting-row";
import { createBillingPortalAction } from "@/app/actions";
import { billingPlan, getBillingRenewalLabel, getBillingStatusLabel, isPremiumStatus } from "@/lib/billing";
import { freeTierFeatures, hasPremiumAccess, isSuperUserEmail, premiumTierFeatures } from "@/lib/entitlements";
import { getFeedback } from "@/lib/feedback";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ProfileRecord = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_region: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean | null;
};

type BillingFields = Pick<
  ProfileRecord,
  | "stripe_customer_id"
  | "stripe_subscription_id"
  | "stripe_subscription_status"
  | "stripe_price_id"
  | "stripe_current_period_end"
  | "stripe_cancel_at_period_end"
>;

const baseProfileSelect = "display_name, first_name, last_name, phone_number, billing_address_line1, billing_address_line2, billing_city, billing_region, billing_postal_code, billing_country";
const billingProfileSelect = "stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id, stripe_current_period_end, stripe_cancel_at_period_end";
const emptyBillingFields: BillingFields = {
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_subscription_status: null,
  stripe_price_id: null,
  stripe_current_period_end: null,
  stripe_cancel_at_period_end: null,
};

function SettingsGroup({
  id,
  title,
  children,
}: Readonly<{
  id?: string;
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section id={id} className="scroll-mt-6 overflow-hidden rounded-lg border border-border bg-surface-strong shadow-[var(--shadow-tight)]">
      <div className="border-b border-border/75 px-4 py-3">
        <h2 className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-foreground/58">{title}</h2>
      </div>
      <div className="divide-y divide-border/70">{children}</div>
    </section>
  );
}

function SettingsRow({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="px-4 py-4">{children}</div>;
}

function StatusBadge({ label, active }: Readonly<{ label: string; active: boolean }>) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-mint text-[#174632]" : "bg-surface-muted text-foreground/64"}`}>
      {label}
    </span>
  );
}

function PlanFeatureColumn({
  title,
  price,
  features,
  current = false,
  emphasized = false,
}: Readonly<{
  title: string;
  price: string;
  features: string[];
  current?: boolean;
  emphasized?: boolean;
}>) {
  return (
    <div
      className={`rounded-lg border p-3.5 ${
        emphasized
          ? "border-accent/40 bg-[linear-gradient(135deg,var(--surface-strong)_0%,rgba(216,239,231,0.68)_55%,rgba(248,210,202,0.66)_100%)]"
          : "border-border bg-surface-muted"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-foreground/58">{price}</p>
        </div>
        {current ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-background">
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" viewBox="0 0 24 24">
              <path d="m5 12 4 4L19 6" />
            </svg>
            Current
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm font-medium text-foreground/76">
            <span className={`h-1.5 w-1.5 rounded-full ${emphasized ? "bg-accent" : "bg-foreground/32"}`} />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getDisplayName(profile: ProfileRecord | null, email?: string | null) {
  return profile?.display_name
    ?? (`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || email?.split("@")[0] || "Your account");
}

export default async function SettingsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ feedback?: string }>;
}>) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/settings");
  }

  const { data: baseProfile, error } = await supabase
    .from("profiles")
    .select(baseProfileSelect)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  const { data: billingProfile } = await supabase
    .from("profiles")
    .select(billingProfileSelect)
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = baseProfile
    ? { ...baseProfile, ...emptyBillingFields, ...(billingProfile ?? {}) } as ProfileRecord
    : null;
  const feedback = getFeedback(params.feedback);
  const displayName = getDisplayName(typedProfile, user.email);
  const isSuperUser = isSuperUserEmail(user.email);
  const billingStatus = isSuperUser ? "Full access" : getBillingStatusLabel(typedProfile);
  const renewalLabel = getBillingRenewalLabel(typedProfile);
  const hasPaidPremium = isPremiumStatus(typedProfile?.stripe_subscription_status);
  const hasPremium = hasPremiumAccess(typedProfile, user.email);
  const canManageBilling = Boolean(process.env.STRIPE_SECRET_KEY && typedProfile?.stripe_customer_id);

  return (
    <AppShell
      title="Settings"
      subtitle="Manage account, billing, appearance, and sign-in preferences."
      email={user.email ?? "Signed in"}
      firstName={typedProfile?.first_name}
      displayName={displayName}
    >
      {feedback ? (
        <div className="mb-4">
          <FeedbackBanner title={feedback.title} body={feedback.body} tone={feedback.tone} />
        </div>
      ) : null}

      <div className="mx-auto grid max-w-5xl gap-4">
        <SettingsGroup title="Account">
          <SettingsRow>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">{displayName}</p>
                <p className="text-sm text-foreground/58">{user.email}</p>
              </div>
              <StatusBadge active={hasPremium} label={billingStatus} />
            </div>
          </SettingsRow>
          <SettingsRow>
            <AccountSettingsEditor profile={typedProfile} displayName={displayName} />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup id="billing" title="Billing">
          <SettingsRow>
            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="font-semibold text-foreground">Choose the plan for your circle</p>
                <p className="mt-1 text-sm leading-6 text-foreground/62">
                  Free keeps one person and one group moving. Premium removes the ceiling when you want the app to hold your whole circle.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PlanFeatureColumn title="Free" price="Start small" features={freeTierFeatures} current={!hasPremium} />
                <PlanFeatureColumn
                  title={billingPlan.name}
                  price={`${billingPlan.monthlyPrice}/mo or ${billingPlan.yearlyPrice}/yr`}
                  features={premiumTierFeatures}
                  current={hasPremium}
                  emphasized
                />
              </div>
            </div>
          </SettingsRow>
          <SettingsRow>
            {hasPremium ? (
              <div className="rounded-lg border border-border bg-surface-muted p-3.5">
                <p className="font-semibold text-foreground">{isSuperUser ? "Full access enabled" : "Premium is active"}</p>
                <p className="mt-1 text-sm leading-6 text-foreground/62">
                  {isSuperUser
                    ? "This account has super-user access, so subscription limits do not apply."
                    : renewalLabel
                      ? `${typedProfile?.stripe_cancel_at_period_end ? "Access ends" : "Renews"} ${renewalLabel}.`
                      : "All Premium features are unlocked for this account."}
                </p>
              </div>
            ) : (
              <BillingPlanSelector />
            )}
            {canManageBilling && hasPaidPremium ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={createBillingPortalAction}>
                  <button className="button-secondary" type="submit">
                    Manage billing
                  </button>
                </form>
              </div>
            ) : null}
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <SettingsRow>
            <ThemeSettingRow />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="Notifications">
          <SettingsRow>
            <NotificationSettingRow />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="Security">
          <SettingsRow>
            <SecuritySettingsEditor email={user.email ?? ""} />
          </SettingsRow>
        </SettingsGroup>
      </div>
    </AppShell>
  );
}
