"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

const LAST_NON_NOTIFICATIONS_PATH_KEY = "last-non-notifications-path";

function isNotificationsPath(pathname: string) {
  return pathname === "/notifications" || pathname.startsWith("/notifications/");
}

export function NotificationsBellLink({ unreadCount }: Readonly<{ unreadCount: number }>) {
  const pathname = usePathname();
  const onNotificationsPage = isNotificationsPath(pathname);

  useEffect(() => {
    if (onNotificationsPage) {
      return;
    }

    globalThis.sessionStorage?.setItem(LAST_NON_NOTIFICATIONS_PATH_KEY, pathname || "/dashboard");
  }, [onNotificationsPage, pathname]);

  const href = useMemo(() => {
    if (!onNotificationsPage) {
      return `/notifications?from=${encodeURIComponent(pathname || "/dashboard")}`;
    }

    return globalThis.sessionStorage?.getItem(LAST_NON_NOTIFICATIONS_PATH_KEY) || "/dashboard";
  }, [onNotificationsPage, pathname]);

  return (
    <Link
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-surface-muted text-foreground/72 transition hover:border-accent/25 hover:bg-surface-strong ${onNotificationsPage ? "border-accent/35 text-accent-strong" : "border-border"}`}
      href={href}
      aria-label={onNotificationsPage ? "Return from notifications" : "Open notifications"}
      aria-current={onNotificationsPage ? "page" : undefined}
      prefetch
    >
      <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
        <path d="M15 17h5l-1.4-1.4c-.4-.4-.6-.9-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
        <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
      </svg>
      {unreadCount > 0 ? (
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#2a74ff]" />
      ) : null}
    </Link>
  );
}
