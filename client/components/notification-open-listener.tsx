"use client";

import { useEffect } from "react";
import { openPageFromNotificationMessage } from "@/lib/notification-open";

export function NotificationOpenListener() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return undefined;
    }

    const onMessage = (event: MessageEvent) => {
      openPageFromNotificationMessage(event.data, window.location, event.origin);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
