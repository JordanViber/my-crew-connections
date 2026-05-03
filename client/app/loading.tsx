"use client";

import { useEffect, useState } from "react";

export default function AppLoading() {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setShowOverlay(true), 1000);
    return () => globalThis.clearTimeout(timer);
  }, []);

  if (!showOverlay) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/18 px-6 backdrop-blur-[1.5px]">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-white/90 px-4 py-3 text-center shadow-[0_16px_36px_rgba(31,44,49,0.12)]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground/78">Loading...</p>
      </div>
    </div>
  );
}
