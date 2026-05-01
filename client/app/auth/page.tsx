import Link from "next/link";
import { redirect } from "next/navigation";
import { AppleAuthButton } from "@/components/apple-auth-button";
import { FeedbackBanner } from "@/components/feedback-banner";
import { LocalAccountForm } from "@/components/local-account-form";
import { MagicLinkForm } from "@/components/magic-link-form";
import { PasswordAuthForm } from "@/components/password-auth-form";
import { PhoneOtpForm } from "@/components/phone-otp-form";
import { appleAuthEnabled, phoneAuthEnabled } from "@/lib/auth-features";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLocalSupabaseStatus } from "@/lib/supabase/local-stack-status";

function InviteNotice({
  inviteEmail,
  inviteName,
}: Readonly<{
  inviteEmail?: string;
  inviteName?: string;
}>) {
  return (
    <div className="rounded-lg border border-accent/20 bg-accent-soft px-3.5 py-3 text-sm leading-6 text-foreground/78">
      <p className="font-semibold text-foreground">Invite waiting</p>
      <p className="mt-1">
        You have a connection invite waiting{inviteName ? <> for <strong>{inviteName}</strong></> : ""}.{" "}
        {inviteEmail ? (
          <>
            Use <strong>{inviteEmail}</strong> to accept it.
          </>
        ) : (
          "Sign in or create an account to accept it."
        )}{" "}
        After sign-in, you will return to the invite.
      </p>
    </div>
  );
}

function AuthOptionCards() {
  const options = [
    ...(appleAuthEnabled ? [{ title: "Apple", body: "Fast on supported devices." }] : []),
    { title: "Password", body: phoneAuthEnabled ? "Use email or phone with your password." : "Use your email with your password." },
    { title: "Email code", body: "Enter the code from your inbox, or use the sign-in link as a fallback." },
    ...(phoneAuthEnabled ? [{ title: "Phone code", body: "Use a verified phone number to sign in by text." }] : []),
  ];

  return (
    <div className="hidden gap-2 md:grid">
      {options.map((option) => (
        <div key={option.title} className="section-card p-3 text-sm leading-6 text-foreground/75">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">{option.title}</p>
          <p className="mt-1.5">{option.body}</p>
        </div>
      ))}
    </div>
  );
}

function PasswordStatusBanners({
  created,
  error,
}: Readonly<{
  created?: string;
  error?: string;
}>) {
  return (
    <>
      {error ? (
        <div className="mt-3">
          <FeedbackBanner title="Sign-in issue" body={error} tone="error" />
        </div>
      ) : null}

      {created ? (
        <div className="mt-3">
          <FeedbackBanner
            title="Check your email"
            body="If email confirmation is enabled for this environment, finish account setup from the message we just sent. After that, you can continue back into your invite or sign in below."
          />
        </div>
      ) : null}
    </>
  );
}

export default async function AuthPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; prepared?: string; sent?: string; created?: string; next?: string; invite?: string; inviteEmail?: string; inviteName?: string }>;
}>) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nextPath = params.next ?? "/dashboard";

  if (user) {
    redirect(nextPath);
  }

  const stackStatus = await getLocalSupabaseStatus();
  const createAccountHref = `/auth/create?${new URLSearchParams({
    next: nextPath,
    ...(params.invite ? { invite: params.invite } : {}),
    ...(params.inviteEmail ? { inviteEmail: params.inviteEmail } : {}),
    ...(params.inviteName ? { inviteName: params.inviteName } : {}),
  }).toString()}`;

  return (
    <main className="shell flex items-center justify-center px-3 py-3 md:px-8 md:py-6">
      <div className="glass-panel grid max-w-4xl gap-4 p-4 md:grid-cols-[0.72fr_1.28fr] md:p-5">
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">Sign in</p>
          <h1 className="text-[2.15rem] font-semibold leading-none tracking-tight text-foreground md:text-[2.75rem]">Welcome back.</h1>
          <p className="max-w-xl text-base leading-7 text-foreground/70">
            Sign in, or create an account if this is your first time here.
          </p>
          {params.invite ? <InviteNotice inviteEmail={params.inviteEmail} inviteName={params.inviteName} /> : null}
          <div className="flex flex-wrap gap-3">
            <Link className="button-primary" href={createAccountHref}>
              Create account
            </Link>
            <Link className="button-secondary" href="/">
              Back to home
            </Link>
          </div>
          <AuthOptionCards />
        </section>

        <section className="grid gap-3">
          {stackStatus.available ? null : (
            <FeedbackBanner
              title="Sign-in is currently unavailable"
              body="The sign-in service couldn't be reached just now. Please try again in a moment."
              tone="error"
            />
          )}

          {appleAuthEnabled ? (
            <div className="section-card p-3.5 md:p-4">
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-foreground">Continue with Apple</h2>
              <p className="mt-1.5 text-sm leading-6 text-foreground/68">
                Use Apple on supported browsers and devices for a faster sign-in.
              </p>

              <div className="mt-4">
                <AppleAuthButton nextPath={nextPath} />
              </div>
            </div>
          ) : null}

          <div className="section-card p-3.5 md:p-4">
            <h2 className="text-[1.35rem] font-semibold tracking-tight text-foreground">Password sign-in</h2>
            <p className="mt-1.5 text-sm leading-6 text-foreground/68">
              {phoneAuthEnabled ? "Use the email or phone number connected to your account." : "Use the email connected to your account."}
            </p>

            <PasswordStatusBanners created={params.created} error={params.error} />

            <PasswordAuthForm stackAvailable={stackStatus.available} nextPath={nextPath} />
          </div>

          {phoneAuthEnabled ? (
            <div className="section-card p-3.5 md:p-4">
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-foreground">Phone sign-in code</h2>
              <p className="mt-1.5 text-sm leading-6 text-foreground/68">
                Use this after you verify a phone number in settings. We only send codes to phone numbers already attached to your account.
              </p>

              <PhoneOtpForm stackAvailable={stackStatus.available} nextPath={nextPath} />
            </div>
          ) : null}

          <div className="section-card p-3.5 md:p-4">
            <h2 className="text-[1.35rem] font-semibold tracking-tight text-foreground">Email sign-in code</h2>
            <p className="mt-1.5 text-sm leading-6 text-foreground/68">
              We send a code you can enter here, and the same email also includes a sign-in link as a fallback.
            </p>

            {params.sent ? (
              <div className="mt-3">
                <FeedbackBanner
                  title="Sign-in email sent"
                  body="Check your inbox, then enter the code here or open the sign-in link to finish signing in."
                />
              </div>
            ) : null}

            <MagicLinkForm stackAvailable={stackStatus.available} nextPath={nextPath} />
          </div>

          <details className="section-card p-3.5 md:p-4">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
              Local recovery tools
            </summary>
            <div className="mt-4 grid gap-4 text-sm leading-7 text-foreground/72">
              <p>
                If you&apos;re running the app on your own machine, use this section to recover or reseed a local account after resetting the local database.
              </p>
              <div className="rounded-lg border border-border/80 bg-surface-muted px-3.5 py-3">
                <p className="font-semibold text-foreground">Sign-in service status</p>
                <p className="mt-1 text-foreground/68">{stackStatus.message}</p>
              </div>

              {params.prepared ? (
                <FeedbackBanner
                  title="Local account is ready"
                  body="Sign in above with the email and password you just entered."
                />
              ) : null}

              <LocalAccountForm stackAvailable={stackStatus.available} nextPath={nextPath} />
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
