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
    <div className="grid min-w-0 gap-3 overflow-hidden md:hidden">
      <div className={`pb-1 ${sticky ? "sticky top-2 z-20" : ""}`}>
        <div
          className="glass-panel grid min-w-0 gap-1.5 border border-border/80 p-1.5 shadow-[0_10px_24px_rgba(31,44,49,0.1)]"
          style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
        >
          {sections.map((section) => {
            const active = section.id === activeSection.id;

            return (
              <button
                key={section.id}
                className={`relative min-w-0 rounded-lg px-1.5 py-1.5 text-sm font-semibold transition ${active ? "text-accent-strong" : "text-foreground/65"}`}
                onClick={() => setActiveSectionId(section.id)}
                type="button"
              >
                {active ? (
                  <motion.span
                    layoutId="mobile-section-tab-active"
                    className="absolute inset-0 rounded-lg bg-accent-soft shadow-[inset_0_0_0_1px_rgba(209,96,61,0.18)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10 block truncate">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeSection.id}
          className="min-w-0 overflow-hidden"
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
