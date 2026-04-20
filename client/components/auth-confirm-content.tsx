"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AuthConfirmContent({
  code,
  nextPath,
}: Readonly<{
  code?: string;
  nextPath: string;
}>) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      if (!code) {
        router.replace("/auth?error=Missing%20authentication%20code.");
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

      router.replace(nextPath);
      router.refresh();
    }

    confirm();

    return () => {
      cancelled = true;
    };
  }, [code, nextPath, router]);

  return (
    <main className="shell flex items-center justify-center px-4 py-6 md:px-8">
      <div className="glass-panel grid max-w-3xl gap-6 rounded-4xl p-6 text-center md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent-strong">Signing you in</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Finishing your magic-link sign-in.
        </h1>
        <p className="text-base leading-8 text-foreground/72">
          Hold for a moment while the browser completes the session exchange and redirects you into the app.
        </p>

        {errorMessage ? (
          <div className="section-card rounded-3xl p-6 text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Sign-in failed</p>
            <p className="mt-3 text-sm leading-7 text-foreground/75">{errorMessage}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="button-primary" href="/auth">
                Back to sign in
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
