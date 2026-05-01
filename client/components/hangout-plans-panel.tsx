"use client";

import { useState } from "react";
import { HangoutList } from "@/components/hangout-list";
import { HangoutPlanForm } from "@/components/hangout-plan-form";
import { SectionCard } from "@/components/section-card";
import type { HangoutSummary } from "@/lib/mvp-data";

export function HangoutPlansPanel({
  hangouts,
  emptyCopy,
  completeAction,
  cancelAction,
  createAction,
  subjectLabel,
  targetType,
  targetId,
  redirectTo,
}: Readonly<{
  hangouts: HangoutSummary[];
  emptyCopy: string;
  completeAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  createAction: (formData: FormData) => void | Promise<void>;
  subjectLabel: string;
  targetType: "connection" | "group";
  targetId: string;
  redirectTo: string;
}>) {
  const [isPlanning, setIsPlanning] = useState(false);

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Saved plans"
        description="Upcoming plans stay here until they are completed, canceled, or exported to calendar."
      >
        <div className="grid gap-3">
          <HangoutList
            hangouts={hangouts}
            emptyCopy={emptyCopy}
            completeAction={completeAction}
            cancelAction={cancelAction}
            redirectTo={redirectTo}
          />
          {!isPlanning ? (
            <button className="button-primary w-full sm:w-auto" type="button" onClick={() => setIsPlanning(true)}>
              Add plan
            </button>
          ) : null}
        </div>
      </SectionCard>

      {isPlanning ? (
        <SectionCard
          title="Plan the next hangout"
          description="Create the plan here first. Calendar export and RSVP workflows can build from this saved plan."
        >
          <HangoutPlanForm
            action={createAction}
            subjectLabel={subjectLabel}
            targetType={targetType}
            targetId={targetId}
            redirectTo={redirectTo}
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
