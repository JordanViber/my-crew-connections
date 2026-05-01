"use client";

import { useRef, useState } from "react";

type EditableDetailsFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  editLabel: string;
  saveLabel: string;
  helperText?: string;
  summary?: Array<{
    label: string;
    value?: React.ReactNode;
  }>;
};

export function EditableDetailsForm({
  action,
  children,
  editLabel,
  saveLabel,
  helperText,
  summary,
}: Readonly<EditableDetailsFormProps>) {
  const [isEditing, setIsEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleCancel() {
    formRef.current?.reset();
    setIsEditing(false);
  }

  return (
    <form action={action} className="grid gap-4" ref={formRef}>
      {isEditing ? (
        <fieldset className="grid gap-4">
          {children}
        </fieldset>
      ) : summary ? (
        <dl className="grid gap-2">
          {summary.map((item) => (
            <div key={item.label} className="rounded-lg border border-border/80 bg-white/70 px-3.5 py-3">
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-foreground/52">{item.label}</dt>
              <dd className="mt-1.5 text-sm font-medium leading-6 text-foreground">
                {item.value === undefined || item.value === null || item.value === "" ? (
                  <span className="text-foreground/45">Not set</span>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <fieldset className="grid gap-4" disabled>
          {children}
        </fieldset>
      )}

      {helperText && isEditing ? <p className="text-sm leading-6 text-foreground/68">{helperText}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        {isEditing ? (
          <>
            <button className="button-primary w-full sm:w-auto" type="submit">
              {saveLabel}
            </button>
            <button className="button-secondary w-full sm:w-auto" onClick={handleCancel} type="button">
              Cancel
            </button>
          </>
        ) : (
          <button className="button-primary w-full sm:w-auto" onClick={() => setIsEditing(true)} type="button">
            {editLabel}
          </button>
        )}
      </div>
    </form>
  );
}
