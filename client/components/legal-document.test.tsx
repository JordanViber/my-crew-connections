import { render, screen } from "@testing-library/react";
import { LegalDocument } from "@/components/legal-document";
import { accountDeletionContactEmail, getPrivacyDocument, getTermsDocument } from "@/lib/legal";

describe("LegalDocument", () => {
  it("links the deletion contact and the related page", () => {
    render(
      <LegalDocument
        document={getPrivacyDocument()}
        relatedHref="/terms"
        relatedLabel="Terms"
      />,
    );

    expect(screen.getByRole("link", { name: accountDeletionContactEmail })).toHaveAttribute(
      "href",
      `mailto:${accountDeletionContactEmail}`,
    );
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  });

  it("renders the terms document", () => {
    render(
      <LegalDocument
        document={getTermsDocument()}
        relatedHref="/privacy"
        relatedLabel="Privacy"
      />,
    );

    expect(screen.getByRole("heading", { name: "Terms" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });
});