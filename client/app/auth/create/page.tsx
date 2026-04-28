import Link from "next/link";
import { redirect } from "next/navigation";
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
      <div className="glass-panel grid max-w-6xl gap-8 rounded-4xl p-6 md:grid-cols-[0.92fr_1.08fr] md:p-10">
        <section className="grid content-start gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent-strong">Create account</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-foreground md:text-6xl">Set up the account you will actually want to keep.</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-foreground/72">
              Start with real identity details now so invites, receipts, billing, and future account tools do not depend on your sign-in email alone.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="section-card rounded-[1.4rem] p-5 text-sm leading-7 text-foreground/75">
              <p className="font-semibold uppercase tracking-[0.2em] text-accent-strong">Standard identity</p>
              <p className="mt-3">Collect first name, last name, phone, and sign-in details up front instead of treating the account like a temporary test login.</p>
            </article>
            <article className="section-card rounded-[1.4rem] p-5 text-sm leading-7 text-foreground/75">
              <p className="font-semibold uppercase tracking-[0.2em] text-accent-strong">Billing later</p>
              <p className="mt-3">Address is optional today, but there is already a clear place to save it before subscriptions arrive.</p>
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
            <p className="mt-3 text-sm leading-7 text-foreground/72">
              This account flow is now separate from sign-in so first-time setup can collect the details a real settings screen expects.
            </p>

            <div className="mt-6">
              <CreateAccountForm nextPath={nextPath} stackAvailable={stackStatus.available} preferLocalHelper={preferLocalHelper} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}