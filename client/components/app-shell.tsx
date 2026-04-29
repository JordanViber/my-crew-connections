import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/connections", label: "People" },
  { href: "/groups", label: "Groups" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  title,
  subtitle,
  email,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  email: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="shell px-2 py-2 md:px-5 md:py-4">
      <div className="glass-panel mx-auto max-w-7xl px-3 py-3 md:px-5 md:py-5">
        <header className="border-b border-border/70 pb-3 md:pb-4">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-accent-strong md:gap-3 md:text-xs md:tracking-[0.22em]">
                <span>My Crew Connections</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                <div className="inline-flex max-w-full items-center rounded-lg border border-border/85 bg-white/72 px-2.5 py-1.5 text-[0.78rem] text-foreground/68 md:text-sm">
                  <span className="min-w-0 truncate">{email}</span>
                </div>
                <form action={signOutAction}>
                  <button className="button-secondary text-sm" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-[1.9rem] leading-[1.04] font-semibold tracking-tight text-foreground md:text-[2.35rem]">{title}</h1>
                <p className="mt-1.5 max-w-2xl text-[0.92rem] leading-6 text-foreground/68 md:text-[0.95rem]">{subtitle}</p>
              </div>

              <nav className="hidden text-sm font-medium text-foreground/70 md:flex md:flex-wrap md:gap-2 md:px-0">
                {navigation.map((item) => (
                  <Link key={item.href} className="button-secondary shrink-0" href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <div className="pb-28 pt-3 md:pb-0 md:pt-4">{children}</div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
