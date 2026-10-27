import { formatPasskeySetupError, passkeyDisabledMessage } from "@/lib/passkey-errors";

describe("passkey setup errors", () => {
  it("explains when the passkey sign-in provider is disabled", () => {
    expect(formatPasskeySetupError({
      code: "passkey_disabled",
      message: "Passkey sign-in is disabled",
    })).toBe(passkeyDisabledMessage);
    expect(passkeyDisabledMessage).toMatch(/aren't enabled yet/i);
    expect(passkeyDisabledMessage).toMatch(/try again later or contact support/i);
  });

  it("surfaces other Supabase codes with the message", () => {
    expect(formatPasskeySetupError({
      code: "webauthn_credential_exists",
      message: "This authenticator has already been registered",
    })).toBe("webauthn_credential_exists: This authenticator has already been registered");
    expect(formatPasskeySetupError({ message: "Browser cancelled the ceremony." })).toBe("Browser cancelled the ceremony.");
  });
});
