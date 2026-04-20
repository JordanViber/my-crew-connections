"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { mapLocalPasswordSignInError } from "@/lib/auth-errors";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "prepare";

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
  const [activeMode, setActiveMode] = useState<Mode | null>(null);

  function submit(mode: Mode) {
    startTransition(async () => {
      setActiveMode(mode);
      setErrorMessage(null);

      if (!stackAvailable) {
        setErrorMessage("Local Supabase is offline. Start Docker Desktop and the local Supabase stack first.");
        setActiveMode(null);
        return;
      }

      const normalizedEmail = email.trim();
      if (!normalizedEmail || !password) {
        setErrorMessage("Enter both email and password.");
        setActiveMode(null);
        return;
      }

      if (mode === "prepare") {
        try {
          const response = await fetch("/auth/dev-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: normalizedEmail, password }),
          });

          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            setErrorMessage(payload.error ?? "Failed to prepare local account.");
            setActiveMode(null);
            return;
          }

          router.replace(`/auth?prepared=1&next=${encodeURIComponent(nextPath)}`);
          router.refresh();
          return;
        } catch {
          setErrorMessage("Could not reach the local auth route. Check that the app server and local Supabase stack are running.");
          setActiveMode(null);
          return;
        }
      }

      const supabase = createBrowserSupabaseClient();
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setErrorMessage(mapLocalPasswordSignInError(error.message));
          setActiveMode(null);
          return;
        }

        router.replace(nextPath);
        router.refresh();
        return;
      } catch {
        setErrorMessage("Could not reach local Supabase. Start Docker Desktop and the local Supabase stack, then try again.");
        setActiveMode(null);
        return;
      }
    });
  }

  return (
    <form
      className="mt-6 grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit("sign-in");
      }}
    >
      <label className="grid gap-2">
        <span className="field-label">Email</span>
        <input
          autoComplete="email"
          className="field-input"
          type="email"
          name="email"
          placeholder="Enter your local account email"
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
          placeholder="Enter your local password"
          required
          disabled={isPending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {errorMessage ? (
        <p className="rounded-2xl bg-[#f8d2ca] px-4 py-3 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button className="button-primary" type="submit" disabled={isPending}>
          {isPending && activeMode === "sign-in" ? "Signing in..." : "Sign in"}
        </button>
        <button className="button-secondary" type="button" disabled={isPending} onClick={() => submit("prepare")}>
          {isPending && activeMode === "prepare" ? "Preparing account..." : "Create or reset local account"}
        </button>
      </div>
    </form>
  );
}
