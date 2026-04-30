"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function PasswordUpdateForm({
  code,
}: Readonly<{
  code?: string;
}>) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function exchangeCode() {
      if (!code) {
        setErrorMessage("This reset link is missing its authentication code.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (cancelled) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setReady(true);
    }

    exchangeCode();

    return () => {
      cancelled = true;
    };
  }, [code]);

  function submit() {
    startTransition(async () => {
      setErrorMessage(null);

      if (password.length < 8) {
        setErrorMessage("Use a password with at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("Passwords must match.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.replace("/dashboard?feedback=password-updated");
      router.refresh();
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
      {!ready && !errorMessage ? (
        <p className="text-sm leading-6 text-foreground/68">Verifying your reset link...</p>
      ) : null}

      <label className="grid gap-2">
        <span className="field-label">New password</span>
        <input
          autoComplete="new-password"
          className="field-input"
          disabled={!ready || isPending}
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      <label className="grid gap-2">
        <span className="field-label">Confirm password</span>
        <input
          autoComplete="new-password"
          className="field-input"
          disabled={!ready || isPending}
          minLength={8}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </label>

      {errorMessage ? <p className="rounded-lg bg-[#f8d2ca] px-3 py-2.5 text-sm font-medium text-[#7c291d]">{errorMessage}</p> : null}

      <button className="button-primary w-fit" disabled={!ready || isPending} type="submit">
        {isPending ? "Saving password..." : "Save new password"}
      </button>
    </form>
  );
}
