import { redirect } from "next/navigation";
import { AddressFields } from "@/components/address-fields";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PhoneNumberInput } from "@/components/phone-number-input";
import { SectionCard } from "@/components/section-card";
import { getFeedback } from "@/lib/feedback";
import { getDefaultCountry } from "@/lib/account-fields";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateAccountEmailAction, updateAccountPasswordAction, updateProfileAction } from "@/app/actions";

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
};

function hasValue(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function getProfileCompletion(profile: ProfileRecord | null, email?: string | null) {
  const total = 7;
  const complete = [
    profile?.first_name,
    profile?.last_name,
    email,
    profile?.phone_number,
    profile?.billing_address_line1,
    profile?.billing_city,
    profile?.billing_country,
  ].filter(hasValue).length;

  return Math.round((complete / total) * 100);
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "display_name, first_name, last_name, phone_number, billing_address_line1, billing_address_line2, billing_city, billing_region, billing_postal_code, billing_country",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  const feedback = getFeedback(params.feedback);
  const displayName = profile?.display_name
    ?? (`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || user.email?.split("@")[0] || "Your account");
  const profileCompletion = getProfileCompletion(profile, user.email);

  return (
    <AppShell
      title="Account settings"
      subtitle="Manage your profile, security, and mailing details."
      email={user.email ?? "Signed in"}
    >
      {feedback ? (
        <div className="mb-4">
          <FeedbackBanner title={feedback.title} body={feedback.body} tone={feedback.tone} />
        </div>
      ) : null}

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid gap-4">
          <section className="section-card rounded-[1.45rem] p-4 md:p-5">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-accent-strong">Account snapshot</p>
            <h2 className="mt-3 text-[1.45rem] font-semibold tracking-tight text-foreground">{displayName}</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/68">{user.email ?? "No email on file"}</p>

            <div className="mt-4 rounded-[1.2rem] border border-border/85 bg-white/82 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-foreground">Profile completeness</p>
                <p className="text-sm font-semibold text-accent-strong">{profileCompletion}%</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[rgba(29,36,40,0.08)]">
                <div className="h-full rounded-full bg-[linear-gradient(135deg,#ef6b4a_0%,#b94224_100%)]" style={{ width: `${profileCompletion}%` }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/68">
                Complete the core profile once so invites, receipts, and account updates all stay consistent.
              </p>
            </div>

            <div className="mt-4 grid gap-3 text-sm leading-6 text-foreground/72">
              <div className="rounded-[1.2rem] border border-border/85 bg-white/78 px-4 py-3">
                <p className="font-semibold text-foreground">Profile details</p>
                <p className="mt-2">Keep your name, phone number, and email details current in one place.</p>
              </div>
              <div className="rounded-[1.2rem] border border-border/85 bg-white/78 px-4 py-3">
                <p className="font-semibold text-foreground">Mailing address</p>
                <p className="mt-2">Search once, autofill the basics, and adjust anything that needs a manual touch.</p>
              </div>
            </div>
          </section>

          <SectionCard
            title="Security"
            description="Use this screen for the account details you want to keep stable over time."
          >
            <div className="grid gap-3 text-sm leading-6 text-foreground/72">
              <p>Update your email when it changes and rotate your password whenever you want a fresh sign-in.</p>
              <p>Apple sign-in is available from the auth screen, and additional premium sign-in methods can layer in from here over time.</p>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-4">
          <SectionCard
            title="Profile identity"
            description="Use your real name and contact details here so every future account surface starts from the same source of truth."
          >
            <form action={updateProfileAction} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="field-label">First name</span>
                  <input className="field-input" type="text" name="firstName" defaultValue={profile?.first_name ?? ""} autoComplete="given-name" required />
                </label>
                <label className="grid gap-2">
                  <span className="field-label">Last name</span>
                  <input className="field-input" type="text" name="lastName" defaultValue={profile?.last_name ?? ""} autoComplete="family-name" required />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="field-label">Phone number</span>
                <PhoneNumberInput defaultValue={profile?.phone_number ?? ""} name="phoneNumber" placeholder="(415) 555-0132" />
              </label>

              <div className="rounded-[1.5rem] border border-border/85 bg-white/66 px-4 py-4 md:px-5 md:py-5">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground">Mailing address</p>
                  <p className="mt-1 text-sm leading-6 text-foreground/68">Start with the street address and the rest can fill in automatically.</p>
                </div>
                <AddressFields
                  initialAddressLine1={profile?.billing_address_line1 ?? ""}
                  initialAddressLine2={profile?.billing_address_line2 ?? ""}
                  initialCity={profile?.billing_city ?? ""}
                  initialRegion={profile?.billing_region ?? ""}
                  initialPostalCode={profile?.billing_postal_code ?? ""}
                  initialCountry={getDefaultCountry(profile?.billing_country)}
                />
              </div>

              <button className="button-primary w-fit" type="submit">Save profile</button>
            </form>
          </SectionCard>

          <SectionCard
            title="Sign-in email"
            description="Change the address tied to this account without leaving the product."
          >
            <form action={updateAccountEmailAction} className="grid gap-4">
              <label className="grid gap-2">
                <span className="field-label">Email</span>
                <input className="field-input" type="email" name="email" defaultValue={user.email ?? ""} autoComplete="email" required />
              </label>
              <p className="text-sm leading-6 text-foreground/68">If confirmation is required, complete the change from the message sent to your new address.</p>
              <button className="button-secondary w-fit" type="submit">Update email</button>
            </form>
          </SectionCard>

          <SectionCard
            title="Password"
            description="Set a new password whenever you want a cleaner, more secure sign-in."
          >
            <form action={updateAccountPasswordAction} className="grid gap-4 sm:max-w-xl">
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
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}