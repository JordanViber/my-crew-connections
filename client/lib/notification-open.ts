export const notificationNavigateMessageType = "mcc-notification-navigate";
export const notificationFallbackPath = "/dashboard";

type NotificationPageLocation = {
  href: string;
  origin: string;
  assign: (url: string) => void;
};

type NavigateMessage = {
  type: typeof notificationNavigateMessageType;
  url?: unknown;
};

function isNavigateMessage(data: unknown): data is NavigateMessage {
  if (!data || typeof data !== "object" || !("type" in data)) {
    return false;
  }

  return data.type === notificationNavigateMessageType;
}

export function resolveNotificationPageUrl(rawUrl: unknown, origin: string) {
  const fallback = new URL(notificationFallbackPath, origin).href;

  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    return fallback;
  }

  try {
    const url = new URL(rawUrl, origin);
    if (url.origin !== origin) {
      return fallback;
    }

    return url.href;
  } catch {
    return fallback;
  }
}

// Full document load. Notification taps can arrive before the Next.js
// router has hydrated, and a router push from that moment never settles.
export function openPageFromNotificationMessage(
  data: unknown,
  location: NotificationPageLocation,
  sourceOrigin = "",
) {
  if (sourceOrigin && sourceOrigin !== location.origin) {
    return;
  }

  if (!isNavigateMessage(data)) {
    return;
  }

  const target = resolveNotificationPageUrl(data.url, location.origin);
  if (target === location.href) {
    return;
  }

  try {
    location.assign(target);
  } catch {
    const fallback = new URL(notificationFallbackPath, location.origin).href;
    if (fallback === location.href || fallback === target) {
      return;
    }

    try {
      location.assign(fallback);
    } catch {
      // The current document is already loaded and still accepts input.
    }
  }
}
