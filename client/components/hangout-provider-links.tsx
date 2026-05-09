import { ExternalLink } from "@/components/external-link";
import { getHangoutProviderLinks, type HangoutProviderLinkInput } from "@/lib/hangouts";

export function HangoutProviderLinks({
  hangout,
}: Readonly<{
  hangout: HangoutProviderLinkInput;
}>) {
  const links = getHangoutProviderLinks(hangout);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="relative z-10 mt-3 grid gap-2 rounded-lg border border-border/80 bg-white/72 p-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent-strong">App links</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <ExternalLink key={link.provider} className="button-secondary button-compact" href={link.href}>
            {link.label}
          </ExternalLink>
        ))}
      </div>
    </div>
  );
}
