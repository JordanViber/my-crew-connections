import {
  describePushServiceFailure,
  expiredSubscriptionMessage,
  noAccountSubscriptionMessage,
  pushDeliveryRejectedMessage,
  pushNotConfiguredMessage,
  pushPayloadTooLargeMessage,
  pushPermissionRejectedMessage,
  pushServiceBusyMessage,
  shouldResaveBrowserSubscription,
} from "@/lib/push-messages";

describe("browser subscription resave", () => {
  it("resaves when this account has no subscription or a different endpoint", () => {
    expect(shouldResaveBrowserSubscription({
      browserEndpoint: "https://push.example/device",
      savedEndpoint: null,
      savedEnabled: null,
    })).toBe(true);
    expect(shouldResaveBrowserSubscription({
      browserEndpoint: "https://push.example/device",
      savedEndpoint: "https://push.example/other",
      savedEnabled: true,
    })).toBe(true);
    expect(shouldResaveBrowserSubscription({
      browserEndpoint: "https://push.example/device",
      savedEndpoint: "https://push.example/device",
      savedEnabled: false,
    })).toBe(true);
  });

  it("leaves a matching enabled subscription alone", () => {
    expect(shouldResaveBrowserSubscription({
      browserEndpoint: null,
      savedEndpoint: null,
    })).toBe(false);
    expect(shouldResaveBrowserSubscription({
      browserEndpoint: "https://push.example/device",
      savedEndpoint: "https://push.example/device",
      savedEnabled: true,
    })).toBe(false);
  });
});

describe("test push failure messages", () => {
  it("names a missing account subscription separately from an expired push service subscription", () => {
    expect(noAccountSubscriptionMessage).toMatch(/no subscription for this account on this device/i);
    expect(describePushServiceFailure(404, "NotRegistered")).toBe(expiredSubscriptionMessage);
    expect(describePushServiceFailure(410, "Gone")).toBe(expiredSubscriptionMessage);
    expect(expiredSubscriptionMessage).toMatch(/subscription expired/i);
    expect(expiredSubscriptionMessage).toMatch(/turn notifications off and on again on this device/i);
  });

  it("maps other push service failures to a short reason", () => {
    expect(describePushServiceFailure(401, "Unauthorized")).toBe(pushPermissionRejectedMessage);
    expect(describePushServiceFailure(403, "Forbidden")).toBe(pushPermissionRejectedMessage);
    expect(describePushServiceFailure(429, "Slow down")).toBe(pushServiceBusyMessage);
    expect(describePushServiceFailure(413, "Payload too large")).toBe(pushPayloadTooLargeMessage);
    expect(describePushServiceFailure(500, "Missing VAPID configuration.")).toBe(pushNotConfiguredMessage);
    expect(describePushServiceFailure(500)).toBe(pushDeliveryRejectedMessage);
    expect(describePushServiceFailure(500, "<html>upstream exploded</html>")).toBe(pushDeliveryRejectedMessage);
  });
});
