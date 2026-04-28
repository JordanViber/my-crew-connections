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
      </div>
    </nav>
  );
}
