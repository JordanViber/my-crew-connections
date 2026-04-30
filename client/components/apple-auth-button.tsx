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
        className="button-secondary w-full gap-2 bg-white/86 text-foreground"
        disabled={isPending}
        onClick={signInWithApple}
        type="button"
      >
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.36 1.43c0 1.05-.43 2.04-1.08 2.77-.7.78-1.87 1.39-2.89 1.31-.13-1.01.38-2.07 1.01-2.78.7-.8 1.95-1.38 2.96-1.3ZM20.84 17.26c-.52 1.2-.77 1.74-1.44 2.8-.94 1.44-2.27 3.24-3.92 3.26-1.46.02-1.84-.95-3.83-.94-1.99 0-2.4.96-3.86.94-1.65-.02-2.91-1.64-3.85-3.08-2.63-4.02-2.9-8.74-1.28-11.25 1.15-1.78 2.97-2.82 4.68-2.82 1.74 0 2.83.96 4.27.96 1.4 0 2.25-.96 4.27-.96 1.53 0 3.15.83 4.3 2.27-3.78 2.07-3.17 7.47.66 8.82Z" />
        </svg>
        <span>{isPending ? "Opening Apple..." : label}</span>
      </button>

      {errorMessage ? (
        <p className="rounded-lg bg-[#f8d2ca] px-3 py-2.5 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
