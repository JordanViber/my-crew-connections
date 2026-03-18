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
    <section className="section-card rounded-[1.6rem] p-5 md:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-7 text-foreground/70">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}