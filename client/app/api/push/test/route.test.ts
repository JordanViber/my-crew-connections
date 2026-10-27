import { POST } from "@/app/api/push/test/route";
import {
  expiredSubscriptionMessage,
  noAccountSubscriptionMessage,
  pushDeliveryRejectedMessage,
  pushNotConfiguredMessage,
  pushPayloadTooLargeMessage,
  pushPermissionRejectedMessage,
  pushServiceBusyMessage,
  pushSignInAgainMessage,
  pushSubscriptionsUnavailableMessage,
} from "@/lib/push-messages";

const {
  sendPush,
  setUser,
  setRows,
  setQueryError,
  updates,
  resetHarness,
  currentUser,
  currentRows,
  currentError,
} = vi.hoisted(() => {
  const updates: Array<Record<string, unknown>> = [];
  let user: { id: string } | null = { id: "user-1" };
  let rows: Array<Record<string, unknown>> = [];
  let queryError: { message: string } | null = null;
  const sendPush = vi.fn();

  return {
    updates,
    sendPush,
    setUser(next: { id: string } | null) {
      user = next;
    },
    setRows(next: Array<Record<string, unknown>>) {
      rows = next;
    },
    setQueryError(next: { message: string } | null) {
      queryError = next;
    },
    resetHarness() {
      updates.length = 0;
      user = { id: "user-1" };
      rows = [];
      queryError = null;
      sendPush.mockReset();
    },
    currentUser() {
      return user;
    },
    currentRows() {
      return rows;
    },
    currentError() {
      return queryError;
    },
  };
});

vi.mock("@/lib/push", () => ({
  sendPushNotification: (...args: unknown[]) => sendPush(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser() } }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServerAdminSupabaseClient: () => ({
    from(table: string) {
      if (table !== "push_subscriptions") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    order() {
                      return {
                        limit: async () => ({ data: currentRows(), error: currentError() }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          updates.push(values);
          return {
            eq: async () => ({ error: null }),
          };
        },
      };
    },
  }),
}));

const savedRow = {
  id: "sub-row",
  endpoint: "https://push.example/device",
  p256dh: "key",
  auth: "auth",
};

describe("push test route", () => {
  beforeEach(() => {
    resetHarness();
  });

  it("tells a signed-out caller to sign in again", async () => {
    setUser(null);
    const response = await POST();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ message: pushSignInAgainMessage });
  });

  it("says there is no subscription for this account", async () => {
    const response = await POST();
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      message: noAccountSubscriptionMessage,
      statusCode: 404,
    });
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("reports when push subscriptions cannot be loaded", async () => {
    setQueryError({ message: "relation missing" });
    const response = await POST();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ message: pushSubscriptionsUnavailableMessage });
  });

  it.each([404, 410])("cleans up a stale row and says the subscription expired for push status %s", async (statusCode) => {
    setRows([savedRow]);
    sendPush.mockResolvedValue({ ok: false, statusCode, errorMessage: "gone" });

    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      message: expiredSubscriptionMessage,
      statusCode,
    });
    expect(updates).toEqual(expect.arrayContaining([{ enabled: false }]));
  });

  it.each([
    [401, pushPermissionRejectedMessage],
    [403, pushPermissionRejectedMessage],
    [429, pushServiceBusyMessage],
    [413, pushPayloadTooLargeMessage],
  ] as const)("maps push status %s to a short message", async (statusCode, message) => {
    setRows([savedRow]);
    sendPush.mockResolvedValue({ ok: false, statusCode, errorMessage: "raw provider body" });

    const response = await POST();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ message, statusCode });
    expect(updates.some((update) => update.enabled === false)).toBe(false);
  });

  it("maps a missing VAPID configuration and other delivery failures separately", async () => {
    setRows([savedRow]);
    sendPush.mockResolvedValueOnce({ ok: false, statusCode: 500, errorMessage: "Missing VAPID configuration." });
    const missingKey = await POST();
    expect(missingKey.status).toBe(502);
    await expect(missingKey.json()).resolves.toMatchObject({ message: pushNotConfiguredMessage });

    sendPush.mockResolvedValueOnce({ ok: false, statusCode: 500, errorMessage: "<html>upstream exploded</html>" });
    const rejected = await POST();
    await expect(rejected.json()).resolves.toMatchObject({ message: pushDeliveryRejectedMessage });
  });
});
