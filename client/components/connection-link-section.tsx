import { createConnectionInviteAction } from "@/app/actions";
import { getConnectionLinkState } from "@/lib/invites";
import { InviteLinkPanel } from "@/components/invite-link-panel";

type ConnectionLinkSectionProps = Readonly<{
  connectionId: string;
  redirectTo: string;
  contactEmail?: string | null;
  linkedUserLabel?: string | null;
  activeInvite?: {
    email?: string | null;
    inviteUrl: string;
  } | null;
}>;

export function ConnectionLinkSection({
  connectionId,
  redirectTo,
  contactEmail,
  linkedUserLabel,
  activeInvite,
}: ConnectionLinkSectionProps) {
  const linkState = getConnectionLinkState({
    linkedUserLabel: linkedUserLabel ?? undefined,
    pendingInviteEmail: activeInvite?.email,
    hasPendingInvite: Boolean(activeInvite),
  });
  const showInviteForm = linkState.state !== "linked";
  let cardClasses = "border-border/85 bg-white/78";

  if (linkState.state === "linked") {
    cardClasses = "border-mint/70 bg-mint/50";
  } else if (linkState.state === "pending") {
    cardClasses = "warning-surface";
  }

  return (
    <div className="grid gap-3">
      <div className={["rounded-lg border p-3.5", cardClasses].join(" ")}>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">{linkState.eyebrow}</p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{linkState.title}</h3>
        <p className="mt-2 text-sm leading-6 text-foreground/72">{linkState.body}</p>
      </div>

      {activeInvite ? <InviteLinkPanel inviteUrl={activeInvite.inviteUrl} /> : null}

      {showInviteForm ? (
        <form action={createConnectionInviteAction} className="grid gap-3">
          <input type="hidden" name="connectionId" value={connectionId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <label className="grid gap-2">
            <span className="field-label">{activeInvite ? "Replace pending invite" : "Email for optional delivery"}</span>
            <input
              className="field-input"
              defaultValue={activeInvite?.email ?? contactEmail ?? ""}
              name="email"
              type="email"
              placeholder="friend@example.com"
            />
          </label>
          <p className="text-sm leading-6 text-foreground/68">
            Leave email blank to create a link you can send by text. Add an email if you also want email delivery or an email-locked claim.
          </p>
          <button className="button-primary w-full sm:w-auto" type="submit">
            {activeInvite ? "Refresh invite link" : "Create invite link"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
