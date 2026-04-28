"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      setErrorMessage(null);

      if (!stackAvailable) {
        setErrorMessage("Account creation is temporarily unavailable. Try again when the sign-in service is reachable.");
        return;
      }

      const normalizedEmail = email.trim();

      if (!firstName.trim() || !lastName.trim() || !normalizedEmail || !password) {
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: normalizedEmail,
        password,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        region: region.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
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
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="field-label">First name</span>
          <input className="field-input" type="text" name="firstName" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required disabled={isPending} />
        </label>
        <label className="grid gap-2">
          <span className="field-label">Last name</span>
          <input className="field-input" type="text" name="lastName" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required disabled={isPending} />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="field-label">Phone number</span>
        <input className="field-input" type="tel" name="phoneNumber" autoComplete="tel" placeholder="Optional today, useful later for billing and support" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} disabled={isPending} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 sm:col-span-2">
          <span className="field-label">Email</span>
          <input className="field-input" type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isPending} />
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

      <details className="rounded-[1.2rem] border border-border/85 bg-white/66 px-4 py-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">Add billing-ready address details</summary>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2">
            <span className="field-label">Address line 1</span>
            <input className="field-input" type="text" name="addressLine1" autoComplete="address-line1" value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} disabled={isPending} />
          </label>
          <label className="grid gap-2">
            <span className="field-label">Address line 2</span>
            <input className="field-input" type="text" name="addressLine2" autoComplete="address-line2" value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} disabled={isPending} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="field-label">City</span>
              <input className="field-input" type="text" name="city" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} disabled={isPending} />
            </label>
            <label className="grid gap-2">
              <span className="field-label">State or region</span>
              <input className="field-input" type="text" name="region" autoComplete="address-level1" value={region} onChange={(event) => setRegion(event.target.value)} disabled={isPending} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="field-label">Postal code</span>
              <input className="field-input" type="text" name="postalCode" autoComplete="postal-code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} disabled={isPending} />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Country</span>
              <input className="field-input" type="text" name="country" autoComplete="country-name" value={country} onChange={(event) => setCountry(event.target.value)} disabled={isPending} />
            </label>
          </div>
        </div>
      </details>

      {errorMessage ? (
        <p className="rounded-2xl bg-[#f8d2ca] px-4 py-3 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
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