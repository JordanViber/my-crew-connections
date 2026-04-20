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
      title: "Linked to a real user",
      body: `This connection is already linked to ${linkedUserLabel}. No extra invite step is needed now.`,
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
    title: "No real-user link started yet",
    body: "This person is still only a local connection record. Add an email below whenever you want to start the invite flow.",
  };
}
