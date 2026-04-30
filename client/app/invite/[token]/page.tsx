import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { claimConnectionInviteAction } from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { SectionCard } from "@/components/section-card";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function InviteClaimPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ token: string }>;
  searchParams: Promise<{ claimed?: string; error?: string }>;
}>) {
  const { token } = await params;
  const query = await searchParams;
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  const supabase = createServerAdminSupabaseClient();
  const { data: invite, error } = await supabase
    .from("connection_invites")
    .select("id, connection_id, invited_email, claimed_at, revoked_at, connections!inner(display_name, owner_user_id, linked_user_id)")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invite: ${error.message}`);
  }

  if (!invite || invite.revoked_at) {
    notFound();
  }

  const connection = Array.isArray(invite.connections) ? invite.connections[0] : invite.connections;

  if (!connection) {
    notFound();
  }

  const isClaimed = Boolean(invite.claimed_at);

  if (!user) {
    const nextPath = `/invite/${token}`;
    const authParams = new URLSearchParams({
      next: nextPath,
      invite: token,
      inviteEmail: invite.invited_email,
      inviteName: connection.display_name,
    });

    redirect(`/auth?${authParams.toString()}`);
  }

  return (
    <main className="shell flex items-center justify-center px-4 py-5 md:px-6">
      <div className="glass-panel grid max-w-3xl gap-4 p-5 md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-strong">Connection invite</p>
        <h1 className="text-[2.1rem] font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
          Claim your connection with {connection.display_name}.
        </h1>
        <p className="text-sm leading-7 text-foreground/72">
          Signed in as <strong>{user.email}</strong>. To claim this connection, your signed-in email should match <strong>{invite.invited_email}</strong>.
        </p>

        {query.error ? (
          <FeedbackBanner title="Invite issue" body={query.error} tone="error" />
        ) : null}

        {query.claimed || isClaimed ? (
          <SectionCard title="Invite claimed" description="This connection is already linked to a real app user.">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="button-primary w-full sm:w-auto" href="/connections?feedback=connection-linked">
                Open people
              </Link>
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            title="Claim this connection"
            description="Once claimed, the owner can treat this relationship as linked to your real account."
          >
            <form action={claimConnectionInviteAction} className="grid gap-3">
              <input type="hidden" name="token" value={token} />
              <button className="button-primary w-full sm:w-auto" type="submit">
                Claim connection
              </button>
            </form>
          </SectionCard>
        )}
      </div>
    </main>
  );
}
