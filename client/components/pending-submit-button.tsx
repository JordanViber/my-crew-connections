"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  className = "button-primary",
}: Readonly<PendingSubmitButtonProps>) {
  const { pending } = useFormStatus();

  return (
    <button aria-busy={pending} className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
