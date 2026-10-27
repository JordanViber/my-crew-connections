import { billingPlan } from "@/lib/billing";
import { freeTierLimits } from "@/lib/entitlements";
import {
  accountDeletionContactEmail,
  getPrivacyDocument,
  getTermsDocument,
  type LegalDocumentCopy,
} from "@/lib/legal";

const requiredPhrases = [
  "Phone number is optional.",
  "Mailing address is optional.",
  "Supabase stores the account and profile and handles sign-in.",
  "Stripe processes Premium payments.",
  "Vercel hosts the app.",
  accountDeletionContactEmail,
  `Free includes ${freeTierLimits.connections} person and ${freeTierLimits.groups} group.`,
  `Premium is ${billingPlan.monthlyPrice} per month or ${billingPlan.yearlyPrice} per year.`,
  "Cancel from Settings, in Billing.",
  "The app does not add a cancellation fee.",
];

function documentText(document: LegalDocumentCopy) {
  return document.sections.flatMap((section) => section.paragraphs).join(" ");
}

describe("legal copy", () => {
  it.each([
    ["privacy", getPrivacyDocument()],
    ["terms", getTermsDocument()],
  ] as const)("covers collection, processors, deletion, and billing on %s", (_name, document) => {
    const copy = documentText(document);

    for (const phrase of requiredPhrases) {
      expect(copy).toContain(phrase);
    }
  });
});
