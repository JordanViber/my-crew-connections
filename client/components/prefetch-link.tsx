"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

type PrefetchLinkProps = React.ComponentPropsWithoutRef<typeof Link>;

export function PrefetchLink({ href, className, children, ...props }: Readonly<PrefetchLinkProps>) {
  const router = useRouter();

  const warmRoute = useCallback(() => {
    if (typeof href === "string") {
      router.prefetch(href);
      return;
    }

    router.prefetch(href.pathname ?? "/");
  }, [href, router]);

  return (
    <Link
      {...props}
      href={href}
      prefetch
      className={className}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      onPointerDown={warmRoute}
      onTouchStart={warmRoute}
    >
      {children}
    </Link>
  );
}
