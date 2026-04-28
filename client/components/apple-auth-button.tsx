"use client";

import { useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AppleAuthButton({
  nextPath,
  label = "Continue with Apple",
}: Readonly<{
  nextPath: string;
  label?: string;
}>) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function signInWithApple() {
    startTransition(async () => {
      setErrorMessage(null);

      const redirectTo = `${globalThis.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const supabase = createBrowserSupabaseClient();

      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (error || !data?.url) {
          setErrorMessage("Apple sign-in isn't available right now.");
          return;
        }

        globalThis.location.assign(data.url);
      } catch {
        setErrorMessage("Apple sign-in isn't available right now.");
      }
    });
  }

  return (
    <div className="grid gap-3">
      <button
        className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-border/85 bg-white px-5 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-foreground/18 hover:bg-white/96 disabled:cursor-default disabled:opacity-70"
        disabled={isPending}
        onClick={signInWithApple}
        type="button"
      >
        <span aria-hidden="true" className="text-base">Apple</span>
        <span>{isPending ? "Opening Apple..." : label}</span>
      </button>

      {errorMessage ? (
        <p className="rounded-2xl bg-[#f8d2ca] px-4 py-3 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
      ) : null}
    </div>
  );
}