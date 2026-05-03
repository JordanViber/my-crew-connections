"use client";

import { PrefetchLink } from "@/components/prefetch-link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const supportedOtpTypes = new Set(["email", "recovery", "invite", "email_change", "signup", "magiclink"]);

function isSupportedOtpType(value?: string): value is "email" | "recovery" | "invite" | "email_change" | "signup" | "magiclink" {
  return typeof value === "string" && supportedOtpTypes.has(value);
}

export function AuthConfirmContent({
  code,
  tokenHash,
  type,
  errorDescription,
  nextPath,
}: Readonly<{
  code?: string;
  tokenHash?: string;
  type?: string;
  errorDescription?: string;
  nextPath: string;
}>) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const signInHref = `/auth?next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      const supabase = createBrowserSupabaseClient();

      if (code) {
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
        return;
      }

      if (tokenHash && isSupportedOtpType(type)) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

        if (cancelled) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        router.replace(nextPath);
        router.refresh();
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setErrorMessage(errorDescription || "Missing authentication code.");
    }

    confirm();

    return () => {
      cancelled = true;
    };
  }, [code, errorDescription, nextPath, router, tokenHash, type]);

  return (
    <main className="shell flex items-center justify-center px-4 py-5 md:px-6">
      <div className="glass-panel grid max-w-3xl gap-4 p-5 text-center md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-strong">Signing you in</p>
        <h1 className="text-[2.1rem] font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
          Finishing your email sign-in.
        </h1>
        <p className="text-sm leading-7 text-foreground/72">
          Hold for a moment while the browser completes the email sign-in and redirects you into the app.
        </p>

        {errorMessage ? (
          <div className="section-card p-3.5 text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Sign-in failed</p>
            <p className="mt-2 text-sm leading-7 text-foreground/75">{errorMessage}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <PrefetchLink className="button-primary" href={signInHref}>
                Back to sign in
              </PrefetchLink>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
