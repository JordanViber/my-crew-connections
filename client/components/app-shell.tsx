import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/connections", label: "People" },
  { href: "/groups", label: "Groups" },
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
    <div className="shell px-3 py-3 md:px-6 md:py-5">
      <div className="glass-panel mx-auto max-w-7xl rounded-4xl px-4 py-4 md:px-6 md:py-6">
        <header className="border-b border-border/70 pb-4 md:pb-5">
          <div className="flex flex-col gap-4 md:gap-4.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent-strong md:gap-3 md:text-sm md:tracking-[0.28em]">
                <span>My Crew Connections</span>
                <span className="rounded-full border border-accent/15 bg-white/75 px-3 py-1 text-[0.62rem] text-foreground/72 md:text-[0.68rem]">
                  Private by default
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <div className="inline-flex max-w-full items-center rounded-full border border-border/85 bg-white/72 px-3 py-1.5 text-xs text-foreground/68 md:text-sm">
                  <span className="min-w-0 truncate">{email}</span>
                </div>
                <form action={signOutAction}>
                  <button className="button-secondary" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent-strong md:text-[0.72rem]">
                  Your relationship space
                </p>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-[2.85rem]">{title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/70 md:text-[0.98rem] md:leading-7">{subtitle}</p>
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

        <div className="pb-34 pt-4 md:pb-0 md:pt-5">{children}</div>
      </div>
      <MobileBottomNav title={title} email={email} />
    </div>
  );
}
