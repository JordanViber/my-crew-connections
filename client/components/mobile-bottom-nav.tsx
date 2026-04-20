"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/connections", label: "People" },
  { href: "/groups", label: "Groups" },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-4 z-40 md:hidden">
      <div className="glass-panel mx-auto grid max-w-sm grid-cols-3 rounded-[1.6rem] border border-border/80 px-2 py-1.5 shadow-[0_18px_45px_rgba(69,42,24,0.18)] backdrop-blur-2xl">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[1.15rem] px-3 py-2.5 text-center text-sm font-semibold transition ${
                active
                  ? "bg-[rgba(209,96,61,0.14)] text-accent-strong shadow-[inset_0_0_0_1px_rgba(209,96,61,0.18)]"
                  : "text-foreground/68"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
