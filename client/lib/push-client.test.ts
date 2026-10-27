import { getVapidPublicKey } from "@/lib/push-client";

describe("vapid public key", () => {
  const previous = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      return;
    }

    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = previous;
  });

  it("returns null when the env key is missing instead of a baked-in key", () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    expect(getVapidPublicKey()).toBeNull();

    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "   ";
    expect(getVapidPublicKey()).toBeNull();
  });

  it("returns the configured public key", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
    expect(getVapidPublicKey()).toBe("test-public-key");
  });
});
