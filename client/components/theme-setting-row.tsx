"use client";

import { useSyncExternalStore } from "react";

type ThemePreference = "light" | "dark";

const storageKey = "mcc-theme";
const listeners = new Set<() => void>();

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

function getSnapshot(): ThemePreference {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(storageKey, theme);
  emitThemeChange();
}

export function ThemeSettingRow() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light");
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-foreground">Dark mode</p>
        <p className="mt-0.5 text-sm text-foreground/58">Use a darker interface on this device.</p>
      </div>
      <button
        aria-label="Toggle dark mode"
        aria-pressed={isDark}
        className={`relative h-7 w-12 rounded-full border transition shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] ${
          isDark ? "border-accent bg-accent" : "border-border-strong bg-[rgba(23,33,38,0.14)]"
        }`}
        onClick={() => applyTheme(isDark ? "light" : "dark")}
        type="button"
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(23,33,38,0.22)] transition ${isDark ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
