import type { RecentTouchpoint } from "@/lib/mvp-data";

export function TouchpointTimeline({
  touchpoints,
  emptyCopy,
}: Readonly<{
  touchpoints: RecentTouchpoint[];
  emptyCopy: string;
}>) {
  if (touchpoints.length === 0) {
    return <p className="text-sm leading-7 text-foreground/68">{emptyCopy}</p>;
  }

  return (
    <div className="grid gap-3">
      {touchpoints.map((touchpoint) => (
        <article key={touchpoint.id} className="rounded-lg border border-border/85 bg-white/78 p-3.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-strong">{touchpoint.touchpointType}</p>
              {touchpoint.activityLabel || touchpoint.locationLabel ? (
                <p className="mt-2 text-sm font-medium text-foreground/70">
                  {[touchpoint.activityLabel, touchpoint.locationLabel].filter(Boolean).join(" at ")}
                </p>
              ) : null}
              <p className="mt-2 text-sm leading-7 text-foreground/72">{touchpoint.note}</p>
              {touchpoint.photoAlbumUrl ? (
                <p className="mt-2 text-sm text-foreground/68">
                  Shared photo album:{" "}
                  <a className="font-medium text-accent-strong underline underline-offset-2" href={touchpoint.photoAlbumUrl} target="_blank" rel="noreferrer">
                    {touchpoint.photoAlbumLabel || "Open album"}
                  </a>
                </p>
              ) : null}
            </div>
            <p className="text-sm text-foreground/60">{touchpoint.occurredAtLabel}</p>
          </div>
        </article>
      ))}
    </div>
  );
}