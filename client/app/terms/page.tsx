import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { getTermsDocument } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <main className="shell px-3 py-3 md:px-6 md:py-6">
      <LegalDocument document={getTermsDocument()} relatedHref="/privacy" relatedLabel="Privacy" />
    </main>
  );
}
