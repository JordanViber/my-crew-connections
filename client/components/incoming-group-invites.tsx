import { acceptGroupInviteAction, declineGroupInviteAction } from "@/app/actions";
import type { IncomingGroupInvite } from "@/lib/group-invites";

export function IncomingGroupInvites({
  invites,
}: Readonly<{
  invites: IncomingGroupInvite[];
}>) {
  if (!invites.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-accent/24 bg-accent-soft px-3.5 py-3.5 md:px-4 md:py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">Incoming group invite</p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
            {invites.length === 1 ? "A group is waiting on your response" : `${invites.length} groups are waiting on your response`}
          </h2>
          <p className="mt-1 text-sm leading-6 text-foreground/68">
            Accept or decline here on mobile without opening a separate link first.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {invites.map((invite) => (
          <article key={invite.id} className="rounded-lg border border-border/70 bg-white/76 p-3">
            <div className="grid gap-3">
              <div>
                <p className="font-semibold text-foreground">{invite.groupName}</p>
                <p className="mt-1 text-sm text-foreground/62">Invited by {invite.inviterName}</p>
                <p className="mt-1 text-sm text-foreground/62">You will appear as {invite.connectionName} if you accept.</p>
              </div>
              <div className="grid gap-2 sm:flex sm:flex-row">
                <form action={acceptGroupInviteAction}>
                  <input type="hidden" name="token" value={invite.token} />
                  <input type="hidden" name="redirectTo" value="/dashboard" />
                  <button className="button-primary button-compact w-full sm:w-auto" type="submit">
                    Accept
                  </button>
                </form>
                <form action={declineGroupInviteAction}>
                  <input type="hidden" name="token" value={invite.token} />
                  <input type="hidden" name="redirectTo" value="/dashboard" />
                  <button className="button-secondary button-compact w-full sm:w-auto" type="submit">
                    Decline
                  </button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
