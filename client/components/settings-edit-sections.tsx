"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddressFields } from "@/components/address-fields";
import { PasswordInput } from "@/components/password-input";
import { PhoneNumberInput } from "@/components/phone-number-input";
import { updateAccountEmailAction, updateAccountPasswordAction, updateProfileAction } from "@/app/actions";
import { formatPhoneNumberForDisplay, getDefaultCountry, normalizePhoneNumberForAuth } from "@/lib/account-fields";
import { phoneAuthEnabled } from "@/lib/auth-features";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type EditableProfile = {
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

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function IconEditButton({
  label,
  onClick,
}: Readonly<{
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      aria-label={label}
      className="theme-toggle h-9 w-9 shrink-0"
      onClick={onClick}
      type="button"
    >
      <EditIcon />
    </button>
  );
}

function SummaryLine({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="mt-1 text-sm font-medium leading-6 text-foreground">{value}</p>
    </div>
  );
}

function formatName(profile: EditableProfile, fallback: string) {
  return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || fallback;
}

function formatAddress(profile: EditableProfile) {
  const cityLine = [profile.billing_city, profile.billing_region, profile.billing_postal_code]
    .filter(Boolean)
    .join(", ");
  const lines = [
    profile.billing_address_line1,
    profile.billing_address_line2,
    cityLine,
    profile.billing_country,
  ].filter(Boolean);

  return lines.length ? lines.join(" / ") : "No address saved";
}

export function AccountSettingsEditor({
  profile,
  displayName,
}: Readonly<{
  profile: EditableProfile | null;
  displayName: string;
}>) {
  const [isEditing, setIsEditing] = useState(false);
  const safeProfile = profile ?? {
    first_name: "",
    last_name: "",
    phone_number: "",
    billing_address_line1: "",
    billing_address_line2: "",
    billing_city: "",
    billing_region: "",
    billing_postal_code: "",
    billing_country: getDefaultCountry(),
  };

  if (!isEditing) {
    return (
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-3">
            <SummaryLine label="Name" value={formatName(safeProfile, displayName)} />
            <SummaryLine label="Phone" value={safeProfile.phone_number || "No phone saved"} />
            <SummaryLine label="Address" value={formatAddress(safeProfile)} />
          </div>
          <IconEditButton label="Edit profile" onClick={() => setIsEditing(true)} />
        </div>
      </div>
    );
  }

  return (
    <form action={updateProfileAction} className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-foreground">Edit profile</p>
        <button className="button-secondary button-compact" onClick={() => setIsEditing(false)} type="button">
          Cancel
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">First name</span>
          <input className="field-input" type="text" name="firstName" defaultValue={safeProfile.first_name ?? ""} autoComplete="given-name" required />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Last name</span>
          <input className="field-input" type="text" name="lastName" defaultValue={safeProfile.last_name ?? ""} autoComplete="family-name" required />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="field-label">Phone number</span>
        <PhoneNumberInput defaultValue={safeProfile.phone_number ?? ""} name="phoneNumber" placeholder="(415) 555-0132" />
      </label>

      <div className="rounded-lg border border-border/85 bg-surface-muted px-3.5 py-3.5">
        <AddressFields
          initialAddressLine1={safeProfile.billing_address_line1 ?? ""}
          initialAddressLine2={safeProfile.billing_address_line2 ?? ""}
          initialCity={safeProfile.billing_city ?? ""}
          initialRegion={safeProfile.billing_region ?? ""}
          initialPostalCode={safeProfile.billing_postal_code ?? ""}
          initialCountry={getDefaultCountry(safeProfile.billing_country)}
        />
      </div>

      <button className="button-primary w-fit" type="submit">
        <CheckIcon />
        <span className="ml-2">Save profile</span>
      </button>
    </form>
  );
}

export function SecuritySettingsEditor({
  email,
  profilePhoneNumber,
  authPhoneNumber,
  authPhoneConfirmedAt,
}: Readonly<{
  email: string;
  profilePhoneNumber: string | null;
  authPhoneNumber: string | null;
  authPhoneConfirmedAt: string | null;
}>) {
  const [editing, setEditing] = useState<"email" | "password" | null>(null);

  return (
    <div className="grid divide-y divide-border/70">
      <div className="grid gap-3 py-4 first:pt-0 last:pb-0">
        <div className="flex items-start justify-between gap-4">
          <SummaryLine label="Email" value={email} />
          <IconEditButton label="Edit email" onClick={() => setEditing(editing === "email" ? null : "email")} />
        </div>
        {editing === "email" ? (
          <form action={updateAccountEmailAction} className="grid gap-3 sm:max-w-xl">
            <label className="grid gap-2">
              <span className="field-label">New email</span>
              <input className="field-input" type="email" name="email" defaultValue={email} autoComplete="email" required />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="button-primary" type="submit">Save email</button>
              <button className="button-secondary" onClick={() => setEditing(null)} type="button">Cancel</button>
            </div>
          </form>
        ) : null}
      </div>

      {phoneAuthEnabled ? (
        <PhoneSignInSettingsRow
          authPhoneConfirmedAt={authPhoneConfirmedAt}
          authPhoneNumber={authPhoneNumber}
          profilePhoneNumber={profilePhoneNumber}
        />
      ) : null}

      <div className="grid gap-3 py-4 first:pt-0 last:pb-0">
        <div className="flex items-start justify-between gap-4">
          <SummaryLine label="Password" value="********" />
          <IconEditButton label="Edit password" onClick={() => setEditing(editing === "password" ? null : "password")} />
        </div>
        {editing === "password" ? (
          <form action={updateAccountPasswordAction} className="grid gap-3 sm:max-w-xl">
            <label className="grid gap-2">
              <span className="field-label">New password</span>
              <PasswordInput className="field-input" name="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Confirm password</span>
              <PasswordInput className="field-input" name="confirmPassword" autoComplete="new-password" minLength={8} required />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="button-primary" type="submit">Save password</button>
              <button className="button-secondary" onClick={() => setEditing(null)} type="button">Cancel</button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function PhoneSignInSettingsRow({
  profilePhoneNumber,
  authPhoneNumber,
  authPhoneConfirmedAt,
}: Readonly<{
  profilePhoneNumber: string | null;
  authPhoneNumber: string | null;
  authPhoneConfirmedAt: string | null;
}>) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(authPhoneNumber ?? profilePhoneNumber ?? "");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const verifiedPhoneValue = authPhoneNumber
    ? `${formatPhoneNumberForDisplay(authPhoneNumber)}${authPhoneConfirmedAt ? " (verified)" : " (verification pending)"}`
    : profilePhoneNumber
      ? `${formatPhoneNumberForDisplay(profilePhoneNumber)} saved to your profile`
      : "No phone sign-in configured";

  function resetEditor() {
    setEditing(false);
    setPhoneNumber(authPhoneNumber ?? profilePhoneNumber ?? "");
    setVerificationCode("");
    setPendingPhoneNumber(null);
    setErrorMessage(null);
    setStatusMessage(null);
  }

  async function sendVerificationCode() {
    setErrorMessage(null);
    setStatusMessage(null);

    const normalizedPhoneNumber = normalizePhoneNumberForAuth(phoneNumber);

    if (!normalizedPhoneNumber) {
      setErrorMessage("Enter a phone number with a country code, or use a 10-digit US or Canada number.");
      return;
    }

    const currentAuthPhone = normalizePhoneNumberForAuth(authPhoneNumber ?? "");

    if (authPhoneConfirmedAt && currentAuthPhone === normalizedPhoneNumber) {
      setStatusMessage("That phone number is already verified for text-message sign-in.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ phone: normalizedPhoneNumber });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPendingPhoneNumber(normalizedPhoneNumber);
    setVerificationCode("");
    setStatusMessage("We sent a verification code to that phone number.");
  }

  async function verifyPhoneNumber() {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!pendingPhoneNumber) {
      setErrorMessage("Send a verification code first.");
      return;
    }

    const trimmedCode = verificationCode.trim();

    if (!trimmedCode) {
      setErrorMessage("Enter the verification code you received by text.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: pendingPhoneNumber,
      token: trimmedCode,
      type: "phone_change",
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace("/settings?feedback=phone-auth-enabled");
    router.refresh();
  }

  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <SummaryLine label="Phone sign-in" value={verifiedPhoneValue} />
        <IconEditButton label="Edit phone sign-in" onClick={() => setEditing((value) => !value)} />
      </div>
      {editing ? (
        <div className="grid gap-3 sm:max-w-xl">
          <p className="text-sm leading-6 text-foreground/62">
            Verify a phone number here to let Supabase send sign-in codes and support direct phone plus password sign-in.
          </p>
          <label className="grid gap-2">
            <span className="field-label">Phone number</span>
            <PhoneNumberInput
              defaultValue=""
              disabled={Boolean(pendingPhoneNumber)}
              name="phoneAuthNumber"
              onValueChange={setPhoneNumber}
              placeholder="(415) 555-0132"
              value={phoneNumber}
            />
          </label>

          {pendingPhoneNumber ? (
            <label className="grid gap-2">
              <span className="field-label">Verification code</span>
              <input
                autoComplete="one-time-code"
                className="field-input"
                inputMode="numeric"
                maxLength={6}
                name="phoneAuthCode"
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="6-digit code"
                type="text"
                value={verificationCode}
              />
            </label>
          ) : null}

          {statusMessage ? (
            <p className="rounded-lg bg-mint px-3 py-2.5 text-sm font-medium text-[#214c35]">{statusMessage}</p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg bg-[#f8d2ca] px-3 py-2.5 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {pendingPhoneNumber ? (
              <>
                <button className="button-primary" onClick={() => void verifyPhoneNumber()} type="button">Verify phone</button>
                <button className="button-secondary" onClick={() => void sendVerificationCode()} type="button">Send a new code</button>
                <button
                  className="button-secondary"
                  onClick={() => {
                    setPendingPhoneNumber(null);
                    setVerificationCode("");
                    setErrorMessage(null);
                    setStatusMessage(null);
                  }}
                  type="button"
                >
                  Use a different number
                </button>
              </>
            ) : (
              <button className="button-primary" onClick={() => void sendVerificationCode()} type="button">Send verification code</button>
            )}
            <button className="button-secondary" onClick={resetEditor} type="button">Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
