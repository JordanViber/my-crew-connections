self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "My Crew Connections",
    body: "You have a relationship reminder.",
    url: "/dashboard",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      badge: "/app-icon.svg",
      icon: "/app-icon.svg",
      data: { url: payload.url || "/dashboard" },
      tag: payload.tag || "mcc-reminder",
    }),
  );
});

// iOS launches a standalone PWA into a WindowClient whose document is not
// active yet. navigate() and focus() both reject, and returning that
// rejection skips openWindow, so the WebView stays on the loading shell
// until the app is force-quit. Only navigate after focus succeeds.
self.addEventListener("notificationclick", (event) => {
  event.preventDefault();

  try {
    event.notification.close();
  } catch {
    // The banner can stay up. Opening a usable page still has to finish.
  }

  const rawUrl = event.notification && event.notification.data ? event.notification.data.url : undefined;
  event.waitUntil(openNotification(rawUrl).catch(() => undefined));
});

function resolveNotificationUrl(rawUrl) {
  const fallback = new URL("/dashboard", self.location.origin).href;

  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    return fallback;
  }

  try {
    const url = new URL(rawUrl, self.location.origin);
    if (url.origin !== self.location.origin) {
      return fallback;
    }

    return url.href;
  } catch {
    return fallback;
  }
}

function isSameOriginClient(client) {
  try {
    return new URL(client.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function isAlreadyOpen(clientUrl, targetUrl) {
  try {
    const current = new URL(clientUrl);
    const target = new URL(targetUrl);
    return current.origin === target.origin
      && current.pathname === target.pathname
      && current.search === target.search;
  } catch {
    return false;
  }
}

async function matchWindows() {
  try {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    return Array.isArray(windows) ? windows : [];
  } catch {
    return [];
  }
}

async function focusClient(client) {
  if (typeof client.focus !== "function") {
    return false;
  }

  try {
    await client.focus();
    return true;
  } catch {
    return false;
  }
}

async function navigateClient(client, url) {
  if (typeof client.navigate !== "function") {
    return false;
  }

  try {
    const next = await client.navigate(url);
    return next !== null;
  } catch {
    return false;
  }
}

function postNavigate(client, url) {
  if (typeof client.postMessage !== "function") {
    return;
  }

  try {
    client.postMessage({ type: "mcc-notification-navigate", url });
  } catch {
    // The focused page stays put, which is still a usable screen.
  }
}

async function openWindow(url) {
  if (typeof self.clients.openWindow !== "function") {
    return false;
  }

  try {
    const opened = await self.clients.openWindow(url);
    return Boolean(opened);
  } catch {
    return false;
  }
}

async function openNotification(rawUrl) {
  const targetUrl = resolveNotificationUrl(rawUrl);
  const fallbackUrl = resolveNotificationUrl("/dashboard");
  const windows = await matchWindows();

  for (const client of windows) {
    if (!isSameOriginClient(client)) {
      continue;
    }

    if (!(await focusClient(client))) {
      continue;
    }

    if (!isAlreadyOpen(client.url, targetUrl)) {
      const navigated = await navigateClient(client, targetUrl);
      if (navigated) {
        return;
      }
    }

    // client.url stays on the last full load after a Next.js client navigation.
    // The page compares location.href and does nothing when it already matches.
    postNavigate(client, targetUrl);
    return;
  }

  if (await openWindow(targetUrl)) {
    return;
  }

  if (targetUrl !== fallbackUrl) {
    await openWindow(fallbackUrl);
  }
}
