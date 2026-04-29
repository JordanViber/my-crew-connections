import { redirect } from "next/navigation";
import { AddressFields } from "@/components/address-fields";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PhoneNumberInput } from "@/components/phone-number-input";
import { ThemeSettingRow } from "@/components/theme-setting-row";
import {
  createBillingCheckoutAction,
  createBillingPortalAction,
  updateAccountEmailAction,
  updateAccountPasswordAction,
  updateProfileAction,
} from "@/app/actions";
import { billingPlan, getBillingRenewalLabel, getBillingStatusLabel, isPremiumStatus } from "@/lib/billing";
import { getDefaultCountry } from "@/lib/account-fields";
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

function BillingChoice({
  interval,
  price,
  detail,
}: Readonly<{
  interval: "monthly" | "yearly";
  price: string;
  detail: string;
}>) {
  return (
    <form action={createBillingCheckoutAction} className="rounded-lg border border-border bg-surface-muted p-3">
      <input name="interval" type="hidden" value={interval} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{interval === "monthly" ? "Monthly" : "Yearly"}</p>
          <p className="mt-1 text-sm text-foreground/58">{detail}</p>
        </div>
        <p className="text-lg font-semibold text-foreground">{price}</p>
      </div>
      <button className="button-secondary mt-3 w-full" type="submit">
        Choose {interval === "monthly" ? "monthly" : "yearly"}
      </button>
    </form>
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
  const billingStatus = getBillingStatusLabel(typedProfile);
  const renewalLabel = getBillingRenewalLabel(typedProfile);
  const hasPremium = isPremiumStatus(typedProfile?.stripe_subscription_status);
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
            <form action={updateProfileAction} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="field-label">First name</span>
                  <input className="field-input" type="text" name="firstName" defaultValue={typedProfile?.first_name ?? ""} autoComplete="given-name" required />
                </label>
                <label className="grid gap-2">
                  <span className="field-label">Last name</span>
                  <input className="field-input" type="text" name="lastName" defaultValue={typedProfile?.last_name ?? ""} autoComplete="family-name" required />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="field-label">Phone number</span>
                <PhoneNumberInput defaultValue={typedProfile?.phone_number ?? ""} name="phoneNumber" placeholder="(415) 555-0132" />
              </label>

              <div className="rounded-lg border border-border/85 bg-surface-muted px-3.5 py-3.5">
                <AddressFields
                  initialAddressLine1={typedProfile?.billing_address_line1 ?? ""}
                  initialAddressLine2={typedProfile?.billing_address_line2 ?? ""}
                  initialCity={typedProfile?.billing_city ?? ""}
                  initialRegion={typedProfile?.billing_region ?? ""}
                  initialPostalCode={typedProfile?.billing_postal_code ?? ""}
                  initialCountry={getDefaultCountry(typedProfile?.billing_country)}
                />
              </div>

              <button className="button-primary w-fit" type="submit">Save profile</button>
            </form>
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup id="billing" title="Billing">
          <SettingsRow>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">{hasPremium ? `${billingPlan.name} plan` : "Free plan"}</p>
                <p className="mt-1 text-sm text-foreground/58">
                  {renewalLabel ? `${typedProfile?.stripe_cancel_at_period_end ? "Ends" : "Renews"} ${renewalLabel}` : "Upgrade when you are ready."}
                </p>
              </div>
              <StatusBadge active={hasPremium} label={billingStatus} />
            </div>
          </SettingsRow>
          <SettingsRow>
            <div className="grid gap-3 md:grid-cols-2">
              <BillingChoice interval="monthly" price={`${billingPlan.monthlyPrice}/mo`} detail="Flexible monthly billing." />
              <BillingChoice interval="yearly" price={`${billingPlan.yearlyPrice}/yr`} detail={`${billingPlan.yearlySavings} with annual billing.`} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={createBillingPortalAction}>
                <button className="button-secondary" type="submit" disabled={!canManageBilling}>
                  Manage billing
                </button>
              </form>
              {!canManageBilling ? (
                <p className="text-sm text-foreground/58">Management appears here after Stripe Checkout creates a customer for this account.</p>
              ) : null}
            </div>
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <SettingsRow>
            <ThemeSettingRow />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="Security">
          <SettingsRow>
            <form action={updateAccountEmailAction} className="grid gap-3">
              <label className="grid gap-2">
                <span className="field-label">Email</span>
                <input className="field-input" type="email" name="email" defaultValue={user.email ?? ""} autoComplete="email" required />
              </label>
              <button className="button-secondary w-fit" type="submit">Update email</button>
            </form>
          </SettingsRow>
          <SettingsRow>
            <form action={updateAccountPasswordAction} className="grid gap-3 sm:max-w-xl">
              <label className="grid gap-2">
                <span className="field-label">New password</span>
                <input className="field-input" type="password" name="password" autoComplete="new-password" minLength={8} required />
              </label>
              <label className="grid gap-2">
                <span className="field-label">Confirm password</span>
                <input className="field-input" type="password" name="confirmPassword" autoComplete="new-password" minLength={8} required />
              </label>
              <button className="button-secondary w-fit" type="submit">Update password</button>
            </form>
          </SettingsRow>
        </SettingsGroup>
      </div>
    </AppShell>
  );
}
