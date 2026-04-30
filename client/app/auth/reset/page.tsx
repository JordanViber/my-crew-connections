import { PasswordResetRequestForm } from "@/components/password-reset-request-form";

export default function PasswordResetPage() {
  return (
    <main className="shell flex items-center justify-center px-3 py-3 md:px-8 md:py-6">
      <div className="glass-panel grid max-w-xl gap-4 p-4 md:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">Password reset</p>
          <h1 className="mt-3 text-[2.15rem] font-semibold leading-none tracking-tight text-foreground md:text-[2.75rem]">Reset your password.</h1>
          <p className="mt-3 text-base leading-7 text-foreground/70">
            Enter your account email and we will send a secure reset link.
          </p>
        </div>

        <div className="section-card p-3.5 md:p-4">
          <PasswordResetRequestForm />
        </div>
      </div>
    </main>
  );
}
