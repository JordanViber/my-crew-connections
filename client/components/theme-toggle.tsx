"use client";

import { useSyncExternalStore } from "react";

type ThemePreference = "light" | "dark";

const storageKey = "mcc-theme";
const listeners = new Set<() => void>();

function getPreferredTheme(): ThemePreference {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(storageKey);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function emitThemeChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getThemeSnapshot(): ThemePreference {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ className = "" }: Readonly<{ className?: string }>) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "light");

  function toggleTheme() {
    const currentTheme = getPreferredTheme();
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
    emitThemeChange();
  }

  return (
    <button
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <g className="theme-toggle__sun" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.75v2.1M12 19.15v2.1M4.85 4.85l1.48 1.48M17.67 17.67l1.48 1.48M2.75 12h2.1M19.15 12h2.1M4.85 19.15l1.48-1.48M17.67 6.33l1.48-1.48" />
        </g>
        <path
          className="theme-toggle__moon"
          d="M20.2 14.1a7.6 7.6 0 0 1-10.3-10.3 8.6 8.6 0 1 0 10.3 10.3Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  );
}
