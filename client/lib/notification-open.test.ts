import { readFileSync } from "node:fs";
import path from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import {
  notificationFallbackPath,
  notificationNavigateMessageType,
  openPageFromNotificationMessage,
} from "@/lib/notification-open";

const swSource = readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");
const origin = "https://mycrewconnections.app";

type FakeClient = {
  url: string;
  focus: ReturnType<typeof vi.fn>;
  navigate?: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
};

type ClickEvent = {
  notification: { data?: { url?: string }; close: ReturnType<typeof vi.fn> };
  preventDefault: ReturnType<typeof vi.fn>;
  waitUntil: (promise: Promise<unknown>) => void;
};

function fakeClient(url: string, overrides: Partial<FakeClient> = {}): FakeClient {
  return {
    url,
    focus: vi.fn(() => Promise.resolve()),
    navigate: vi.fn(() => Promise.reject(new TypeError("navigate failed"))),
    postMessage: vi.fn(),
    ...overrides,
  };
}

function loadServiceWorker(clients: { matchAll: ReturnType<typeof vi.fn>; openWindow: ReturnType<typeof vi.fn> }) {
  const listeners = new Map<string, (event: ClickEvent) => void>();
  const scope = {
    location: { origin },
    clients,
    registration: {
      showNotification: () => Promise.resolve(),
    },
    skipWaiting: () => Promise.resolve(),
    addEventListener(type: string, handler: (event: ClickEvent) => void) {
      listeners.set(type, handler);
    },
  };

  runInContext(swSource, createContext({
    self: scope,
    URL,
    Promise,
    console,
    Array,
    Boolean,
    TypeError,
  }));

  return listeners;
}

function dispatchClick(
  listeners: Map<string, (event: ClickEvent) => void>,
  rawUrl?: string,
) {
  const notification = {
    data: rawUrl === undefined ? undefined : { url: rawUrl },
    close: vi.fn(),
  };
  const preventDefault = vi.fn();
  let settled: Promise<unknown> = Promise.resolve();
  const event: ClickEvent = {
    notification,
    preventDefault,
    waitUntil(promise) {
      settled = promise;
    },
  };

  listeners.get("notificationclick")?.(event);
  return { notification, preventDefault, settled };
}

async function expectNoUnhandledRejection(run: () => Promise<void>) {
  const reasons: unknown[] = [];
  const onRejection = (reason: unknown) => {
    reasons.push(reason);
  };

  process.on("unhandledRejection", onRejection);
  try {
    await run();
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    process.off("unhandledRejection", onRejection);
  }

  expect(reasons).toEqual([]);
}

