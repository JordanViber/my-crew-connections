import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { getPrivacyDocument } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <main className="shell px-3 py-3 md:px-6 md:py-6">
      <LegalDocument document={getPrivacyDocument()} relatedHref="/terms" relatedLabel="Terms" />
    </main>
  );
}
