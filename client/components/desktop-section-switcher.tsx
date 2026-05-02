type DesktopSection = {
  id: string;
  label: string;
};

export function DesktopSectionSwitcher({
  sections,
}: Readonly<{
  sections: DesktopSection[];
}>) {
  return (
    <nav className="sticky top-2 z-20 hidden rounded-lg border border-border/85 bg-white/80 p-2 shadow-[0_8px_20px_rgba(31,44,49,0.08)] backdrop-blur md:flex md:flex-wrap md:gap-2">
      {sections.map((section) => (
        <a
          key={section.id}
          className="rounded-md border border-border/80 bg-white px-3 py-1.5 text-sm font-semibold text-foreground/70 transition hover:bg-accent-soft hover:text-accent-strong"
          href={`#${section.id}`}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
