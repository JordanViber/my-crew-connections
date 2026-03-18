import { redirect } from "next/navigation";
import { PasswordAuthForm } from "@/components/password-auth-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AuthPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; prepared?: string; sent?: string }>;
}>) {
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
      <div className="glass-panel grid max-w-5xl gap-8 rounded-4xl p-6 md:grid-cols-[1.2fr_0.9fr] md:p-10">
        <section className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent-strong">Local email sign-in</p>
          <h1 className="text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
            Get into the MVP without the auth ceremony.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-foreground/72">
            For local development, email and password is the fastest path into the dashboard. You can create or reset a local account below and reuse it during MVP iteration.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Create or reset a local account in one click.",
              "Sign in with the same email and password repeatedly.",
              "Get straight to the logged-in dashboard and product loop.",
            ].map((step, index) => (
              <div key={step} className="section-card rounded-[1.4rem] p-5 text-sm leading-7 text-foreground/75">
                <p className="font-semibold uppercase tracking-[0.2em] text-accent-strong">Step {index + 1}</p>
                <p className="mt-3">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-card rounded-[1.8rem] p-6 md:p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Sign in locally</h2>
          <p className="mt-3 text-sm leading-7 text-foreground/72">
            Use the same local test account every time, or create/reset it if you need a clean password.
          </p>

          {params.prepared ? (
            <p className="mt-5 rounded-2xl bg-mint px-4 py-3 text-sm font-medium text-[#214c35]">
              Local account is ready. Sign in below with the email and password you just entered.
            </p>
          ) : null}

          {params.error ? (
            <p className="mt-5 rounded-2xl bg-[#f8d2ca] px-4 py-3 text-sm font-medium text-[#7c291d]">{params.error}</p>
          ) : null}

          <PasswordAuthForm />
        </section>
      </div>
    </main>
  );
}