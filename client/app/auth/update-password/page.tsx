import { PasswordUpdateForm } from "@/components/password-update-form";

export default async function UpdatePasswordPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ code?: string }>;
}>) {
  const params = await searchParams;

  return (
    <main className="shell flex items-center justify-center px-3 py-3 md:px-8 md:py-6">
      <div className="glass-panel grid max-w-xl gap-4 p-4 md:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">New password</p>
          <h1 className="mt-3 text-[2.15rem] font-semibold leading-none tracking-tight text-foreground md:text-[2.75rem]">Choose a new password.</h1>
          <p className="mt-3 text-base leading-7 text-foreground/70">
            Use at least 8 characters. Your next sign-in will use this password.
          </p>
        </div>

        <div className="section-card p-3.5 md:p-4">
          <PasswordUpdateForm code={params.code} />
        </div>
      </div>
    </main>
  );
}
