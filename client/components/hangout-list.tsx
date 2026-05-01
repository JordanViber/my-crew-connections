"use client";

import { useEffect, useRef } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getHangoutStatusLabel } from "@/lib/hangouts";
import type { HangoutSummary } from "@/lib/mvp-data";

export function HangoutList({
  hangouts,
  emptyCopy,
  confirmAction,
  completeAction,
  cancelAction,
  respondAction,
  redirectTo,
  autoExportHangoutId,
  showTargetLabel = false,
}: Readonly<{
  hangouts: HangoutSummary[];
  emptyCopy: string;
  confirmAction: (formData: FormData) => void | Promise<void>;
  completeAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  respondAction: (formData: FormData) => void | Promise<void>;
  redirectTo: string;
  autoExportHangoutId?: string;
  showTargetLabel?: boolean;
}>) {
  const exportedHangoutIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoExportHangoutId || exportedHangoutIdRef.current === autoExportHangoutId) {
      return;
    }

    const hangout = hangouts.find((current) => current.id === autoExportHangoutId && current.canExportCalendar);

    if (!hangout) {
      return;
    }

    exportedHangoutIdRef.current = autoExportHangoutId;
    const link = document.createElement("a");
    link.href = `/plan.ics?hangoutId=${hangout.id}`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete("exportHangoutId");
    window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, [autoExportHangoutId, hangouts]);

  if (hangouts.length === 0) {
    return <p className="text-sm leading-7 text-foreground/68">{emptyCopy}</p>;
  }

  return (
    <div className="grid gap-3">
      {hangouts.map((hangout) => (
        <article key={hangout.id} className="rounded-lg border border-border/85 bg-white/80 p-3.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                {hangout.bucketLabel} / {getHangoutStatusLabel(hangout.status)}
              </p>
              <h3 className="mt-1.5 text-[1.1rem] font-semibold text-foreground">{hangout.title}</h3>
              {showTargetLabel ? <p className="mt-1 text-sm text-foreground/65">{hangout.targetLabel}</p> : null}
              <p className="mt-2 text-sm font-medium text-foreground/72">{hangout.windowLabel}</p>
              {hangout.targetType === "group" ? (
                <p className="mt-2 text-sm text-foreground/68">
                  {hangout.proposalState === "pending"
                    ? `${hangout.responseCounts.accepted} accepted / ${hangout.responseCounts.declined} declined / ${hangout.responseCounts.pending} pending`
                    : "Group plan confirmed"}
                </p>
              ) : null}
              {hangout.viewerRole === "participant" && hangout.viewerResponse ? (
                <p className="mt-1 text-sm text-foreground/65">Your response: {hangout.viewerResponse}</p>
              ) : null}
            </div>
            <span className="rounded-full bg-[rgba(31,42,44,0.06)] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/60">
              {hangout.targetType}
            </span>
          </div>

          {hangout.location ? <p className="mt-3 text-sm text-foreground/68">Location: {hangout.location}</p> : null}
          {hangout.notes ? <p className="mt-2 text-sm leading-6 text-foreground/72">{hangout.notes}</p> : null}
          {hangout.photoAlbumUrl ? (
            <p className="mt-2 text-sm text-foreground/68">
              Shared photo album:{" "}
              <a className="font-medium text-accent-strong underline underline-offset-2" href={hangout.photoAlbumUrl} target="_blank" rel="noreferrer">
                {hangout.photoAlbumLabel || "Open album"}
              </a>
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {hangout.canExportCalendar ? (
              <a className="button-secondary" href={`/plan.ics?hangoutId=${hangout.id}`}>
                Export to calendar
              </a>
            ) : null}

            {hangout.canRespond ? (
              <>
                <form action={respondAction}>
                  <input type="hidden" name="hangoutId" value={hangout.id} />
                  <input type="hidden" name="responseStatus" value="accepted" />
                  <input type="hidden" name="downloadCalendar" value="true" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <button className="button-primary" type="submit">
                    Accept and export calendar
                  </button>
                </form>

                <form action={respondAction}>
                  <input type="hidden" name="hangoutId" value={hangout.id} />
                  <input type="hidden" name="responseStatus" value="declined" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <button className="button-secondary" type="submit">
                    Decline
                  </button>
                </form>
              </>
            ) : null}

            {hangout.status === "planned" && hangout.canManage && hangout.targetType === "group" && hangout.proposalState === "pending" ? (
              <form action={confirmAction}>
                <input type="hidden" name="hangoutId" value={hangout.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <button className="button-primary" type="submit">
                  Keep plan
                </button>
              </form>
            ) : null}

            {hangout.status === "planned" && hangout.canManage && (hangout.targetType !== "group" || hangout.proposalState === "confirmed") ? (
              <>
                <form action={completeAction}>
                  <input type="hidden" name="hangoutId" value={hangout.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <button className="button-secondary" type="submit">
                    Log as completed
                  </button>
                </form>

                <form action={cancelAction}>
                  <input type="hidden" name="hangoutId" value={hangout.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <ConfirmSubmitButton confirmMessage="Cancel this saved plan?">
                    Cancel plan
                  </ConfirmSubmitButton>
                </form>
              </>
            ) : null}

            {hangout.status === "planned" && hangout.canManage && hangout.targetType === "group" && hangout.proposalState === "pending" ? (
              <form action={cancelAction}>
                <input type="hidden" name="hangoutId" value={hangout.id} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <ConfirmSubmitButton confirmMessage="Delete this proposal instead of keeping it?">
                  Delete proposal
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
