import { getConnectionLinkState } from "@/lib/invites";

export function ConnectionLinkBadge({
  linkState,
  linkedUserLabel,
  pendingInviteEmail,
}: Readonly<{
  linkState?: "linked" | "pending" | "unlinked";
  linkedUserLabel?: string | null;
  pendingInviteEmail?: string | null;
}>) {
  const fallbackLinkedUserLabel = linkState === "linked" && !linkedUserLabel ? "an account" : linkedUserLabel;
  const normalizedPendingInviteEmail = linkState === "pending" || pendingInviteEmail ? pendingInviteEmail : undefined;
  const state = getConnectionLinkState({
    linkedUserLabel: fallbackLinkedUserLabel,
    pendingInviteEmail: normalizedPendingInviteEmail,
  });

  let classes = "bg-white text-foreground/70";
  let shortLabel = "Not linked";

  if (state.state === "linked") {
    classes = "bg-mint text-[#214c35]";
    shortLabel = "Connected";
  } else if (state.state === "pending") {
    classes = "bg-[#fff0df] text-[#8b5b2b]";
    shortLabel = "Invite sent";
  }

  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classes}`}>{shortLabel}</span>;
}
