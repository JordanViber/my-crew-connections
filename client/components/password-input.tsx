"use client";

import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className = "", disabled, ...props }: Readonly<PasswordInputProps>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} className={`${className} pr-12`} disabled={disabled} type={visible ? "text" : "password"} />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-1 right-1 inline-flex w-10 items-center justify-center rounded-md text-foreground/56 transition hover:bg-black/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? (
          <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
            <path d="M3 3l18 18" />
            <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83" />
            <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4.91c5.05 0 9.27 3.11 10.8 7.09a11.76 11.76 0 0 1-4.16 5.44" />
            <path d="M6.61 6.61A11.8 11.8 0 0 0 1.2 12c.77 2 2.16 3.77 3.99 5.06" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}