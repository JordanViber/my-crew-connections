export const appleAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === "true";
export const phoneAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_PHONE_AUTH === "true";

function passkeySignInEnabledFromEnv(raw = process.env.NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED) {
  return raw?.trim().toLowerCase() !== "false";
}

export const passkeySignInEnabled = passkeySignInEnabledFromEnv();
