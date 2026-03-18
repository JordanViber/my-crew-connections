"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "prepare";

export function PasswordAuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(mode: Mode) {
    startTransition(async () => {
      setErrorMessage(null);

      const normalizedEmail = email.trim();
      if (!normalizedEmail || !password) {
        setErrorMessage("Enter both email and password.");
        return;
      }

      if (mode === "prepare") {
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
          return;
        }

        router.replace("/auth?prepared=1");
        router.refresh();
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mt-6 grid gap-4">
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
          placeholder="Choose a local-only password"
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
        <button className="button-primary" type="button" disabled={isPending} onClick={() => submit("sign-in")}> 
          {isPending ? "Working..." : "Sign in"}
        </button>
        <button className="button-secondary" type="button" disabled={isPending} onClick={() => submit("prepare")}> 
          {isPending ? "Working..." : "Create or reset local account"}
        </button>
      </div>
    </div>
  );
}