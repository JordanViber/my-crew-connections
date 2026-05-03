import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { DesktopNav } from "@/components/desktop-nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/connections", label: "People" },
  { href: "/groups", label: "Groups" },
];

export async function AppShell({
  title,
  subtitle,
  email,
  firstName,
  displayName,
  backHref,
  backLabel,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  email: string;
  firstName?: string | null;
  displayName?: string | null;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let unreadNotifications = 0;

  if (user) {
    const { count } = await supabase
      .from("in_app_notifications")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", user.id)
      .is("read_at", null);

    unreadNotifications = count ?? 0;
  }

  return (
    <div className="shell px-2 py-2 md:px-5 md:py-4">
      <PwaInstallBanner />
      <div className="glass-panel mx-auto max-w-7xl px-3 py-3 md:px-5 md:py-5">
        <header className="border-b border-border/70 pb-3 md:pb-4">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-accent-strong md:gap-3 md:text-xs md:tracking-[0.22em]">
                <span>My Crew Connections</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                <Link
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-muted text-foreground/72 transition hover:border-accent/25 hover:bg-surface-strong"
                  href="/notifications"
                  aria-label="Open notifications"
                >
                  <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
                    <path d="M15 17h5l-1.4-1.4c-.4-.4-.6-.9-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
                    <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
                  </svg>
                  {unreadNotifications > 0 ? (
                    <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#2a74ff]" />
                  ) : null}
                </Link>
                <AccountMenu displayName={displayName} email={email} firstName={firstName} />
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                {backHref ? (
                  <Link
                    className="mb-2 inline-flex text-sm font-semibold text-foreground/64 transition hover:text-foreground"
                    href={backHref}
                  >
                    {backLabel ?? "Back"}
                  </Link>
                ) : null}
                <h1 className="text-[1.9rem] leading-[1.04] font-semibold tracking-tight text-foreground md:text-[2.35rem]">{title}</h1>
                <p className="mt-1.5 max-w-2xl text-[0.92rem] leading-6 text-foreground/68 md:text-[0.95rem]">{subtitle}</p>
              </div>

              <DesktopNav items={navigation} />
            </div>
          </div>
        </header>

        <div className="pb-28 pt-3 md:pb-0 md:pt-4">{children}</div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
