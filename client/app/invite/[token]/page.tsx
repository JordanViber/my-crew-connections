import { PrefetchLink } from "@/components/prefetch-link";
import { notFound, redirect } from "next/navigation";
import { claimConnectionInviteAction, signOutToPathAction } from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { SectionCard } from "@/components/section-card";
import { getFallbackDisplayNameFromEmail } from "@/lib/connection-display";
import { normalizeInviteEmail } from "@/lib/invites";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function InviteTerminalActions({
  user,
  signInHref,
}: Readonly<{
  user: { email?: string | null } | null;
  signInHref: string;
}>) {
  return user ? (
    <PrefetchLink className="button-primary w-full sm:w-auto" href="/dashboard">
      Open dashboard
    </PrefetchLink>
  ) : (
    <PrefetchLink className="button-primary w-full sm:w-auto" href={signInHref}>
      Sign in
    </PrefetchLink>
  );
}

async function resolveInviterName(
  supabase: ReturnType<typeof createServerAdminSupabaseClient>,
  ownerUserId: string,
) {
  const { data: inviterProfile, error: inviterProfileError } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name")
    .eq("id", ownerUserId)
    .maybeSingle();

  if (inviterProfileError) {
    throw new Error(`Failed to load inviter profile: ${inviterProfileError.message}`);
  }

  const inviterAuthResult = await supabase.auth.admin.getUserById(ownerUserId);

  if (inviterAuthResult.error) {
    throw new Error(`Failed to load inviter account: ${inviterAuthResult.error.message}`);
  }

  const inviterFullName = `${inviterProfile?.first_name ?? ""} ${inviterProfile?.last_name ?? ""}`.trim();
  return inviterProfile?.display_name?.trim()
    || inviterFullName
    || getFallbackDisplayNameFromEmail(inviterAuthResult.data.user?.email);
}

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
    .select("id, connection_id, invited_email, claimed_at, revoked_at, connections!inner(display_name, prefers_profile_name, owner_user_id, linked_user_id)")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invite: ${error.message}`);
  }

  if (!invite) {
    notFound();
  }

  const connection = Array.isArray(invite.connections) ? invite.connections[0] : invite.connections;

  if (!connection) {
    notFound();
  }

  const inviterName = await resolveInviterName(supabase, connection.owner_user_id);

  const isClaimed = Boolean(invite.claimed_at);
  const invitePath = `/invite/${token}`;
  const signInHref = `/auth?next=${encodeURIComponent(invitePath)}`;
  const inviteHeading = connection.prefers_profile_name
    ? `Accept your connection invite from ${inviterName}.`
    : `Claim your connection with ${connection.display_name} from ${inviterName}.`;

  if (invite.revoked_at) {
    return (
      <main className="shell flex items-center justify-center px-4 py-5 md:px-6">
        <div className="glass-panel grid max-w-3xl gap-4 p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-strong">Connection invite</p>
          <SectionCard
            title="Invite no longer active"
            description="This invite was replaced or revoked. Ask the sender to share the newest invite, or sign in to check whether a current invite is already waiting for you in the app."
          >
            <InviteTerminalActions signInHref={signInHref} user={user} />
          </SectionCard>
        </div>
      </main>
    );
  }

  if (isClaimed) {
    return (
      <main className="shell flex items-center justify-center px-4 py-5 md:px-6">
        <div className="glass-panel grid max-w-3xl gap-4 p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-strong">Connection invite</p>
          <SectionCard title="Invite claimed" description="This connection is already linked to a real app user.">
            <InviteTerminalActions signInHref={signInHref} user={user} />
          </SectionCard>
        </div>
      </main>
    );
  }

  if (!user) {
    const authParams = new URLSearchParams({
      next: invitePath,
      invite: token,
      inviteEmail: invite.invited_email,
      ...(connection.prefers_profile_name ? {} : { inviteName: connection.display_name }),
    });

    redirect(`/auth?${authParams.toString()}`);
  }

  const signedInEmail = user.email ?? "";
  const emailMatchesInvite = normalizeInviteEmail(signedInEmail) === normalizeInviteEmail(invite.invited_email);
  let inviteResponseContent: React.ReactNode;

  if (query.claimed) {
    inviteResponseContent = (
      <SectionCard title="Invite claimed" description="This connection is already linked to a real app user.">
        <div className="flex flex-col gap-3 sm:flex-row">
          <PrefetchLink className="button-primary w-full sm:w-auto" href="/connections?feedback=connection-linked">
            Open people
          </PrefetchLink>
        </div>
      </SectionCard>
    );
  } else if (emailMatchesInvite) {
    inviteResponseContent = (
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
    );
  } else {
    inviteResponseContent = (
      <SectionCard
        title="Switch accounts to claim"
        description="This invite can only be claimed by the email address it was sent to."
      >
        <form action={signOutToPathAction} className="grid gap-3">
          <input type="hidden" name="redirectTo" value={invitePath} />
          <button className="button-primary w-full sm:w-auto" type="submit">
            Sign out and continue
          </button>
        </form>
      </SectionCard>
    );
  }

  return (
    <main className="shell flex items-center justify-center px-4 py-5 md:px-6">
      <div className="glass-panel grid max-w-3xl gap-4 p-5 md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-strong">Connection invite</p>
        <h1 className="text-[2.1rem] font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
          {inviteHeading}
        </h1>
        <p className="text-sm leading-7 text-foreground/72">
          Signed in as <strong>{user.email}</strong>. To claim this connection, your signed-in email should match <strong>{invite.invited_email}</strong>.
        </p>

        {query.error ? (
          <FeedbackBanner title="Invite issue" body={query.error} tone="error" />
        ) : null}

        {inviteResponseContent}
      </div>
    </main>
  );
}
