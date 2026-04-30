"use client";

import { useState } from "react";
import { AddressFields } from "@/components/address-fields";
import { PhoneNumberInput } from "@/components/phone-number-input";
import { updateAccountEmailAction, updateAccountPasswordAction, updateProfileAction } from "@/app/actions";
import { getDefaultCountry } from "@/lib/account-fields";

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
}: Readonly<{
  email: string;
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

      <div className="grid gap-3 py-4 first:pt-0 last:pb-0">
        <div className="flex items-start justify-between gap-4">
          <SummaryLine label="Password" value="********" />
          <IconEditButton label="Edit password" onClick={() => setEditing(editing === "password" ? null : "password")} />
        </div>
        {editing === "password" ? (
          <form action={updateAccountPasswordAction} className="grid gap-3 sm:max-w-xl">
            <label className="grid gap-2">
              <span className="field-label">New password</span>
              <input className="field-input" type="password" name="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Confirm password</span>
              <input className="field-input" type="password" name="confirmPassword" autoComplete="new-password" minLength={8} required />
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
