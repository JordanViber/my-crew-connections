import { redirect } from "next/navigation";
import { FeedbackBanner } from "@/components/feedback-banner";
import { LocalAccountForm } from "@/components/local-account-form";
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
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent-strong">Welcome back</p>
          <h1 className="text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
            Stay close to the people who matter.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-foreground/72">
            Sign in with your password or send yourself an email link when you want a lighter way back into your dashboard.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Use password sign-in when you want the fastest path back in.",
              "Send a sign-in link when you prefer email over passwords.",
              "Jump back into people, groups, plans, and recent history in one place.",
            ].map((step, index) => (
              <div key={step} className="section-card rounded-[1.4rem] p-5 text-sm leading-7 text-foreground/75">
                <p className="font-semibold uppercase tracking-[0.2em] text-accent-strong">Step {index + 1}</p>
                <p className="mt-3">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          {stackStatus.available ? null : (
            <FeedbackBanner
              title="Sign-in is currently unavailable"
              body="The sign-in service couldn’t be reached just now. Please try again in a moment."
              tone="error"
            />
          )}

          <div className="section-card rounded-[1.8rem] p-6 md:p-8">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Password sign-in</h2>
            <p className="mt-3 text-sm leading-7 text-foreground/72">
              Use the email and password connected to your account.
            </p>

            {params.error ? (
              <div className="mt-5">
                <FeedbackBanner title="Sign-in issue" body={params.error} tone="error" />
              </div>
            ) : null}

            <PasswordAuthForm stackAvailable={stackStatus.available} nextPath={nextPath} />
          </div>

          <div className="section-card rounded-[1.8rem] p-6 md:p-8">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Email sign-in link</h2>
            <p className="mt-3 text-sm leading-7 text-foreground/72">
              Use this when you want a sign-in link sent straight to your inbox.
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

          <details className="section-card rounded-[1.8rem] p-6 md:p-8">
            <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">
              Need help signing in on this device?
            </summary>
            <div className="mt-4 grid gap-4 text-sm leading-7 text-foreground/72">
              <p>
                If you&apos;re trying the app on your own machine, use this section to create an account for this device or recover after resetting local data.
              </p>
              <div className="rounded-[1.2rem] border border-border/80 bg-white/65 px-4 py-3">
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
