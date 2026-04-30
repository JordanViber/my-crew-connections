import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { acceptGroupInviteAction, declineGroupInviteAction, signOutToPathAction } from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { SectionCard } from "@/components/section-card";
import { buildGroupInvitePath, normalizeInviteEmail } from "@/lib/invites";
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
    <Link className="button-primary w-full sm:w-auto" href="/dashboard">
      Open dashboard
    </Link>
  ) : (
    <Link className="button-primary w-full sm:w-auto" href={signInHref}>
      Sign in
    </Link>
  );
}

function getGroupName(
  group: { name: string } | { name: string }[] | null,
) {
  const groupRow = Array.isArray(group) ? group[0] : group;
  return groupRow?.name ?? "this group";
}

function getConnectionName(
  connection: { display_name: string } | { display_name: string }[] | null,
) {
  const connectionRow = Array.isArray(connection) ? connection[0] : connection;
  return connectionRow?.display_name ?? "you";
}

export default async function GroupInvitePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accepted?: string; declined?: string; error?: string }>;
}>) {
  const { token } = await params;
  const query = await searchParams;
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  const supabase = createServerAdminSupabaseClient();
  const { data: invite, error } = await supabase
    .from("group_invites")
    .select("id, invited_email, accepted_at, declined_at, revoked_at, groups!inner(name), connections!inner(display_name)")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load group invite: ${error.message}`);
  }

  if (!invite) {
    notFound();
  }

  const groupName = getGroupName(invite.groups);
  const connectionName = getConnectionName(invite.connections);
  const invitePath = buildGroupInvitePath(token);
  const signInHref = `/auth?next=${encodeURIComponent(invitePath)}`;

  if (invite.revoked_at) {
    return (
      <main className="shell flex items-center justify-center px-4 py-5 md:px-6">
        <div className="glass-panel grid max-w-3xl gap-4 p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-strong">Group invite</p>
          <SectionCard
            title="Invite no longer active"
            description="This group invite was replaced or revoked. Ask the sender to share the newest invite, or sign in to check whether a current invite is already waiting in the app."
          >
            <InviteTerminalActions signInHref={signInHref} user={user} />
          </SectionCard>
        </div>
      </main>
    );
  }

  if (query.accepted || invite.accepted_at) {
    return (
      <main className="shell flex items-center justify-center px-4 py-5 md:px-6">
        <div className="glass-panel grid max-w-3xl gap-4 p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-strong">Group invite</p>
          <SectionCard title="Invite accepted" description="Your response is recorded. The group owner now sees you as an accepted member.">
            <InviteTerminalActions signInHref={signInHref} user={user} />
          </SectionCard>
        </div>
      </main>
    );
  }

  if (query.declined || invite.declined_at) {
    return (
      <main className="shell flex items-center justify-center px-4 py-5 md:px-6">
        <div className="glass-panel grid max-w-3xl gap-4 p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-strong">Group invite</p>
          <SectionCard title="Invite declined" description="Your decline is recorded, so the owner still sees that invite as declined instead of accepted.">
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
      inviteName: groupName,
    });

    redirect(`/auth?${authParams.toString()}`);
  }

  const signedInEmail = user.email ?? "";
  const emailMatchesInvite = normalizeInviteEmail(signedInEmail) === normalizeInviteEmail(invite.invited_email);
  let inviteResponseContent: React.ReactNode;

  if (emailMatchesInvite) {
    inviteResponseContent = (
      <SectionCard
        title="Respond to this invite"
        description="Accept to join the group, or decline if this crew should stay out of your app."
      >
        <div className="grid gap-3 sm:flex sm:flex-row">
          <form action={acceptGroupInviteAction}>
            <input type="hidden" name="token" value={token} />
            <button className="button-primary w-full sm:w-auto" type="submit">
              Accept invite
            </button>
          </form>
          <form action={declineGroupInviteAction}>
            <input type="hidden" name="token" value={token} />
            <button className="button-secondary w-full sm:w-auto" type="submit">
              Decline invite
            </button>
          </form>
        </div>
      </SectionCard>
    );
  } else {
    inviteResponseContent = (
      <SectionCard
        title="Switch accounts to respond"
        description="This invite can only be accepted or declined by the email address it was sent to."
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
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-strong">Group invite</p>
        <h1 className="text-[2.1rem] font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
          Review your invite to join {groupName}.
        </h1>
        <p className="text-sm leading-7 text-foreground/72">
          Signed in as <strong>{user.email}</strong>. This invite was sent to <strong>{invite.invited_email}</strong> and will add you as <strong>{connectionName}</strong> if you accept.
        </p>

        {query.error ? (
          <FeedbackBanner title="Invite issue" body={query.error} tone="error" />
        ) : null}

        {inviteResponseContent}
      </div>
    </main>
  );
}
