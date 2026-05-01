"use client";

import { useState } from "react";
import { HangoutList } from "@/components/hangout-list";
import { HangoutPlanForm } from "@/components/hangout-plan-form";
import { SectionCard } from "@/components/section-card";
import type { HangoutSummary } from "@/lib/mvp-data";

export function HangoutPlansPanel({
  hangouts,
  emptyCopy,
  confirmAction,
  completeAction,
  cancelAction,
  createAction,
  respondAction,
  subjectLabel,
  targetType,
  targetId,
  redirectTo,
  autoExportHangoutId,
  canCreate = true,
}: Readonly<{
  hangouts: HangoutSummary[];
  emptyCopy: string;
  confirmAction: (formData: FormData) => void | Promise<void>;
  completeAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  createAction: (formData: FormData) => void | Promise<void>;
  respondAction: (formData: FormData) => void | Promise<void>;
  subjectLabel: string;
  targetType: "connection" | "group";
  targetId: string;
  redirectTo: string;
  autoExportHangoutId?: string;
  canCreate?: boolean;
}>) {
  const [isPlanning, setIsPlanning] = useState(false);

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Saved plans"
        description={targetType === "group"
          ? "Group proposals stay here while people respond, and you can keep or delete them before the hangout happens."
          : "Upcoming plans stay here until they are completed, canceled, or exported to calendar."}
      >
        <div className="grid gap-3">
          <HangoutList
            hangouts={hangouts}
            emptyCopy={emptyCopy}
            confirmAction={confirmAction}
            completeAction={completeAction}
            cancelAction={cancelAction}
            respondAction={respondAction}
            redirectTo={redirectTo}
            autoExportHangoutId={autoExportHangoutId}
          />
          {canCreate && !isPlanning ? (
            <button className="button-primary w-full sm:w-auto" type="button" onClick={() => setIsPlanning(true)}>
              {targetType === "group" ? "Propose hangout" : "Add plan"}
            </button>
          ) : null}
        </div>
      </SectionCard>

      {canCreate && isPlanning ? (
        <SectionCard
          title={targetType === "group" ? "Propose the next hangout" : "Plan the next hangout"}
          description={targetType === "group"
            ? "Set the time, collect accepts and declines, and keep or delete the proposal once the group responds."
            : "Create the plan here first. Calendar export and RSVP workflows can build from this saved plan."}
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
