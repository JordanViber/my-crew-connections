import { PrefetchLink } from "@/components/prefetch-link";
import {
  accountDeletionContactEmail,
  type LegalDocumentCopy,
} from "@/lib/legal";

function LegalParagraph({ text }: Readonly<{ text: string }>) {
  const emailIndex = text.indexOf(accountDeletionContactEmail);

  if (emailIndex === -1) {
    return <p className="text-sm leading-7 text-foreground/75">{text}</p>;
  }

  return (
    <p className="text-sm leading-7 text-foreground/75">
      {text.slice(0, emailIndex)}
      <a
        className="font-semibold text-accent-strong"
        href={`mailto:${accountDeletionContactEmail}`}
      >
        {accountDeletionContactEmail}
      </a>
      {text.slice(emailIndex + accountDeletionContactEmail.length)}
    </p>
  );
}

export function LegalDocument({
  document,
  relatedHref,
  relatedLabel,
}: Readonly<{
  document: LegalDocumentCopy;
  relatedHref: string;
  relatedLabel: string;
}>) {
  return (
    <article className="glass-panel mx-auto grid max-w-3xl gap-6 px-4 py-6 md:px-8 md:py-8">
      <header className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">
          {document.eyebrow}
        </p>
        <h1 className="text-[2.15rem] font-semibold leading-none tracking-tight text-foreground md:text-[2.75rem]">
          {document.title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-foreground/70">
          {document.intro}
        </p>
      </header>

      {document.sections.map((section) => (
        <section key={section.heading} className="grid gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <LegalParagraph key={paragraph} text={paragraph} />
          ))}
        </section>
      ))}

      <p className="text-sm leading-7 text-foreground/70">
        Related:{" "}
        <PrefetchLink
          className="font-semibold text-accent-strong"
          href={relatedHref}
        >
          {relatedLabel}
        </PrefetchLink>
        .
      </p>
    </article>
  );
}