describe("service worker notificationclick", () => {
  it("opens the target window on a cold start when no client exists", async () => {
    const openWindow = vi.fn(() => Promise.resolve({ url: `${origin}/connections/abc` }));
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([])),
      openWindow,
    });

    const click = dispatchClick(listeners, "/connections/abc");
    await click.settled;

    expect(click.preventDefault).toHaveBeenCalledOnce();
    expect(click.notification.close).toHaveBeenCalledOnce();
    expect(openWindow).toHaveBeenCalledExactlyOnceWith(`${origin}/connections/abc`);
  });

  it("focuses a live client and navigates it without opening another window", async () => {
    const order: string[] = [];
    const client = fakeClient(`${origin}/dashboard`, {
      focus: vi.fn(() => {
        order.push("focus");
        return Promise.resolve();
      }),
      navigate: vi.fn(() => {
        order.push("navigate");
        return Promise.resolve({ url: `${origin}/notifications` });
      }),
    });
    const openWindow = vi.fn(() => Promise.resolve({ url: `${origin}/notifications` }));
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([client])),
      openWindow,
    });

    await dispatchClick(listeners, "/notifications").settled;

    expect(order).toEqual(["focus", "navigate"]);
    expect(client.navigate).toHaveBeenCalledExactlyOnceWith(`${origin}/notifications`);
    expect(client.postMessage).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("asks the page to navigate when focus works and navigate fails", async () => {
    const client = fakeClient(`${origin}/dashboard`);
    const openWindow = vi.fn(() => Promise.resolve({ url: `${origin}/groups/group-1` }));
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([client])),
      openWindow,
    });

    await expectNoUnhandledRejection(async () => {
      await dispatchClick(listeners, "/groups/group-1").settled;
    });

    expect(client.navigate).toHaveBeenCalledOnce();
    expect(client.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: notificationNavigateMessageType,
      url: `${origin}/groups/group-1`,
    });
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("asks the page to navigate when navigate resolves to null", async () => {
    const client = fakeClient(`${origin}/dashboard`, {
      navigate: vi.fn(() => Promise.resolve(null)),
    });
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([client])),
      openWindow: vi.fn(),
    });

    await dispatchClick(listeners, "/notifications").settled;

    expect(client.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: notificationNavigateMessageType,
      url: `${origin}/notifications`,
    });
  });

  it("asks the page to navigate when the client has no navigate method", async () => {
    const client = fakeClient(`${origin}/dashboard`, { navigate: undefined });
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([client])),
      openWindow: vi.fn(() => Promise.resolve(null)),
    });

    await dispatchClick(listeners, "/notifications").settled;

    expect(client.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: notificationNavigateMessageType,
      url: `${origin}/notifications`,
    });
  });

  it("asks the page to navigate when the client url already matches", async () => {
    const client = fakeClient(`${origin}/notifications`);
    const openWindow = vi.fn();
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([client])),
      openWindow,
    });

    await dispatchClick(listeners, "/notifications").settled;

    expect(client.focus).toHaveBeenCalledOnce();
    expect(client.navigate).not.toHaveBeenCalled();
    expect(client.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: notificationNavigateMessageType,
      url: `${origin}/notifications`,
    });
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("opens a window when focus and navigate fail, and still settles", async () => {
    const client = fakeClient(`${origin}/dashboard`, {
      focus: vi.fn(() => Promise.reject(new TypeError("WindowClient focus failed"))),
    });
    const openWindow = vi.fn(() => Promise.resolve({ url: `${origin}/connections/abc` }));
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([client])),
      openWindow,
    });

    await expectNoUnhandledRejection(async () => {
      await dispatchClick(listeners, "/connections/abc").settled;
    });

    expect(client.focus).toHaveBeenCalledOnce();
    expect(client.navigate).not.toHaveBeenCalled();
    expect(client.postMessage).not.toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledExactlyOnceWith(`${origin}/connections/abc`);
  });

  it("falls back to the dashboard when opening the target window fails", async () => {
    const openWindow = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ url: `${origin}${notificationFallbackPath}` });
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([
        fakeClient(`${origin}/dashboard`, {
          focus: vi.fn(() => Promise.reject(new TypeError("WindowClient focus failed"))),
        }),
      ])),
      openWindow,
    });

    await dispatchClick(listeners, "/connections/abc").settled;

    expect(openWindow).toHaveBeenNthCalledWith(1, `${origin}/connections/abc`);
    expect(openWindow).toHaveBeenNthCalledWith(2, `${origin}${notificationFallbackPath}`);
  });

  it("settles when focus, navigate, and both window opens fail", async () => {
    const openWindow = vi.fn(() => Promise.reject(new TypeError("openWindow failed")));
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.reject(new TypeError("matchAll failed"))),
      openWindow,
    });

    await expectNoUnhandledRejection(async () => {
      await dispatchClick(listeners, "/notifications").settled;
    });

    expect(openWindow).toHaveBeenCalledTimes(2);
    expect(openWindow).toHaveBeenNthCalledWith(2, `${origin}${notificationFallbackPath}`);
  });

  it("ignores a foreign client and opens the dashboard for a bad url", async () => {
    const foreign = fakeClient("https://evil.example/phish");
    const openWindow = vi.fn(() => Promise.resolve({ url: `${origin}/dashboard` }));
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([foreign])),
      openWindow,
    });

    await dispatchClick(listeners, "https://evil.example/phish").settled;
    expect(foreign.focus).not.toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledExactlyOnceWith(`${origin}/dashboard`);

    const malformedOpen = vi.fn(() => Promise.resolve({ url: `${origin}/dashboard` }));
    const malformed = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([])),
      openWindow: malformedOpen,
    });
    await dispatchClick(malformed, "http://[").settled;
    expect(malformedOpen).toHaveBeenCalledExactlyOnceWith(`${origin}/dashboard`);
  });

  it("uses the next client when the first focus fails", async () => {
    const inert = fakeClient(`${origin}/dashboard`, {
      focus: vi.fn(() => Promise.reject(new TypeError("WindowClient focus failed"))),
    });
    const live = fakeClient(`${origin}/settings`, {
      navigate: vi.fn(() => Promise.resolve({ url: `${origin}/notifications` })),
    });
    const openWindow = vi.fn();
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([inert, live])),
      openWindow,
    });

    await dispatchClick(listeners, "/notifications").settled;

    expect(inert.navigate).not.toHaveBeenCalled();
    expect(live.navigate).toHaveBeenCalledExactlyOnceWith(`${origin}/notifications`);
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("still opens the dashboard when the notification has no url", async () => {
    const openWindow = vi.fn(() => Promise.resolve({ url: `${origin}/dashboard` }));
    const listeners = loadServiceWorker({
      matchAll: vi.fn(() => Promise.resolve([])),
      openWindow,
    });

    const notification = { close: vi.fn() };
    let settled: Promise<unknown> = Promise.resolve();
    listeners.get("notificationclick")?.({
      notification,
      preventDefault: vi.fn(),
      waitUntil(promise) {
        settled = promise;
      },
    });
    await settled;

    expect(openWindow).toHaveBeenCalledExactlyOnceWith(`${origin}/dashboard`);
  });
});

