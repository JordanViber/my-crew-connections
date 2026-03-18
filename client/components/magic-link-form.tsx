"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function MagicLinkForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");

    if (typeof email !== "string" || email.trim().length === 0) {
      setErrorMessage("Enter an email address first.");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);

      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.replace("/auth?sent=1");
      router.refresh();
    });
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2">
        <span className="field-label">Email</span>
        <input
          autoComplete="email"
          className="field-input"
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          disabled={isPending}
        />
      </label>

      {errorMessage ? (
        <p className="rounded-2xl bg-[#f8d2ca] px-4 py-3 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
      ) : null}

      <button className="button-primary mt-2" type="submit" disabled={isPending}>
        {isPending ? "Sending magic link..." : "Email me the magic link"}
      </button>
    </form>
  );
}