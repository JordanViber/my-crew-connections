import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="shell flex items-center justify-center px-4 py-6 md:px-8">
      <div className="glass-panel grid max-w-5xl gap-8 rounded-[2rem] p-6 md:grid-cols-[1.2fr_0.9fr] md:p-10">
        <section className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent-strong">Magic link sign-in</p>
          <h1 className="text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
            Start with the smallest possible step.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-foreground/72">
            The MVP uses email magic links only. No passwords, no extra providers, and no friction beyond getting you into the dashboard.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Add a few people or one recurring crew.",
              "Set a reconnect cadence that feels healthy.",
              "Log the next coffee, call, or dinner with almost no ceremony.",
            ].map((step, index) => (
              <div key={step} className="section-card rounded-[1.4rem] p-5 text-sm leading-7 text-foreground/75">
                <p className="font-semibold uppercase tracking-[0.2em] text-accent-strong">Step {index + 1}</p>
                <p className="mt-3">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-card rounded-[1.8rem] p-6 md:p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Send your sign-in link</h2>
          <p className="mt-3 text-sm leading-7 text-foreground/72">
            Use the same email you want tied to your local Supabase account.
          </p>

          {params.sent ? (
            <p className="mt-5 rounded-2xl bg-mint px-4 py-3 text-sm font-medium text-[#214c35]">
              Magic link sent. Check Mailpit at http://127.0.0.1:54324 if you are using the local stack.
            </p>
          ) : null}

          {params.error ? (
            <p className="mt-5 rounded-2xl bg-[#f8d2ca] px-4 py-3 text-sm font-medium text-[#7c291d]">{params.error}</p>
          ) : null}

          <form action={signInAction} className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="field-label">Email</span>
              <input className="field-input" type="email" name="email" placeholder="you@example.com" required />
            </label>

            <button className="button-primary mt-2" type="submit">
              Email me the magic link
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}