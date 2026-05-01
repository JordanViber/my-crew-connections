export const GENERIC_CONNECTION_INVITE_LABEL = "your connection";

export function getFallbackDisplayNameFromEmail(email?: string | null) {
  if (!email) {
    return "Linked user";
  }

  const localPart = email.trim().toLowerCase().split("@")[0] ?? "";
  const humanized = localPart.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();

  if (!humanized) {
    return email.trim();
  }

  return humanized.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function shouldUseProfileName(displayName: string, contactEmail?: string | null) {
  return Boolean(contactEmail?.trim() && !displayName.trim());
}

export function getInviteConnectionLabel(connectionName: string, prefersProfileName: boolean) {
  return prefersProfileName ? GENERIC_CONNECTION_INVITE_LABEL : connectionName;
}