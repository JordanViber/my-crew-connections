"use client";

import { useRef, useState } from "react";
import { ExternalLink } from "@/components/external-link";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type TouchpointDetailEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  touchpointId: string;
  redirectTo: string;
  touchpointType: "check-in" | "message" | "call" | "hangout";
  occurredAt: string;
  note?: string;
  activityLabel?: string;
  locationLabel?: string;
  photoAlbumLabel?: string;
  photoAlbumUrl?: string;
};

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z" />
    </svg>
  );
}

function toInputDateTime(value: string) {
  const parsed = new Date(value);
  parsed.setMinutes(parsed.getMinutes() - parsed.getTimezoneOffset());
  return parsed.toISOString().slice(0, 16);
}

function SummaryRow({
  label,
  value,
  emptyCopy = "Not set",
}: Readonly<{
  label: string;
  value?: React.ReactNode;
  emptyCopy?: string;
}>) {
  return (
    <div className="rounded-lg border border-border/80 bg-white/70 px-3.5 py-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-foreground/52">{label}</p>
      <div className="mt-1.5 text-sm font-medium leading-6 text-foreground">{value || emptyCopy}</div>
    </div>
  );
}

export function TouchpointDetailEditor({
  action,
  touchpointId,
  redirectTo,
  touchpointType,
  occurredAt,
  note,
  activityLabel,
  locationLabel,
  photoAlbumLabel,
  photoAlbumUrl,
}: Readonly<TouchpointDetailEditorProps>) {
  const [isEditing, setIsEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleCancel() {
    formRef.current?.reset();
    setIsEditing(false);
  }

  return (
    <form action={action} className="grid gap-4" ref={formRef}>
      <input type="hidden" name="touchpointId" value={touchpointId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {isEditing ? (
        <fieldset className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="field-label">Touchpoint type</span>
              <select className="field-input" name="touchpointType" defaultValue={touchpointType}>
                <option value="hangout">Hangout</option>
                <option value="check-in">Check-in</option>
                <option value="message">Message</option>
                <option value="call">Call</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="field-label">When</span>
              <input className="field-input" name="occurredAt" type="datetime-local" defaultValue={toInputDateTime(occurredAt)} required />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="field-label">Activity</span>
              <input className="field-input" name="activityLabel" type="text" defaultValue={activityLabel || ""} />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Location</span>
              <input className="field-input" name="locationLabel" type="text" defaultValue={locationLabel || ""} />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="field-label">Note</span>
            <textarea className="field-input min-h-24" name="note" defaultValue={note || ""} />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="field-label">Photo album label</span>
              <input className="field-input" name="photoAlbumLabel" type="text" defaultValue={photoAlbumLabel || ""} placeholder="Hangout photos" />
            </label>
            <label className="grid gap-2">
              <span className="field-label">Photo album link</span>
              <input className="field-input" name="photoAlbumUrl" type="url" defaultValue={photoAlbumUrl || ""} placeholder="https://..." />
            </label>
          </div>
        </fieldset>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-foreground/68">
              Keep this memory accurate. Add the album link later if you did not have it at planning time.
            </p>
            <button aria-label="Edit touchpoint" className="theme-toggle h-9 w-9 shrink-0" onClick={() => setIsEditing(true)} type="button">
              <EditIcon />
            </button>
          </div>
          <div className="grid gap-2">
            <SummaryRow label="Type" value={touchpointType} />
            <SummaryRow label="Activity" value={activityLabel} />
            <SummaryRow label="Location" value={locationLabel} />
            <SummaryRow label="Note" value={note} />
            <SummaryRow
              label="Photo album"
              value={
                photoAlbumUrl ? (
                  <ExternalLink href={photoAlbumUrl}>
                    {photoAlbumLabel || "Open album"}
                  </ExternalLink>
                ) : undefined
              }
            />
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <PendingSubmitButton className="button-primary w-full sm:w-auto" idleLabel="Save touchpoint" pendingLabel="Saving touchpoint..." />
          <button className="button-secondary w-full sm:w-auto" onClick={handleCancel} type="button">Cancel</button>
        </div>
      ) : null}
    </form>
  );
}
