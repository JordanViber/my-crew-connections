import Link from "next/link";
import { signOutAction } from "@/app/actions";

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
}: {
  title: string;
  subtitle: string;
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell px-4 py-4 md:px-8 md:py-6">
      <div className="glass-panel mx-auto max-w-7xl rounded-[2rem] px-4 py-5 md:px-8 md:py-8">
        <header className="flex flex-col gap-6 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em] text-accent-strong">
              <span>My Crew Connections</span>
              <span className="h-1 w-1 rounded-full bg-accent" />
              <span>Local MVP</span>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-base leading-8 text-foreground/72">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <nav className="flex flex-wrap gap-3 text-sm font-medium text-foreground/70">
              {navigation.map((item) => (
                <Link key={item.href} className="button-secondary" href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3 text-sm text-foreground/65">
              <span>{email}</span>
              <form action={signOutAction}>
                <button className="button-secondary" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}