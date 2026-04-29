"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: "M4 13.5 12 5l8 8.5M6.5 11.2v7.3h11v-7.3M10 18.5v-4h4v4" },
  { href: "/connections", label: "People", icon: "M8.8 11.5a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2ZM3.8 19c.5-2.7 2.3-4.3 5-4.3 1.3 0 2.4.4 3.2 1.1M15.4 11a2.6 2.6 0 1 0 0-5.2M13.9 18.7c.5-1.8 1.8-2.8 3.7-2.8 1.7 0 3 .9 3.6 2.8" },
  { href: "/groups", label: "Groups", icon: "M7.5 9.7a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM3.2 16.8c.5-2.4 2-3.8 4.3-3.8s3.8 1.4 4.3 3.8M16.5 9.7a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM12.2 16.8c.5-2.4 2-3.8 4.3-3.8s3.8 1.4 4.3 3.8" },
  { href: "/settings", label: "Settings", icon: "M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2ZM4.8 14.3l-1.1-.8v-3l1.1-.8.8-1.9-.3-1.3 2.1-2.1 1.3.3 1.9-.8.8-1.1h3l.8 1.1 1.9.8 1.3-.3 2.1 2.1-.3 1.3.8 1.9 1.1.8v3l-1.1.8-.8 1.9.3 1.3-2.1 2.1-1.3-.3-1.9.8-.8 1.1h-3l-.8-1.1-1.9-.8-1.3.3-2.1-2.1.3-1.3-.8-1.9Z" },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-2 bottom-2 z-40 md:hidden">
      <div className="glass-panel mx-auto grid max-w-86 grid-cols-4 border border-border/80 px-1.5 py-1.5 shadow-[0_12px_28px_rgba(31,44,49,0.14)] backdrop-blur-xl">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative grid min-h-[3.25rem] place-items-center gap-1 rounded-lg px-2 py-1.5 text-center text-[0.72rem] font-semibold transition ${active ? "text-accent-strong" : "text-foreground/68"}`}
            >
              {active ? (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute inset-0 rounded-lg bg-accent-soft shadow-[inset_0_0_0_1px_rgba(209,96,61,0.18)]"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10">
                <svg aria-hidden="true" className="mx-auto h-[1.125rem] w-[1.125rem]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
                  <path d={item.icon} />
                </svg>
                <span className="mt-0.5 block">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
