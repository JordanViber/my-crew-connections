"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/connections", label: "People" },
  { href: "/groups", label: "Groups" },
  { href: "/settings", label: "Settings" },
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
              className={`relative rounded-lg px-2 py-1.5 text-center text-[0.82rem] font-semibold transition ${active ? "text-accent-strong" : "text-foreground/68"}`}
            >
              {active ? (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute inset-0 rounded-lg bg-[rgba(209,96,61,0.12)] shadow-[inset_0_0_0_1px_rgba(209,96,61,0.18)]"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
