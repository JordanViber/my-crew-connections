import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getHangoutStatusLabel } from "@/lib/hangouts";
import type { HangoutSummary } from "@/lib/mvp-data";

export function HangoutList({
  hangouts,
  emptyCopy,
  completeAction,
  cancelAction,
  redirectTo,
  showTargetLabel = false,
}: Readonly<{
  hangouts: HangoutSummary[];
  emptyCopy: string;
  completeAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  redirectTo: string;
  showTargetLabel?: boolean;
}>) {
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
            </div>
            <span className="rounded-full bg-[rgba(31,42,44,0.06)] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/60">
              {hangout.targetType}
            </span>
          </div>

          {hangout.location ? <p className="mt-3 text-sm text-foreground/68">Location: {hangout.location}</p> : null}
          {hangout.notes ? <p className="mt-2 text-sm leading-6 text-foreground/72">{hangout.notes}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <a className="button-secondary" href={`/plan.ics?hangoutId=${hangout.id}`}>
              Export to calendar
            </a>

            {hangout.status === "planned" ? (
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
          </div>
        </article>
      ))}
    </div>
  );
}
