"use client";

import { useEffect, useMemo, useState } from "react";
import { getPushEnvironment } from "@/lib/pwa-client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const dismissedStorageKey = "mcc-pwa-banner-dismissed-at";
const installedStorageKey = "mcc-pwa-installed";
const dismissWindowMs = 1000 * 60 * 60 * 24 * 14;

function isStandaloneDisplay() {
  return globalThis.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in globalThis.navigator && Boolean(globalThis.navigator.standalone));
}

function wasRecentlyDismissed() {
  const dismissedAt = Number(globalThis.localStorage.getItem(dismissedStorageKey) ?? "0");
  return Boolean(dismissedAt && Date.now() - dismissedAt < dismissWindowMs);
}

function isProbablyIosSafari() {
  const userAgent = globalThis.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(userAgent) && /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);
}

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);
  const [androidDevice, setAndroidDevice] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [showAndroidSteps, setShowAndroidSteps] = useState(false);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return undefined;
    }

    if (isStandaloneDisplay() || wasRecentlyDismissed()) {
      return undefined;
    }

    const storedInstalled = globalThis.localStorage.getItem(installedStorageKey) === "1";
    const isIos = isProbablyIosSafari();
    const environment = getPushEnvironment({ installPromptAvailable: false });

    globalThis.setTimeout(() => {
      setInstalled(storedInstalled);
      setIosSafari(isIos);
      setAndroidDevice(environment.deviceFamily === "android");
      setShowIosSteps(isIos && !storedInstalled);
      setVisible(storedInstalled || isIos || environment.deviceFamily === "android");
    }, 0);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      globalThis.localStorage.setItem(installedStorageKey, "1");
      setInstalled(true);
      setVisible(false);
    };

    globalThis.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    globalThis.addEventListener("appinstalled", handleInstalled);

    return () => {
      globalThis.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      globalThis.removeEventListener("appinstalled", handleInstalled);
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
        body: "My Crew Connections is installed on this device. Open it from your Home Screen or app drawer for the best notification experience.",
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

    if (androidDevice && !installPrompt) {
      return {
        title: "Install the app",
        body: "Android push works in supported browsers, but installing the app gives the most reliable full-screen and notification experience.",
        action: showAndroidSteps ? "Hide steps" : "Show me how",
      };
    }

    return {
      title: "Install the app",
      body: "Get faster access, full-screen mode, and the best notification support on this device.",
      action: "Install",
    };
  }, [androidDevice, installPrompt, installed, iosSafari, showAndroidSteps, showIosSteps]);

  if (!visible) {
    return null;
  }

  async function handlePrimaryAction() {
    if (installed) {
      globalThis.location.assign("/dashboard");
      return;
    }

    if (iosSafari) {
      setShowIosSteps((current) => !current);
      return;
    }

    if (androidDevice && !installPrompt) {
      setShowAndroidSteps((current) => !current);
      return;
    }

    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      globalThis.localStorage.setItem(installedStorageKey, "1");
      setVisible(false);
    }

    setInstallPrompt(null);
  }

  function dismiss() {
    globalThis.localStorage.setItem(dismissedStorageKey, String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="mx-auto mb-2 max-w-7xl rounded-lg border border-border bg-surface-strong px-3 py-2.5 shadow-(--shadow-tight) md:mb-3">
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
          {androidDevice && showAndroidSteps ? (
            <ol className="mt-2 grid gap-1.5 pl-5 text-sm leading-5 text-foreground/66">
              <li>Open your browser menu.</li>
              <li>Choose Install app or Add to Home screen.</li>
              <li>Confirm Install, then open My Crew Connections from your app drawer or Home Screen.</li>
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
