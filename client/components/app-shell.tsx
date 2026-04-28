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
    <div className="shell px-2.5 py-2.5 md:px-6 md:py-5">
      <div className="glass-panel mx-auto max-w-7xl rounded-4xl px-3.5 py-3.5 md:px-6 md:py-6">
        <header className="border-b border-border/70 pb-3.5 md:pb-5">
          <div className="flex flex-col gap-3.5 md:gap-4.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent-strong md:gap-3 md:text-sm md:tracking-[0.28em]">
                <span>My Crew Connections</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
                <div className="inline-flex max-w-full items-center rounded-full border border-border/85 bg-white/72 px-3 py-1.5 text-[0.82rem] text-foreground/68 md:text-sm">
                  <span className="min-w-0 truncate">{email}</span>
                </div>
                <form action={signOutAction}>
                  <button className="button-secondary px-4 py-2 text-sm md:px-[1.05rem] md:py-[0.7rem]" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2.5 md:space-y-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-accent-strong md:text-[0.72rem]">
                  Your relationship space
                </p>
                <div>
                  <h1 className="text-[2.15rem] leading-[1.02] font-semibold tracking-tight text-foreground md:text-[2.85rem]">{title}</h1>
                  <p className="mt-2 max-w-2xl text-[0.98rem] leading-7 text-foreground/70 md:text-[0.98rem] md:leading-7">{subtitle}</p>
                </div>
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

        <div className="pb-34 pt-3.5 md:pb-0 md:pt-5">{children}</div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
