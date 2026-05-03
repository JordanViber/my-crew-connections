"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type DesktopNavItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav({ items }: Readonly<{ items: DesktopNavItem[] }>) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="hidden text-sm font-medium text-foreground/70 md:flex md:flex-wrap md:gap-2 md:px-0">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            className={`button-secondary relative overflow-hidden ${active ? "text-accent-strong" : ""}`}
            href={item.href}
            onFocus={() => router.prefetch(item.href)}
            onPointerDown={() => router.prefetch(item.href)}
            prefetch
          >
            {active ? (
              <motion.span
                layoutId="desktop-nav-active"
                className="absolute inset-0 bg-accent-soft"
                transition={{ type: "spring", stiffness: 360, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
