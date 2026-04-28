export function SectionCard({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description?: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="section-card rounded-[1.45rem] p-4 md:p-5">
      <div className="mb-4">
        <h2 className="text-[1.35rem] font-semibold tracking-tight text-foreground md:text-[1.55rem]">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-foreground/70">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}