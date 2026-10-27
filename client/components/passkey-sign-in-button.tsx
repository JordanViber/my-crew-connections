"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { passkeySignInEnabled } from "@/lib/auth-features";
import { formatPasskeySetupError } from "@/lib/passkey-errors";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function PasskeySignInButton({
  nextPath,
  stackAvailable,
}: Readonly<{
  nextPath: string;
  stackAvailable: boolean;
}>) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (!passkeySignInEnabled) {
    return null;
  }

  async function signInWithPasskey() {
    setErrorMessage(null);

    if (!stackAvailable) {
      setErrorMessage("Sign-in is temporarily unavailable. Try again in a moment.");
      return;
    }

    if (globalThis.window === undefined || !("PublicKeyCredential" in globalThis.window)) {
      setErrorMessage("This browser or device does not support passkeys.");
      return;
    }

    setIsPending(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPasskey();

      if (error) {
        setErrorMessage(formatPasskeySetupError(error));
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Passkey sign-in failed.";
      setErrorMessage(formatPasskeySetupError({ message }));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        className="button-secondary w-full"
        disabled={!stackAvailable || isPending}
        onClick={() => void signInWithPasskey()}
        type="button"
      >
        {isPending ? "Waiting for passkey..." : "Sign in with a passkey"}
      </button>

      {errorMessage ? (
        <p className="rounded-lg bg-[#f8d2ca] px-3 py-2.5 text-sm font-medium text-[#7c291d]" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
