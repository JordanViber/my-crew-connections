import { passkeySignInEnabled } from "@/lib/auth-features";

export function browserSupabaseClientOptions(passkeysEnabled = passkeySignInEnabled) {
  if (!passkeysEnabled) {
    return undefined;
  }

  return {
    auth: {
      experimental: {
        passkey: true,
      },
    },
  };
}
