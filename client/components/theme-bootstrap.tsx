"use client";

import { useEffect } from "react";

const storageKey = "mcc-theme";

export function ThemeBootstrap() {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      const theme = stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  return null;
}