"use client";

import { useEffect, useState } from "react";
import { urlBase64ToUint8Array, vapidPublicKey } from "@/lib/push-client";

type NotificationState = "unsupported" | "default" | "denied" | "enabled" | "saving" | "error";

function getNotificationState(): NotificationState {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "enabled";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return "default";
}

export function NotificationSettingRow() {
  const [state, setState] = useState<NotificationState>("default");

  useEffect(() => {
    setState(getNotificationState());
  }, []);

  async function enableNotifications() {
    setState("saving");

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subscription,
          platform: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error("Push subscription failed.");
      }

      fetch("/api/push/test", { method: "POST" }).catch(() => {
        // Subscription is still saved; the next scheduled reminder can use it.
      });
      setState("enabled");
    } catch {
      setState("error");
    }
  }

  const statusLabel = {
    unsupported: "Not supported on this browser",
    default: "Off",
    denied: "Blocked",
    enabled: "On",
    saving: "Saving",
    error: "Needs retry",
  }[state];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">Push notifications</p>
        <p className="mt-0.5 text-sm leading-6 text-foreground/58">
          Get reminders for upcoming hangouts and relationships that need attention.
        </p>
        {state === "denied" ? (
          <p className="mt-1 text-sm text-accent-strong">Enable notifications for this site in your browser settings to turn this on.</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground/64">
          {statusLabel}
        </span>
        <button
          className="button-secondary button-compact"
          disabled={state === "unsupported" || state === "denied" || state === "saving" || state === "enabled"}
          onClick={enableNotifications}
          type="button"
        >
          Enable
        </button>
      </div>
    </div>
  );
}
