import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { NotificationSettingRow } from "@/components/notification-setting-row";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import {
  expiredSubscriptionMessage,
  noAccountSubscriptionMessage,
  pushDeliveryRejectedMessage,
  pushNotConfiguredMessage,
  relinkedDeviceMessage,
} from "@/lib/push-messages";

const browserSubscription = {
  endpoint: "https://push.example/this-device",
  toJSON() {
    return {
      endpoint: this.endpoint,
      keys: { p256dh: "key", auth: "auth" },
    };
  },
};

function installPushGlobals(permission: NotificationPermission, subscription: typeof browserSubscription | null) {
  const registration = {
    pushManager: {
      getSubscription: async () => subscription,
      subscribe: async () => subscription,
    },
  };

  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: async () => registration,
      register: async () => registration,
    },
  });
  vi.stubGlobal("Notification", {
    permission,
    requestPermission: async () => permission,
  });
  vi.stubGlobal("PushManager", function PushManager() {
    return undefined;
  });
}

describe("settings install check", () => {
  const previousVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "serviceWorker");
    if (previousVapidKey === undefined) {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    } else {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = previousVapidKey;
    }
  });

  it("renders without matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    expect(renderToString(
      <>
        <NotificationSettingRow />
        <PwaInstallBanner />
      </>,
    )).toContain("Push notifications");

    render(
      <>
        <NotificationSettingRow />
        <PwaInstallBanner />
      </>,
    );

    expect(screen.getAllByText("Push notifications").length).toBeGreaterThan(0);
  });

  it("relinks the browser subscription when this account does not have it", async () => {
    installPushGlobals("granted", browserSubscription);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/push/subscribe") && init?.method === "POST") {
        return { ok: true, json: async () => ({ ok: true }) };
      }

      return { ok: true, json: async () => ({ subscription: null }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<NotificationSettingRow />);

    expect(await screen.findByText(relinkedDeviceMessage)).toBeVisible();
    await waitFor(() => {
      const relink = fetchMock.mock.calls.find((call) => String(call[0]).endsWith("/api/push/subscribe") && call[1]?.method === "POST");
      expect(relink).toBeTruthy();
      expect(String(relink?.[1]?.body)).toContain(browserSubscription.endpoint);
    });
  });

  it.each([
    [404, noAccountSubscriptionMessage],
    [410, expiredSubscriptionMessage],
    [502, pushDeliveryRejectedMessage],
  ] as const)("shows the test push reason for status %s", async (status, message) => {
    installPushGlobals("granted", null);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/api/push/test") && init?.method === "POST") {
        return { ok: false, status, json: async () => ({ ok: false, message, statusCode: status }) };
      }

      return { ok: true, json: async () => ({ subscription: { endpoint: "https://push.example/saved", enabled: true } }) };
    }));

    render(<NotificationSettingRow />);
    await userEvent.click(await screen.findByRole("button", { name: "Send test notification" }));

    expect(await screen.findByText(message)).toBeVisible();
  });

  it("shows an error instead of subscribing when the VAPID public key is missing", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    installPushGlobals("default", null);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ subscription: null }),
    })));

    render(<NotificationSettingRow />);
    await userEvent.click(await screen.findByRole("button", { name: "Enable push on this device" }));

    expect(await screen.findByText(pushNotConfiguredMessage)).toBeVisible();
  });
});
