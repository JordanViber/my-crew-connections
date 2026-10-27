"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitClaimConnectionInvite } from "@/app/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { PrefetchLink } from "@/components/prefetch-link";
import { SectionCard } from "@/components/section-card";

export function ClaimConnectionForm({
  token,
  description,
}: Readonly<{
  token: string;
  description: string;
}>) {
  const router = useRouter();
  const [claimed, setClaimed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function claim(formData: FormData) {
    setErrorMessage(null);
    const result = await submitClaimConnectionInvite(formData);

    if (result.ok) {
      if (result.href.includes("claimed=1")) {
        setClaimed(true);
      }

      router.replace(result.href);
      router.refresh();
      return;
    }

    setErrorMessage(result.message);
  }

  if (claimed) {
    return (
      <SectionCard title="Invite claimed" description="This connection is already linked to a real app user.">
        <PrefetchLink className="button-primary w-full sm:w-auto" href="/dashboard">
          Open dashboard
        </PrefetchLink>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Claim this connection"
      description={description}
    >
      <form action={claim} className="grid gap-3">
        <input type="hidden" name="token" value={token} />
        {errorMessage ? (
          <p className="rounded-lg bg-[#f8d2ca] px-3 py-2.5 text-sm font-medium text-[#7c291d]" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <PendingSubmitButton
          className="button-primary w-full sm:w-auto"
          idleLabel="Claim connection"
          pendingLabel="Claiming..."
        />
      </form>
    </SectionCard>
  );
}
