"use client";

import { AnimatePresence, motion } from "motion/react";
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
    <div className="grid gap-3 md:hidden">
      <div className={`-mx-1 overflow-x-auto px-1 pb-1 pt-1 ${sticky ? "sticky top-2 z-20" : ""}`}>
        <div className="glass-panel flex min-w-max gap-2 rounded-[1.2rem] border border-border/80 p-1.5 shadow-[0_14px_32px_rgba(69,42,24,0.12)]">
          {sections.map((section) => {
            const active = section.id === activeSection.id;

            return (
              <button
                key={section.id}
                className={`relative rounded-full px-3.5 py-2 text-sm font-semibold transition ${active ? "text-accent-strong" : "text-foreground/65"}`}
                onClick={() => setActiveSectionId(section.id)}
                type="button"
              >
                {active ? (
                  <motion.span
                    layoutId="mobile-section-tab-active"
                    className="absolute inset-0 rounded-full bg-[rgba(209,96,61,0.14)] shadow-[inset_0_0_0_1px_rgba(209,96,61,0.18)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeSection.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {activeSection.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
