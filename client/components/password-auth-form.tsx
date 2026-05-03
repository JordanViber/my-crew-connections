"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { PasswordInput } from "@/components/password-input";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function PasswordAuthForm({
  stackAvailable,
  nextPath,
}: Readonly<{
  stackAvailable: boolean;
  nextPath: string;
}>) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      setErrorMessage(null);
      setStatusMessage(null);

      if (!stackAvailable) {
        setErrorMessage("Sign-in is temporarily unavailable. Try again in a moment.");
        return;
      }

      const normalizedIdentifier = identifier.trim();
      if (!normalizedIdentifier || !password) {
        setErrorMessage("Enter your email or phone number and password.");
        return;
      }

      try {
        const response = await fetch("/auth/password", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            identifier: normalizedIdentifier,
            password,
          }),
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: string } | null;
          setErrorMessage(result?.error ?? "Invalid email, phone, or password.");
          return;
        }

        const supabase = createBrowserSupabaseClient();
        const factorsResult = await supabase.auth.mfa.listFactors();
        const passkeyFactor = factorsResult.data?.all.find((factor) => factor.factor_type === "webauthn" && factor.status === "verified");

        if (passkeyFactor) {
          const verifyResult = await supabase.auth.mfa.webauthn.authenticate({
            factorId: passkeyFactor.id,
          });

          if (verifyResult.error) {
            setErrorMessage(`Password accepted, but passkey verification failed: ${verifyResult.error.message}`);
            return;
          }

          setStatusMessage("Passkey verified.");
        }

        router.replace(nextPath);
        router.refresh();
        return;
      } catch {
        setErrorMessage("We couldn't reach the sign-in service. Try again in a moment.");
        return;
      }
    });
  }

  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="grid gap-2">
        <span className="field-label">Email or phone</span>
        <input
          autoComplete="username"
          className="field-input"
          type="text"
          name="identifier"
          placeholder="Email or phone"
          required
          disabled={isPending}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
      </label>

      <label className="grid gap-2">
        <span className="field-label">Password</span>
        <PasswordInput
          autoComplete="current-password"
          className="field-input"
          name="password"
          placeholder="Enter your password"
          required
          disabled={isPending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {statusMessage ? (
        <p className="rounded-lg bg-mint px-3 py-2.5 text-sm font-medium text-[#214c35]">{statusMessage}</p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg bg-[#f8d2ca] px-3 py-2.5 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </button>
        <Link className="button-secondary" href="/auth/reset">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
