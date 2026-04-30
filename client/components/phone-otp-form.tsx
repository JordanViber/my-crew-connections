"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PhoneNumberInput } from "@/components/phone-number-input";
import { normalizePhoneNumberForAuth } from "@/lib/account-fields";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function PhoneOtpForm({
  stackAvailable,
  nextPath,
}: Readonly<{
  stackAvailable: boolean;
  nextPath: string;
}>) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [submittedPhoneNumber, setSubmittedPhoneNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function requestCode() {
    startTransition(async () => {
      setErrorMessage(null);
      setStatusMessage(null);

      if (!stackAvailable) {
        setErrorMessage("Phone sign-in is temporarily unavailable. Try again in a moment.");
        return;
      }

      const normalizedPhoneNumber = normalizePhoneNumberForAuth(phoneNumber);

      if (!normalizedPhoneNumber) {
        setErrorMessage("Enter a phone number with a country code, or use a 10-digit US or Canada number.");
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase.auth.signInWithOtp({
          phone: normalizedPhoneNumber,
          options: {
            shouldCreateUser: false,
          },
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setSubmittedPhoneNumber(normalizedPhoneNumber);
        setVerificationCode("");
        setStatusMessage("A verification code is on the way to that phone number.");
      } catch {
        setErrorMessage("We couldn't reach the phone sign-in service. Try again in a moment.");
      }
    });
  }

  function verifyCode() {
    startTransition(async () => {
      setErrorMessage(null);
      setStatusMessage(null);

      if (!submittedPhoneNumber) {
        setErrorMessage("Request a verification code first.");
        return;
      }

      const trimmedCode = verificationCode.trim();

      if (!trimmedCode) {
        setErrorMessage("Enter the code you received by text.");
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase.auth.verifyOtp({
          phone: submittedPhoneNumber,
          token: trimmedCode,
          type: "sms",
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        router.replace(nextPath);
        router.refresh();
      } catch {
        setErrorMessage("We couldn't verify that code right now. Try again in a moment.");
      }
    });
  }

  return (
    <div className="mt-4 grid gap-3">
      <label className="grid gap-2">
        <span className="field-label">Phone number</span>
        <PhoneNumberInput
          name="phoneOtp"
          disabled={isPending || Boolean(submittedPhoneNumber)}
          onValueChange={setPhoneNumber}
          placeholder="(415) 555-0132"
          value={phoneNumber}
        />
      </label>

      {submittedPhoneNumber ? (
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
        {submittedPhoneNumber ? (
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
                setSubmittedPhoneNumber(null);
                setVerificationCode("");
                setStatusMessage(null);
                setErrorMessage(null);
              }}
              type="button"
            >
              Use a different number
            </button>
          </>
        ) : (
          <button className="button-primary w-fit" disabled={isPending} onClick={requestCode} type="button">
            {isPending ? "Sending code..." : "Text me a code"}
          </button>
        )}
      </div>
    </div>
  );
}