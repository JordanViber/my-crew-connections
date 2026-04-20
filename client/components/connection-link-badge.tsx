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
  const state = getConnectionLinkState({
    linkedUserLabel: linkState === "linked" && !linkedUserLabel ? "a real user" : linkedUserLabel,
    pendingInviteEmail: linkState === "pending" || pendingInviteEmail ? pendingInviteEmail : undefined,
  });

  const classes =
    state.state === "linked"
      ? "bg-mint text-[#214c35]"
      : state.state === "pending"
        ? "bg-[#fff0df] text-[#8b5b2b]"
        : "bg-white text-foreground/70";

  const shortLabel =
    state.state === "linked" ? "Linked user" : state.state === "pending" ? "Invite pending" : "Local only";

  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classes}`}>{shortLabel}</span>;
}
