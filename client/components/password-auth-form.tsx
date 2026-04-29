"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { mapLocalPasswordSignInError } from "@/lib/auth-errors";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function PasswordAuthForm({
  stackAvailable,
  nextPath,
}: Readonly<{
  stackAvailable: boolean;
  nextPath: string;
}>) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      setErrorMessage(null);

      if (!stackAvailable) {
        setErrorMessage("Sign-in is temporarily unavailable. Try again in a moment.");
        return;
      }

      const normalizedEmail = email.trim();
      if (!normalizedEmail || !password) {
        setErrorMessage("Enter both email and password.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setErrorMessage(mapLocalPasswordSignInError(error.message));
          return;
        }

        router.replace(nextPath);
        router.refresh();
        return;
      } catch {
        setErrorMessage("We couldn't reach the sign-in service. Try again in a moment.");
        return;
      }
    });
  }

  return (
    <form
      className="mt-4 grid gap-3"
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
          type="email"
          name="email"
          placeholder="Enter your email"
          required
          disabled={isPending}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="grid gap-2">
        <span className="field-label">Password</span>
        <input
          autoComplete="current-password"
          className="field-input"
          type="password"
          name="password"
          placeholder="Enter your password"
          required
          disabled={isPending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {errorMessage ? (
        <p className="rounded-lg bg-[#f8d2ca] px-3 py-2.5 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </form>
  );
}
