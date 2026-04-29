type UserDisplaySource = {
  email?: string | null;
  user_metadata?: {
    display_name?: unknown;
    first_name?: unknown;
    last_name?: unknown;
  } | null;
};

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getUserFirstName(user: UserDisplaySource) {
  return metadataString(user.user_metadata?.first_name);
}

export function getUserDisplayName(user: UserDisplaySource) {
  const displayName = metadataString(user.user_metadata?.display_name);

  if (displayName) {
    return displayName;
  }

  const fullName = [metadataString(user.user_metadata?.first_name), metadataString(user.user_metadata?.last_name)]
    .filter(Boolean)
    .join(" ");

  return fullName || user.email?.split("@")[0] || "Your account";
}
