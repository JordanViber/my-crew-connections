"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AddressFields } from "@/components/address-fields";
import { PhoneNumberInput } from "@/components/phone-number-input";
import { getDefaultCountry, normalizePhoneNumberForStorage } from "@/lib/account-fields";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function CreateAccountForm({
  nextPath,
  stackAvailable,
  preferLocalHelper,
}: Readonly<{
  nextPath: string;
  stackAvailable: boolean;
  preferLocalHelper: boolean;
}>) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  function getValue(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      setErrorMessage(null);

      if (!stackAvailable) {
        setErrorMessage("Account creation is temporarily unavailable. Try again when the sign-in service is reachable.");
        return;
      }

      const firstName = getValue(formData, "firstName");
      const lastName = getValue(formData, "lastName");
      const phoneNumber = normalizePhoneNumberForStorage(getValue(formData, "phoneNumber"));
      const normalizedEmail = getValue(formData, "email");
      const addressLine1 = getValue(formData, "addressLine1");
      const addressLine2 = getValue(formData, "addressLine2");
      const city = getValue(formData, "city");
      const region = getValue(formData, "region");
      const postalCode = getValue(formData, "postalCode");
      const country = getDefaultCountry(getValue(formData, "country"));

      if (!firstName || !lastName || !normalizedEmail || !password) {
        setErrorMessage("Enter your name, email, and password to create an account.");
        return;
      }

      if (password.length < 8) {
        setErrorMessage("Use a password with at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("Passwords must match.");
        return;
      }

      const payload = {
        firstName,
        lastName,
        phoneNumber,
        email: normalizedEmail,
        password,
        addressLine1,
        addressLine2,
        city,
        region,
        postalCode,
        country,
      };

      if (preferLocalHelper) {
        try {
          const response = await fetch("/auth/dev-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const result = (await response.json()) as { error?: string };

          if (!response.ok) {
            setErrorMessage(result.error ?? "Failed to create the account on this local stack.");
            return;
          }

          const supabase = createBrowserSupabaseClient();
          const { error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (error) {
            setErrorMessage(error.message);
            return;
          }

          router.replace(nextPath);
          router.refresh();
          return;
        } catch {
          setErrorMessage("Could not reach the local account service. Make sure the local stack is running, then try again.");
          return;
        }
      }

      const supabase = createBrowserSupabaseClient();
      const displayName = `${payload.firstName} ${payload.lastName}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            display_name: displayName,
            first_name: payload.firstName,
            last_name: payload.lastName,
            phone_number: payload.phoneNumber || null,
            billing_address_line1: payload.addressLine1 || null,
            billing_address_line2: payload.addressLine2 || null,
            billing_city: payload.city || null,
            billing_region: payload.region || null,
            billing_postal_code: payload.postalCode || null,
            billing_country: payload.country || null,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      router.replace(`/auth?created=1&next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    });
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">First name</span>
          <input className="field-input" type="text" name="firstName" autoComplete="given-name" required disabled={isPending} />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Last name</span>
          <input className="field-input" type="text" name="lastName" autoComplete="family-name" required disabled={isPending} />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="field-label">Phone number</span>
        <PhoneNumberInput name="phoneNumber" disabled={isPending} placeholder="(415) 555-0132" />
        <span className="text-sm leading-6 text-foreground/60">Optional. You can add or change it later in settings.</span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 sm:col-span-2">
          <span className="field-label">Email</span>
          <input className="field-input" type="email" name="email" autoComplete="email" placeholder="you@example.com" required disabled={isPending} />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Password</span>
          <input className="field-input" type="password" name="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isPending} />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Confirm password</span>
          <input className="field-input" type="password" name="confirmPassword" autoComplete="new-password" placeholder="Repeat your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isPending} />
        </label>
      </div>

      {confirmPassword.length > 0 ? (
        <p className={passwordsMatch ? "rounded-lg bg-[#d7efe2] px-3 py-2.5 text-sm font-medium text-[#184a3a]" : "rounded-lg bg-[rgba(29,36,40,0.06)] px-3 py-2.5 text-sm font-medium text-foreground/70"}>
          {passwordsMatch ? "Passwords match." : "Passwords do not match yet."}
        </p>
      ) : null}

      <div className="rounded-lg border border-border/85 bg-white/66 px-3.5 py-3.5 md:px-4 md:py-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">Mailing address</p>
          <p className="mt-1 text-sm leading-6 text-foreground/68">Optional for now. Start with your street address if you want the rest filled in automatically.</p>
        </div>
        <AddressFields disabled={isPending} initialCountry={getDefaultCountry(undefined)} />
      </div>

      {errorMessage ? (
        <p className="rounded-lg bg-[#f8d2ca] px-3 py-2.5 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Creating account..." : "Create account"}
        </button>
        <Link className="button-secondary" href="/auth">
          I already have an account
        </Link>
      </div>
    </form>
  );
}
