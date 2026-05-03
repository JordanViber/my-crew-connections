import type { ReactNode } from "react";

export function ExternalLink({
  href,
  children,
  className,
}: Readonly<{
  href: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <a
      className={className ?? "inline-flex items-center gap-1.5 font-medium text-accent-strong underline underline-offset-2"}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <span>{children}</span>
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 5h5v5" />
        <path d="M10 14 19 5" />
        <path d="M19 14v5H5V5h5" />
      </svg>
    </a>
  );
}