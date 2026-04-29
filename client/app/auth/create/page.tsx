import Link from "next/link";
import { redirect } from "next/navigation";
import { AppleAuthButton } from "@/components/apple-auth-button";
import { CreateAccountForm } from "@/components/create-account-form";
import { FeedbackBanner } from "@/components/feedback-banner";
import { env } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLocalSupabaseStatus } from "@/lib/supabase/local-stack-status";

function isLocalSupabaseHost(url: string) {
  const hostname = new URL(url).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export default async function CreateAccountPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ next?: string }>;
}>) {
  const params = await searchParams;
  const nextPath = params.next ?? "/dashboard";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  const stackStatus = await getLocalSupabaseStatus();
  const preferLocalHelper = isLocalSupabaseHost(env.supabaseUrl);

  return (
    <main className="shell flex items-center justify-center px-3 py-3 md:px-8 md:py-6">
      <div className="glass-panel grid max-w-5xl gap-4 p-4 md:grid-cols-[0.72fr_1.28fr] md:p-5">
        <section className="grid content-start gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">Create account</p>
            <h1 className="mt-3 text-[2.15rem] font-semibold leading-none tracking-tight text-foreground md:text-[2.75rem]">Create your account.</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-foreground/70">
              Start with your name, email, and password. Phone and mailing details can be finished now or later in settings.
            </p>
          </div>

          <div className="hidden gap-2 md:grid">
            <article className="section-card p-3 text-sm leading-6 text-foreground/75">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">Identity</p>
              <p className="mt-1.5">Your name anchors invites, reminders, and profile details.</p>
            </article>
            <article className="section-card p-3 text-sm leading-6 text-foreground/75">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">Security</p>
              <p className="mt-1.5">Choose a password now or continue with Apple.</p>
            </article>
            <article className="section-card p-3 text-sm leading-6 text-foreground/75">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">Contact</p>
              <p className="mt-1.5">Add phone or mailing details only if they are useful now.</p>
            </article>
          </div>

          <div className="rounded-lg border border-border/85 bg-white/72 px-3.5 py-3 text-sm leading-6 text-foreground/70">
            Already have an account? <Link className="font-semibold text-accent-strong" href="/auth">Go to sign in</Link>.
          </div>
        </section>

        <section className="grid gap-3">
          {stackStatus.available ? null : (
            <FeedbackBanner
              title="Account creation is currently unavailable"
              body="The auth service could not be reached just now. Start the local stack or refresh the auth service, then try again."
              tone="error"
            />
          )}

          <div className="section-card p-3.5 md:p-4">
            <h2 className="text-[1.35rem] font-semibold tracking-tight text-foreground">Create your account</h2>
            <p className="mt-1.5 text-sm leading-6 text-foreground/68">Continue with Apple for speed, or use email below.</p>

            <div className="mt-4">
              <AppleAuthButton nextPath={nextPath} />
            </div>

            <div className="my-4 flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-foreground/40">
              <span className="h-px flex-1 bg-border/80" />
              <span>Or continue with email</span>
              <span className="h-px flex-1 bg-border/80" />
            </div>

            <CreateAccountForm nextPath={nextPath} stackAvailable={stackStatus.available} preferLocalHelper={preferLocalHelper} />
          </div>
        </section>
      </div>
    </main>
  );
}
