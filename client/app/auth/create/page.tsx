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
    <main className="shell flex items-center justify-center px-4 py-6 md:px-8">
      <div className="glass-panel grid max-w-6xl gap-6 rounded-4xl p-6 md:grid-cols-[0.9fr_1.1fr] md:p-10">
        <section className="grid content-start gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent-strong">Create account</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-foreground md:text-6xl">Create your account in one step.</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-foreground/72">
              Add your name, contact details, secure password, and mailing address from the start.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="section-card rounded-[1.35rem] p-4 text-sm leading-6 text-foreground/75">
              <p className="font-semibold uppercase tracking-[0.2em] text-accent-strong">Identity</p>
              <p className="mt-2">Your name and phone number stay attached to the account.</p>
            </article>
            <article className="section-card rounded-[1.35rem] p-4 text-sm leading-6 text-foreground/75">
              <p className="font-semibold uppercase tracking-[0.2em] text-accent-strong">Security</p>
              <p className="mt-2">Choose a password now or continue with Apple.</p>
            </article>
            <article className="section-card rounded-[1.35rem] p-4 text-sm leading-6 text-foreground/75">
              <p className="font-semibold uppercase tracking-[0.2em] text-accent-strong">Address</p>
              <p className="mt-2">Type once and let the rest of the fields fill in.</p>
            </article>
          </div>

          <div className="rounded-[1.6rem] border border-border/85 bg-white/68 px-5 py-4 text-sm leading-7 text-foreground/72">
            Already have an account? <Link className="font-semibold text-accent-strong" href="/auth">Go to sign in</Link>.
          </div>
        </section>

        <section className="grid gap-4">
          {stackStatus.available ? null : (
            <FeedbackBanner
              title="Account creation is currently unavailable"
              body="The auth service could not be reached just now. Start the local stack or refresh the auth service, then try again."
              tone="error"
            />
          )}

          <div className="section-card rounded-[1.8rem] p-6 md:p-8">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Create your account</h2>
            <p className="mt-3 text-sm leading-7 text-foreground/72">Continue with Apple for speed, or use email below.</p>

            <div className="mt-5">
              <AppleAuthButton nextPath={nextPath} />
            </div>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/40">
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