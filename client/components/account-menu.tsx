"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction, submitFeedbackAction } from "@/app/actions";

function getInitial(firstName?: string | null, displayName?: string | null, email?: string | null) {
  const source = firstName || displayName || email || "A";
  return source.trim().charAt(0).toUpperCase() || "A";
}

export function AccountMenu({
  email,
  firstName,
  displayName,
}: Readonly<{
  email: string;
  firstName?: string | null;
  displayName?: string | null;
}>) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const initial = getInitial(firstName, displayName, email);
  const accountName = displayName || firstName || email;
  const menuItemClass = "block w-full cursor-pointer rounded-md px-3 py-2 text-left font-medium text-foreground/78 transition hover:bg-surface-muted";

  return (
    <div className="relative">
      <button
        aria-label="Open account menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-10 max-w-[12rem] items-center gap-2 rounded-full border border-border bg-surface-muted p-1.5 pr-2.5 text-sm font-semibold text-foreground transition hover:border-accent/25 hover:bg-surface-strong"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-[0.82rem] text-accent-strong">
          {initial}
        </span>
        <span className="max-w-[7.5rem] truncate">{firstName || displayName || "Account"}</span>
        <svg aria-hidden="true" className="h-3.5 w-3.5 text-foreground/58" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-[calc(100%+0.55rem)] z-50 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface-strong p-1.5 text-sm shadow-[0_18px_42px_rgba(0,0,0,0.16)] sm:left-auto sm:right-0"
          role="menu"
        >
          <div className="border-b border-border/70 px-3 py-2.5">
            <p className="truncate font-semibold text-foreground">{accountName}</p>
            <p className="mt-0.5 truncate text-xs text-foreground/58">{email}</p>
          </div>

          <Link className={menuItemClass} href="/settings" onClick={() => setIsOpen(false)} role="menuitem">
            Settings
          </Link>
          <Link className={menuItemClass} href="/settings#billing" onClick={() => setIsOpen(false)} role="menuitem">
            Billing
          </Link>
          <button
            className={menuItemClass}
            onClick={() => {
              setIsOpen(false);
              setIsFeedbackOpen(true);
            }}
            role="menuitem"
            type="button"
          >
            Send feedback
          </button>
          <form action={signOutAction} className="pt-1">
            <button className={menuItemClass} role="menuitem" type="submit">
              Sign out
            </button>
          </form>
        </div>
      ) : null}

      {isFeedbackOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6 backdrop-blur-sm" role="presentation">
          <form action={submitFeedbackAction} className="grid w-full max-w-md gap-4 rounded-lg border border-border bg-surface-strong p-4 shadow-[0_24px_60px_rgba(0,0,0,0.22)]" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
            <input name="redirectTo" type="hidden" value={pathname} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-title" className="text-[1.25rem] font-semibold tracking-tight text-foreground">Send feedback</h2>
                <p className="mt-1 text-sm leading-6 text-foreground/64">Share what felt off, what worked, or what you want next.</p>
              </div>
              <button aria-label="Close feedback form" className="theme-toggle h-9 w-9 shrink-0" onClick={() => setIsFeedbackOpen(false)} type="button">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <label className="grid gap-2">
              <span className="field-label">Category</span>
              <select className="field-input" name="category" defaultValue="general">
                <option value="general">General</option>
                <option value="bug">Bug</option>
                <option value="billing">Billing</option>
                <option value="idea">Idea</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="field-label">Message</span>
              <textarea className="field-input min-h-32" name="message" placeholder="Tell me what happened or what would make this better." required />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="button-secondary" onClick={() => setIsFeedbackOpen(false)} type="button">
                Cancel
              </button>
              <button className="button-primary" type="submit">
                Send feedback
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
