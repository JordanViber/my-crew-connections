import { shouldRefreshSession, tryGetSessionUser } from "@/lib/supabase/session-middleware";

describe("shouldRefreshSession", () => {
  it("skips PWA and static assets so they do not call getUser", () => {
    expect(shouldRefreshSession("/sw.js")).toBe(false);
    expect(shouldRefreshSession("/manifest.webmanifest")).toBe(false);
    expect(shouldRefreshSession("/icon")).toBe(false);
    expect(shouldRefreshSession("/apple-icon")).toBe(false);
    expect(shouldRefreshSession("/favicon.ico")).toBe(false);
    expect(shouldRefreshSession("/_next/static/chunks/app.js")).toBe(false);
    expect(shouldRefreshSession("/_next/image")).toBe(false);
    expect(shouldRefreshSession("/app-icon.svg")).toBe(false);
  });

  it("still refreshes auth and dashboard routes", () => {
    expect(shouldRefreshSession("/")).toBe(true);
    expect(shouldRefreshSession("/auth")).toBe(true);
    expect(shouldRefreshSession("/auth/login")).toBe(true);
    expect(shouldRefreshSession("/dashboard")).toBe(true);
    expect(shouldRefreshSession("/connections")).toBe(true);
  });
});

describe("tryGetSessionUser", () => {
  it("resolves when getUser succeeds", async () => {
    await expect(tryGetSessionUser(async () => ({ user: { id: "1" } }))).resolves.toBeUndefined();
  });

  it("returns instead of throwing on timeout, 504, and retryable fetch failures", async () => {
    await expect(
      tryGetSessionUser(async () => {
        throw { name: "AuthRetryableFetchError", status: 504, message: "Gateway Timeout" };
      }),
    ).resolves.toBeUndefined();

    await expect(
      tryGetSessionUser(async () => {
        throw { status: 504, message: "Too many concurrent token refresh requests" };
      }),
    ).resolves.toBeUndefined();
  });

  it("does not swallow unrelated getUser failures", async () => {
    await expect(
      tryGetSessionUser(async () => {
        throw new Error("invalid jwt");
      }),
    ).rejects.toThrow("invalid jwt");
  });
});
