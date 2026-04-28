"use client";

import { useRouter } from "next/navigation";
import { type ComponentProps, useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function MagicLinkForm({
  stackAvailable,
  nextPath,
}: Readonly<{
  stackAvailable: boolean;
  nextPath: string;
}>) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");

    if (typeof email !== "string" || email.trim().length === 0) {
      setErrorMessage("Enter an email address first.");
      return;
    }

    if (!stackAvailable) {
      setErrorMessage("Email sign-in is temporarily unavailable. Try again in a moment.");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);

      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${globalThis.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`;
      try {
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

        router.replace(`/auth?sent=1&next=${encodeURIComponent(nextPath)}`);
        router.refresh();
        return;
      } catch {
        setErrorMessage("We couldn’t reach the email sign-in service. Try again in a moment.");
        return;
      }
    });
  };

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
        {isPending ? "Sending sign-in link..." : "Email me a sign-in link"}
      </button>
    </form>
  );
}
