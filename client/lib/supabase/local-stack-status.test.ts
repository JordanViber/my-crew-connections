vi.mock("@/lib/env", () => ({
  env: {
    supabaseUrl: "http://127.0.0.1:54321",
    supabaseAnonKey: "test-anon-key",
  },
}));

import { getLocalSupabaseStatus, isLocalSupabaseUrl } from "@/lib/supabase/local-stack-status";

describe("local stack status", () => {
  it("identifies local Supabase URLs", () => {
    expect(isLocalSupabaseUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalSupabaseUrl("http://localhost:54321")).toBe(true);
    expect(isLocalSupabaseUrl("https://example.supabase.co")).toBe(false);
  });

  it("returns available when the Supabase health endpoint responds ok", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    await expect(getLocalSupabaseStatus()).resolves.toEqual({
      available: true,
      message: "Local Supabase is reachable.",
    });

    global.fetch = originalFetch;
  });

  it("returns unavailable when the Supabase health endpoint fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("connect failed")) as typeof fetch;

    await expect(getLocalSupabaseStatus()).resolves.toEqual({
      available: false,
      message:
        "Local Supabase looks offline. Start Docker Desktop, run the local Supabase stack, and refresh before trying auth actions.",
    });

    global.fetch = originalFetch;
  });
});
