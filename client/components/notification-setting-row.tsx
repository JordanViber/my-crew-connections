"use client";

import { useEffect, useState } from "react";
import { getPushEnvironment } from "@/lib/pwa-client";
import { urlBase64ToUint8Array, vapidPublicKey } from "@/lib/push-client";

type NotificationState = "unsupported" | "install-required" | "default" | "denied" | "enabled" | "saving" | "testing" | "error";

type ServerSubscriptionStatus = {
  enabled: boolean;
  device_family: string | null;
  browser_name: string | null;
  install_state: string | null;
  permission_state: string | null;
  last_seen_at: string;
  last_subscribed_at: string | null;
  last_delivery_at: string | null;
  last_delivery_status: string | null;
  last_delivery_error: string | null;
};

type TestPushResult = {
  ok?: boolean;
  message?: string;
};

function getPrimaryButtonLabel(state: NotificationState) {
  if (state === "enabled") {
    return "Enabled";
  }

  if (state === "saving") {
    return "Saving";
  }

  if (state === "testing") {
    return "Testing";
  }

  return "Turn on";
}

function getStatusLabel(state: NotificationState) {
  return {
    unsupported: "Not supported on this browser",
    "install-required": "Install app first",
    default: "Off",
    denied: "Blocked",
    enabled: "On",
    saving: "Saving",
    testing: "Testing",
    error: "Needs retry",
  }[state];
}

function getStatusSummary(serverSubscription: ServerSubscriptionStatus | null) {
  return serverSubscription
    ? [
      serverSubscription.device_family,
      serverSubscription.browser_name,
      serverSubscription.install_state,
    ].filter(Boolean).join(" • ")
    : null;
}

function getFeedbackClassName(feedbackTone: "neutral" | "success" | "error") {
  if (feedbackTone === "error") {
    return "text-accent-strong";
  }

  if (feedbackTone === "success") {
    return "text-foreground";
  }

  return "text-foreground/58";
}

async function fetchSubscriptionStatus() {
  const response = await fetch("/api/push/subscribe", { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json() as { subscription?: ServerSubscriptionStatus | null };
  return payload.subscription ?? null;
}

async function requestTestPush() {
  const response = await fetch("/api/push/test", { method: "POST" });
  const payload = await response.json() as TestPushResult;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? "Push delivery failed.");
  }

  return payload.message ?? "Test notification sent.";
}

function getNotificationState(): NotificationState {
  if (globalThis.window === undefined) {
    return "unsupported";
  }

  const environment = getPushEnvironment();

  if (environment.requiresInstallForPush) {
    return "install-required";
  }

  if (!environment.supportsPush) {
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
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"neutral" | "success" | "error">("neutral");
  const [serverSubscription, setServerSubscription] = useState<ServerSubscriptionStatus | null>(null);
  const environment = getPushEnvironment();
  const buttonLabel = getPrimaryButtonLabel(state);

  useEffect(() => {
    setState(getNotificationState());
    void refreshSubscriptionStatus();
  }, []);

  async function refreshSubscriptionStatus() {
    try {
      setServerSubscription(await fetchSubscriptionStatus());
    } catch {
      // Subscription refresh is best-effort. Local browser state is still enough to render the control.
    }
  }

  async function sendTestPush() {
    setState("testing");
    setFeedbackTone("neutral");
    setFeedbackMessage("Sending a test notification...");

    try {
      setState("enabled");
      setFeedbackTone("success");
      setFeedbackMessage(await requestTestPush());
      await refreshSubscriptionStatus();
    } catch (error) {
      setState("enabled");
      setFeedbackTone("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Push delivery failed.");
      await refreshSubscriptionStatus();
    }
  }

  async function enableNotifications() {
    setState("saving");
    setFeedbackMessage(null);

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
          permissionState: permission,
          deviceFamily: environment.deviceFamily,
          browserName: environment.browserFamily,
          installState: environment.installState,
        }),
      });

      if (!response.ok) {
        throw new Error("Push subscription failed.");
      }

      setState("enabled");
      setFeedbackTone("success");
      setFeedbackMessage("Push is enabled. Sending a test notification now...");
      await refreshSubscriptionStatus();
      await sendTestPush();
    } catch {
      setState("error");
      setFeedbackTone("error");
      setFeedbackMessage("Push subscription failed. Retry after confirming browser permission is allowed.");
    }
  }
  const statusLabel = getStatusLabel(state);
  const statusSummary = getStatusSummary(serverSubscription);
  const feedbackClassName = getFeedbackClassName(feedbackTone);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">Push notifications</p>
        <p className="mt-0.5 text-sm leading-6 text-foreground/58">
          Get reminders for upcoming hangouts and relationships that need attention.
        </p>
        {state === "default" ? (
          <p className="mt-1 text-sm text-foreground/58">
            {environment.deviceFamily === "android"
              ? "Tap Turn on and your browser will ask for permission. Installing the app first usually gives Android the smoothest experience."
              : "Tap Turn on and your browser will ask for permission."}
          </p>
        ) : null}
        {state === "install-required" ? (
          <p className="mt-1 text-sm text-foreground/58">
            On iPhone and iPad, push only works from the installed Home Screen app. Add My Crew Connections to your Home Screen, open that app icon, then come back here and tap Turn on.
          </p>
        ) : null}
        {state === "denied" ? (
          <p className="mt-1 text-sm text-accent-strong">Notifications are blocked. Open browser site settings, allow notifications for this app, then return here.</p>
        ) : null}
        {state === "unsupported" ? (
          <p className="mt-1 text-sm text-foreground/58">Push works best from the installed app or a browser with web push support.</p>
        ) : null}
        {statusSummary ? (
          <p className="mt-1 text-sm text-foreground/58">Saved for {statusSummary}.</p>
        ) : null}
        {serverSubscription?.last_delivery_status ? (
          <p className="mt-1 text-sm text-foreground/58">
            Last delivery: {serverSubscription.last_delivery_status}
            {serverSubscription.last_delivery_at ? ` at ${new Date(serverSubscription.last_delivery_at).toLocaleString()}` : ""}.
          </p>
        ) : null}
        {feedbackMessage ? (
          <p className={`mt-1 text-sm ${feedbackClassName}`}>{feedbackMessage}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground/64">
          {statusLabel}
        </span>
        <button
          className="button-secondary button-compact"
          disabled={state === "unsupported" || state === "install-required" || state === "denied" || state === "saving" || state === "testing" || state === "enabled"}
          onClick={enableNotifications}
          type="button"
        >
          {buttonLabel}
        </button>
        <button
          className="button-secondary button-compact"
          disabled={state !== "enabled"}
          onClick={sendTestPush}
          type="button"
        >
          Send test
        </button>
      </div>
    </div>
  );
}
