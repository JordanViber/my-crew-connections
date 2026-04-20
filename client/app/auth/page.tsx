import { redirect } from "next/navigation";
import { FeedbackBanner } from "@/components/feedback-banner";
import { MagicLinkForm } from "@/components/magic-link-form";
import { PasswordAuthForm } from "@/components/password-auth-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLocalSupabaseStatus } from "@/lib/supabase/local-stack-status";

export default async function AuthPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; prepared?: string; sent?: string; next?: string }>;
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

  return (
    <main className="shell flex items-center justify-center px-4 py-6 md:px-8">
      <div className="glass-panel grid max-w-5xl gap-8 rounded-4xl p-6 md:grid-cols-[1.2fr_0.9fr] md:p-10">
        <section className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent-strong">Dual-path localhost auth</p>
          <h1 className="text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
            Get into the MVP with the fastest path first.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-foreground/72">
            Local password auth is the quickest way to keep iterating on localhost, while magic link stays available for parity with the broader product direction and future hosted testing.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Create or reset a reusable local account in one click.",
              "Use password sign-in for day-to-day localhost iteration.",
              "Keep magic link around when you want the email-first flow.",
            ].map((step, index) => (
              <div key={step} className="section-card rounded-[1.4rem] p-5 text-sm leading-7 text-foreground/75">
                <p className="font-semibold uppercase tracking-[0.2em] text-accent-strong">Step {index + 1}</p>
                <p className="mt-3">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          {!stackStatus.available ? (
            <FeedbackBanner
              title="Local stack offline"
              body={stackStatus.message}
              tone="error"
            />
          ) : null}

          <div className="section-card rounded-[1.8rem] p-6 md:p-8">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Primary: local password</h2>
            <p className="mt-3 text-sm leading-7 text-foreground/72">
              Sign in with your existing local account, or create or reset it here if you need to.
            </p>

            {params.prepared ? (
              <div className="mt-5">
                <FeedbackBanner
                  title="Local account is ready"
                  body="Sign in below with the email and password you just entered."
                />
              </div>
            ) : null}

            {params.error ? (
              <div className="mt-5">
                <FeedbackBanner title="Sign-in issue" body={params.error} tone="error" />
              </div>
            ) : null}

            <PasswordAuthForm stackAvailable={stackStatus.available} nextPath={nextPath} />
          </div>

          <div className="section-card rounded-[1.8rem] p-6 md:p-8">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Secondary: magic link</h2>
            <p className="mt-3 text-sm leading-7 text-foreground/72">
              Use this when you want to exercise the email-first flow. It is slower on localhost, but it keeps the parity path healthy.
            </p>

            {params.sent ? (
              <div className="mt-5">
                <FeedbackBanner
                  title="Magic link sent"
                  body="Check your inbox, then come back through the confirmation link to finish sign-in."
                />
              </div>
            ) : null}

            <MagicLinkForm stackAvailable={stackStatus.available} nextPath={nextPath} />
          </div>
        </section>
      </div>
    </main>
  );
}
