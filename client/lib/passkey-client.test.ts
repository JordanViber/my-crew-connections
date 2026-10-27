import { browserSupabaseClientOptions } from "@/lib/passkey-client";

describe("browser supabase client", () => {
  it("leaves the client unchanged until passkeys are turned on", () => {
    expect(browserSupabaseClientOptions(false)).toBeUndefined();
  });

  it("opts the client into the passkey provider when the flag is on", () => {
    expect(browserSupabaseClientOptions(true)).toEqual({
      auth: {
        experimental: {
          passkey: true,
        },
      },
    });
  });
});
