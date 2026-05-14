export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildConnectionInvitePath(token: string) {
  return `/invite/${token}`;
}

export function buildConnectionInviteUrl(origin: string, token: string) {
  return `${origin}${buildConnectionInvitePath(token)}`;
}

export function buildGroupInvitePath(token: string) {
  return `/group-invite/${token}`;
}

export function buildGroupInviteUrl(origin: string, token: string) {
  return `${origin}${buildGroupInvitePath(token)}`;
}

export function getConnectionLinkState({
  linkedUserLabel,
  pendingInviteEmail,
  hasPendingInvite = false,
}: Readonly<{
  linkedUserLabel?: string | null;
  pendingInviteEmail?: string | null;
  hasPendingInvite?: boolean;
}>) {
  if (linkedUserLabel) {
    return {
      state: "linked" as const,
      eyebrow: "Link status",
      title: "Connected to their account",
      body: `This connection is already tied to ${linkedUserLabel}. No new invite is needed right now.`,
    };
  }

  if (pendingInviteEmail || hasPendingInvite) {
    return {
      state: "pending" as const,
      eyebrow: "Link status",
      title: "Invite pending",
      body: pendingInviteEmail
        ? `Waiting on ${pendingInviteEmail} to sign in and claim this connection.`
        : "A shareable invite link is ready. Send it by text or any other app when you want them to claim this connection.",
    };
  }

  return {
    state: "unlinked" as const,
    eyebrow: "Link status",
    title: "Not linked yet",
    body: "This person is only in your list right now. Create an invite link whenever you want them to claim the connection.",
  };
}
