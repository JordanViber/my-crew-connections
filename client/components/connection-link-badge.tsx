import { getConnectionLinkState } from "@/lib/invites";

export function ConnectionLinkBadge({
  linkState,
  linkedUserLabel,
  pendingInviteEmail,
  linkedLabel = "Connected",
  pendingLabel = "Invite sent",
  unlinkedLabel = "Not linked",
}: Readonly<{
  linkState?: "linked" | "pending" | "unlinked";
  linkedUserLabel?: string | null;
  pendingInviteEmail?: string | null;
  linkedLabel?: string;
  pendingLabel?: string;
  unlinkedLabel?: string;
}>) {
  const fallbackLinkedUserLabel = linkState === "linked" && !linkedUserLabel ? "an account" : linkedUserLabel;
  const normalizedPendingInviteEmail = linkState === "pending" || pendingInviteEmail ? pendingInviteEmail : undefined;
  const state = getConnectionLinkState({
    linkedUserLabel: fallbackLinkedUserLabel,
    pendingInviteEmail: normalizedPendingInviteEmail,
    hasPendingInvite: linkState === "pending",
  });

  let classes = "bg-white text-foreground/70";
  let shortLabel = unlinkedLabel;

  if (state.state === "linked") {
    classes = "bg-mint text-[#214c35]";
    shortLabel = linkedLabel;
  } else if (state.state === "pending") {
    classes = "warning-surface-strong warning-text";
    shortLabel = pendingLabel;
  }

  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classes}`}>{shortLabel}</span>;
}
