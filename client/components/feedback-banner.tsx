"use client";

import { useState } from "react";
import { getFeedbackClasses, type FeedbackTone } from "@/lib/feedback";

export function FeedbackBanner({
  title,
  body,
  tone = "success",
}: Readonly<{
  title: string;
  body: string;
  tone?: FeedbackTone;
}>) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg px-3.5 py-3 ${getFeedbackClasses(tone)}`}>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">{title}</p>
        <p className="mt-1.5 text-sm leading-6">{body}</p>
      </div>
      <button
        aria-label={`Dismiss ${title}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-current/15 text-current/75 transition hover:bg-current/10"
        onClick={() => setIsDismissed(true)}
        type="button"
      >
        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
