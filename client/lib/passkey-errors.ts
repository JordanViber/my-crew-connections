export const passkeyDisabledMessage = "Passkeys aren't enabled yet. Try again later or contact support.";

export function formatPasskeySetupError(error: { code?: string | null; message?: string | null }) {
  if (error.code === "passkey_disabled") {
    return passkeyDisabledMessage;
  }

  const code = error.code?.trim();
  const message = error.message?.trim() || "Passkey setup failed.";
  return code ? `${code}: ${message}` : message;
}
