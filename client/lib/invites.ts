export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildConnectionInvitePath(token: string) {
  return `/invite/${token}`;
}

export function buildConnectionInviteUrl(origin: string, token: string) {
  return `${origin}${buildConnectionInvitePath(token)}`;
}

export function getConnectionLinkState({
  linkedUserLabel,
  pendingInviteEmail,
}: Readonly<{
  linkedUserLabel?: string | null;
  pendingInviteEmail?: string | null;
}>) {
  if (linkedUserLabel) {
    return {
      state: "linked" as const,
      eyebrow: "Link status",
      title: "Connected to their account",
      body: `This connection is already tied to ${linkedUserLabel}. No new invite is needed right now.`,
    };
  }

  if (pendingInviteEmail) {
    return {
      state: "pending" as const,
      eyebrow: "Link status",
      title: "Invite pending",
      body: `Waiting on ${pendingInviteEmail} to sign in and claim this connection.`,
    };
  }

  return {
    state: "unlinked" as const,
    eyebrow: "Link status",
    title: "Not linked yet",
    body: "This person is only in your private list right now. Add an email below whenever you want to invite them in.",
  };
}
