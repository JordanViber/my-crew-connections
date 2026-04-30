"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      setMessage(null);
      setErrorMessage(null);

      const normalizedEmail = email.trim();

      if (!normalizedEmail) {
        setErrorMessage("Enter the email connected to your account.");
        return;
      }

      const redirectTo = `${globalThis.location.origin}/auth/update-password`;
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage("If that email has an account, a password reset link is on the way.");
    });
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="grid gap-2">
        <span className="field-label">Email</span>
        <input
          autoComplete="email"
          className="field-input"
          disabled={isPending}
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </label>

      {message ? <p className="rounded-lg bg-mint px-3 py-2.5 text-sm font-medium text-[#214c35]">{message}</p> : null}
      {errorMessage ? <p className="rounded-lg bg-[#f8d2ca] px-3 py-2.5 text-sm font-medium text-[#7c291d]">{errorMessage}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button className="button-primary" disabled={isPending} type="submit">
          {isPending ? "Sending reset link..." : "Send reset link"}
        </button>
        <Link className="button-secondary" href="/auth">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
