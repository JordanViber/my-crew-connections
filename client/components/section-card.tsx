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
    <section className="section-card p-3.5 md:p-4">
      <div className="mb-3">
        <h2 className="text-[1.18rem] font-semibold tracking-tight text-foreground md:text-[1.32rem]">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-6 text-foreground/68">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
