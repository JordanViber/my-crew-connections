"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const emailOtpTypes = ["email", "magiclink"] as const;

export function MagicLinkForm({
  stackAvailable,
  nextPath,
}: Readonly<{
  stackAvailable: boolean;
  nextPath: string;
}>) {
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function requestCode() {
    startTransition(async () => {
      setErrorMessage(null);
      setStatusMessage(null);

      const trimmedEmail = emailAddress.trim();

      if (!trimmedEmail) {
        setErrorMessage("Enter an email address first.");
        return;
      }

      if (!stackAvailable) {
        setErrorMessage("Email sign-in is temporarily unavailable. Try again in a moment.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${globalThis.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`;

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: redirectTo,
            shouldCreateUser: false,
          },
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setSubmittedEmail(trimmedEmail);
        setVerificationCode("");
        setStatusMessage("A sign-in email is on the way. Enter the code from that email here, or open the sign-in link if you prefer.");
      } catch {
        setErrorMessage("We couldn't reach the email sign-in service. Try again in a moment.");
      }
    });
  }

  function verifyCode() {
    startTransition(async () => {
      setErrorMessage(null);
      setStatusMessage(null);

      if (!submittedEmail) {
        setErrorMessage("Request a sign-in code first.");
        return;
      }

      const trimmedCode = verificationCode.trim();

      if (!trimmedCode) {
        setErrorMessage("Enter the code from your email.");
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        let lastError: { message: string } | null = null;

        for (const type of emailOtpTypes) {
          const { error } = await supabase.auth.verifyOtp({
            email: submittedEmail,
            token: trimmedCode,
            type,
          });

          if (!error) {
            router.replace(nextPath);
            router.refresh();
            return;
          }

          lastError = error;
        }

        setErrorMessage(lastError?.message ?? "We couldn't verify that code right now. Try again in a moment.");
      } catch {
        setErrorMessage("We couldn't verify that code right now. Try again in a moment.");
      }
    });
  }

  return (
    <div className="mt-4 grid gap-3">
      <label className="grid gap-2">
        <span className="field-label">Email</span>
        <input
          autoComplete="email"
          className="field-input"
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          disabled={isPending || Boolean(submittedEmail)}
          onChange={(event) => setEmailAddress(event.target.value)}
          value={emailAddress}
        />
      </label>

      {submittedEmail ? (
        <label className="grid gap-2">
          <span className="field-label">Verification code</span>
          <input
            autoComplete="one-time-code"
            className="field-input"
            inputMode="numeric"
            maxLength={6}
            name="verificationCode"
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
        {submittedEmail ? (
          <>
            <button className="button-primary" disabled={isPending} onClick={verifyCode} type="button">
              {isPending ? "Verifying code..." : "Verify code"}
            </button>
            <button className="button-secondary" disabled={isPending} onClick={requestCode} type="button">
              Send a new code
            </button>
            <button
              className="button-secondary"
              disabled={isPending}
              onClick={() => {
                setSubmittedEmail(null);
                setVerificationCode("");
                setStatusMessage(null);
                setErrorMessage(null);
              }}
              type="button"
            >
              Use a different email
            </button>
          </>
        ) : (
          <button className="button-primary w-fit" type="button" disabled={isPending} onClick={requestCode}>
            {isPending ? "Sending code..." : "Email me a code"}
          </button>
        )}
      </div>
    </div>
  );
}
