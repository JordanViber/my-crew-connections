export type ClaimInviteFormResult =
  | { ok: true; href: string }
  | { ok: false; message: string };

export function readActionRedirect(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error) || typeof error.digest !== "string") {
    return null;
  }

  if (!error.digest.startsWith("NEXT_REDIRECT;")) {
    return null;
  }

  const destination = error.digest.split(";").slice(2, -2).join(";");
  return destination || null;
}

export function claimInviteResultFromRedirect(destination: string): ClaimInviteFormResult {
  const url = new URL(destination, "https://mycrewconnections.local");
  const errorMessage = url.searchParams.get("error");

  if (errorMessage) {
    return { ok: false, message: errorMessage };
  }

  return { ok: true, href: `${url.pathname}${url.search}${url.hash}` };
}
