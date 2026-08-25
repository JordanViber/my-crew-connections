import { isRetryableAuthServiceError } from "@/lib/auth-errors";

/**
 * Keep in sync with `config.matcher` in `client/proxy.ts`.
 * Next.js needs that matcher as a statically analyzable string literal.
 */
const SESSION_REFRESH_SKIP_PREFIXES = [
  "_next/static",
  "_next/image",
  "favicon.ico",
  "sw.js",
  "manifest.webmanifest",
  "icon",
  "apple-icon",
] as const;

const STATIC_IMAGE_PATH = /\.(?:svg|png|jpg|jpeg|gif|webp)$/i;

export function shouldRefreshSession(pathname: string) {
  const path = pathname.split("?")[0]?.replace(/^\/+/, "") ?? "";

  if (!path) {
    return true;
  }

  if (STATIC_IMAGE_PATH.test(path)) {
    return false;
  }

  return !SESSION_REFRESH_SKIP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}.`),
  );
}

export async function tryGetSessionUser(getUser: () => Promise<unknown>) {
  try {
    await getUser();
  } catch (error) {
    if (!isRetryableAuthServiceError(error)) {
      throw error;
    }
  }
}
