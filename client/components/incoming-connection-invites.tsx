import { claimConnectionInviteAction } from "@/app/actions";
import type { IncomingConnectionInvite } from "@/lib/connection-invites";

export function IncomingConnectionInvites({
  invites,
}: Readonly<{
  invites: IncomingConnectionInvite[];
}>) {
  if (!invites.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-accent/24 bg-accent-soft px-3.5 py-3.5 md:px-4 md:py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">Incoming invite</p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
            {invites.length === 1 ? "Someone wants to connect" : `${invites.length} people want to connect`}
          </h2>
          <p className="mt-1 text-sm leading-6 text-foreground/68">
            Accept here when the invite was sent to your account email. No copied link needed.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {invites.map((invite) => (
          <article key={invite.id} className="rounded-lg border border-border/70 bg-white/76 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">{invite.connectionName}</p>
                <p className="mt-1 text-sm text-foreground/62">Invited by {invite.inviterName}</p>
              </div>
              <form action={claimConnectionInviteAction}>
                <input type="hidden" name="token" value={invite.token} />
                <button className="button-primary button-compact w-full sm:w-auto" type="submit">
                  Accept
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
