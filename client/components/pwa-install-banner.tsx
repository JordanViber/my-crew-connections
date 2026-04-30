"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const dismissedStorageKey = "mcc-pwa-banner-dismissed-at";
const installedStorageKey = "mcc-pwa-installed";
const dismissWindowMs = 1000 * 60 * 60 * 24 * 14;

function isStandaloneDisplay() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator && Boolean(window.navigator.standalone));
}

function wasRecentlyDismissed() {
  const dismissedAt = Number(window.localStorage.getItem(dismissedStorageKey) ?? "0");
  return Boolean(dismissedAt && Date.now() - dismissedAt < dismissWindowMs);
}

function isProbablyIosSafari() {
  const userAgent = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(userAgent) && /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);
}

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (isStandaloneDisplay() || wasRecentlyDismissed()) {
      return undefined;
    }

    const storedInstalled = window.localStorage.getItem(installedStorageKey) === "1";
    const isIos = isProbablyIosSafari();

    window.setTimeout(() => {
      setInstalled(storedInstalled);
      setIosSafari(isIos);
      setShowIosSteps(isIos && !storedInstalled);
      setVisible(storedInstalled || isIos);
    }, 0);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      window.localStorage.setItem(installedStorageKey, "1");
      setInstalled(true);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app still works without a service worker; install/push UI stays passive.
    });
  }, []);

  const copy = useMemo(() => {
    if (installed) {
      return {
        title: "Open the app",
        body: "My Crew Connections is installed on this device.",
        action: "Open",
      };
    }

    if (iosSafari) {
      return {
        title: "Add to Home Screen",
        body: "Install this app from Safari's Share menu for faster access and a cleaner full-screen experience.",
        action: showIosSteps ? "Hide steps" : "Show me how",
      };
    }

    return {
      title: "Install the app",
      body: "Get faster access, full-screen mode, and notification support on this device.",
      action: "Install",
    };
  }, [installed, iosSafari, showIosSteps]);

  if (!visible) {
    return null;
  }

  async function handlePrimaryAction() {
    if (installed) {
      window.location.assign("/dashboard");
      return;
    }

    if (iosSafari) {
      setShowIosSteps((current) => !current);
      return;
    }

    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      window.localStorage.setItem(installedStorageKey, "1");
      setVisible(false);
    }

    setInstallPrompt(null);
  }

  function dismiss() {
    window.localStorage.setItem(dismissedStorageKey, String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="mx-auto mb-2 max-w-7xl rounded-lg border border-border bg-surface-strong px-3 py-2.5 shadow-[var(--shadow-tight)] md:mb-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-strong">
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{copy.title}</p>
          <p className="mt-0.5 text-sm leading-5 text-foreground/62">
            {copy.body}
          </p>
          {iosSafari && showIosSteps ? (
            <ol className="mt-2 grid gap-1.5 pl-5 text-sm leading-5 text-foreground/66">
              <li>Tap the Share button in Safari.</li>
              <li>Scroll down and choose Add to Home Screen.</li>
              <li>Confirm Add to keep My Crew Connections on your Home Screen.</li>
            </ol>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="button-primary button-compact" onClick={handlePrimaryAction} type="button">
              {copy.action}
            </button>
            <button className="button-secondary button-compact" onClick={dismiss} type="button">
              Not now
            </button>
          </div>
        </div>
        <button aria-label="Dismiss app install banner" className="theme-toggle h-8 w-8 shrink-0" onClick={dismiss} type="button">
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
