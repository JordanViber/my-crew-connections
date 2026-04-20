"use client";

import { useRef, useState } from "react";

type EditableDetailsFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  editLabel: string;
  saveLabel: string;
  helperText?: string;
};

export function EditableDetailsForm({
  action,
  children,
  editLabel,
  saveLabel,
  helperText,
}: Readonly<EditableDetailsFormProps>) {
  const [isEditing, setIsEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleCancel() {
    formRef.current?.reset();
    setIsEditing(false);
  }

  return (
    <form action={action} className="grid gap-4" ref={formRef}>
      <fieldset className="grid gap-4" disabled={!isEditing}>
        {children}
      </fieldset>

      {helperText ? <p className="text-sm leading-6 text-foreground/68">{helperText}</p> : null}

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
