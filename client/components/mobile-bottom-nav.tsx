"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "vaul";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/connections", label: "People" },
  { href: "/groups", label: "Groups" },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({
  title,
  email,
}: Readonly<{
  title: string;
  email: string;
}>) {
  const pathname = usePathname();
  const drawerTitle = title ? title.toLowerCase() : "this page";

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden">
      <div className="glass-panel mx-auto grid max-w-88 grid-cols-4 rounded-[1.55rem] border border-border/80 px-2 py-1.5 shadow-[0_18px_45px_rgba(69,42,24,0.16)] backdrop-blur-2xl">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative rounded-[1.05rem] px-2.5 py-2 text-center text-sm font-semibold transition ${active ? "text-accent-strong" : "text-foreground/68"}`}
            >
              {active ? (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute inset-0 rounded-[1.05rem] bg-[rgba(209,96,61,0.14)] shadow-[inset_0_0_0_1px_rgba(209,96,61,0.18)]"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}

        <Drawer.Root direction="bottom">
          <Drawer.Trigger asChild>
            <button className="rounded-[1.05rem] px-2.5 py-2 text-center text-sm font-semibold text-foreground/72 transition hover:bg-white/70" type="button">
              Menu
            </button>
          </Drawer.Trigger>

          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-[rgba(29,36,40,0.24)] backdrop-blur-[2px]" />
            <Drawer.Content aria-label="Quick navigation menu" className="fixed inset-x-0 bottom-0 z-50 outline-none">
              <div className="mx-auto max-w-lg rounded-t-4xl border border-border/80 bg-[#fdf7f0]/95 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-22px_64px_rgba(69,42,24,0.16)] backdrop-blur-2xl">
                <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-foreground/12" />
                <Drawer.Title className="text-lg font-semibold tracking-tight text-foreground">Move around faster</Drawer.Title>
                <Drawer.Description className="mt-1 text-sm leading-6 text-foreground/68">
                  Quick navigation for {drawerTitle}.
                </Drawer.Description>

                <div className="mt-4 rounded-[1.2rem] border border-border/80 bg-white/76 px-4 py-3 text-sm text-foreground/72">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">Signed in</p>
                  <p className="mt-2 truncate font-medium text-foreground">{email}</p>
                </div>

                <div className="mt-4 grid gap-2">
                  {items.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Drawer.Close asChild key={item.href}>
                        <Link
                          className={`flex items-center justify-between rounded-[1.2rem] border px-4 py-3 text-sm font-semibold transition ${
                            active
                              ? "border-accent/25 bg-[rgba(209,96,61,0.12)] text-accent-strong"
                              : "border-border/80 bg-white/78 text-foreground/78"
                          }`}
                          href={item.href}
                        >
                          <span>{item.label}</span>
                          <span className="text-xs uppercase tracking-[0.18em] text-foreground/48">Open</span>
                        </Link>
                      </Drawer.Close>
                    );
                  })}
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </nav>
  );
}
