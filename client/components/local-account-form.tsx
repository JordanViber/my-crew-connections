"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LocalAccountForm({
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
        setErrorMessage("Local sign-in services are offline. Start the local stack, then try again.");
        return;
      }

      const normalizedEmail = email.trim();
      if (!normalizedEmail || !password) {
        setErrorMessage("Enter both email and password.");
        return;
      }

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
          setErrorMessage(payload.error ?? "Failed to prepare the local account.");
          return;
        }

        router.replace(`/auth?prepared=1&next=${encodeURIComponent(nextPath)}`);
        router.refresh();
      } catch {
        setErrorMessage("Could not reach the local account helper. Check the app server and local services, then try again.");
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
          placeholder="Enter an email for this device"
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
          placeholder="Choose a password for this device"
          required
          disabled={isPending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {errorMessage ? (
        <p className="rounded-2xl bg-[#f8d2ca] px-4 py-3 text-sm font-medium text-[#7c291d]">{errorMessage}</p>
      ) : null}

      <button className="button-secondary w-fit" type="submit" disabled={isPending}>
        {isPending ? "Preparing local account..." : "Create account or reset password"}
      </button>
    </form>
  );
}