describe("openPageFromNotificationMessage", () => {
  const pageOrigin = "https://mycrewconnections.app";

  function pageLocation(href: string) {
    return {
      href,
      origin: pageOrigin,
      assign: vi.fn(),
    };
  }

  it("loads the notification target with a full page navigation", () => {
    const location = pageLocation(`${pageOrigin}/dashboard`);

    openPageFromNotificationMessage({
      type: notificationNavigateMessageType,
      url: "/connections/abc",
    }, location, pageOrigin);

    expect(location.assign).toHaveBeenCalledExactlyOnceWith(`${pageOrigin}/connections/abc`);
  });

  it("does nothing when the page is already on the target", () => {
    const location = pageLocation(`${pageOrigin}/notifications`);

    openPageFromNotificationMessage({
      type: notificationNavigateMessageType,
      url: "/notifications",
    }, location, pageOrigin);

    expect(location.assign).not.toHaveBeenCalled();
  });

  it("ignores other messages and cross-origin senders", () => {
    const location = pageLocation(`${pageOrigin}/dashboard`);

    openPageFromNotificationMessage({ type: "something-else", url: "/notifications" }, location, pageOrigin);
    openPageFromNotificationMessage(null, location, pageOrigin);
    openPageFromNotificationMessage({
      type: notificationNavigateMessageType,
      url: "/notifications",
    }, location, "https://evil.example");

    expect(location.assign).not.toHaveBeenCalled();
  });

  it("sends a cross-origin target to the dashboard", () => {
    const location = pageLocation(`${pageOrigin}/settings`);

    openPageFromNotificationMessage({
      type: notificationNavigateMessageType,
      url: "https://evil.example/phish",
    }, location, "");

    expect(location.assign).toHaveBeenCalledExactlyOnceWith(`${pageOrigin}${notificationFallbackPath}`);
  });

  it("falls back to the dashboard when the target navigation throws", () => {
    const location = pageLocation(`${pageOrigin}/settings`);
    location.assign.mockImplementationOnce(() => {
      throw new Error("assign failed");
    });

    openPageFromNotificationMessage({
      type: notificationNavigateMessageType,
      url: "/connections/abc",
    }, location, pageOrigin);

    expect(location.assign).toHaveBeenNthCalledWith(1, `${pageOrigin}/connections/abc`);
    expect(location.assign).toHaveBeenNthCalledWith(2, `${pageOrigin}${notificationFallbackPath}`);
  });

  it("stays on the current page when both navigations throw", () => {
    const location = pageLocation(`${pageOrigin}/settings`);
    location.assign.mockImplementation(() => {
      throw new Error("assign failed");
    });

    expect(() => openPageFromNotificationMessage({
      type: notificationNavigateMessageType,
      url: "/connections/abc",
    }, location)).not.toThrow();

    expect(location.assign).toHaveBeenNthCalledWith(1, `${pageOrigin}/connections/abc`);
    expect(location.assign).toHaveBeenNthCalledWith(2, `${pageOrigin}${notificationFallbackPath}`);
  });
});
