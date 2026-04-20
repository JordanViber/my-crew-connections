"use client";

import { useEffect, useState } from "react";

export type MobileSectionTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function MobileSectionTabs({
  sections,
  initialSectionId,
  sticky = true,
}: Readonly<{
  sections: MobileSectionTab[];
  initialSectionId?: string;
  sticky?: boolean;
}>) {
  const defaultSectionId = initialSectionId && sections.some((section) => section.id === initialSectionId)
    ? initialSectionId
    : sections[0]?.id;
  const [activeSectionId, setActiveSectionId] = useState(defaultSectionId);
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];

  useEffect(() => {
    setActiveSectionId(defaultSectionId);
  }, [defaultSectionId]);

  if (!activeSection) {
    return null;
  }

  return (
    <div className="grid gap-4 md:hidden">
      <div className={`-mx-1 overflow-x-auto px-1 pb-1 pt-1 ${sticky ? "sticky top-3 z-20" : ""}`}>
        <div className="glass-panel flex min-w-max gap-2 rounded-[1.35rem] border border-border/80 p-2 shadow-[0_14px_32px_rgba(69,42,24,0.12)]">
          {sections.map((section) => {
            const active = section.id === activeSection.id;

            return (
              <button
                key={section.id}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[rgba(209,96,61,0.14)] text-accent-strong shadow-[inset_0_0_0_1px_rgba(209,96,61,0.18)]"
                    : "text-foreground/65"
                }`}
                onClick={() => setActiveSectionId(section.id)}
                type="button"
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>{activeSection.content}</div>
    </div>
  );
}
