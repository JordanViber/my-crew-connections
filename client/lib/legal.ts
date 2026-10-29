import { billingPlan } from "@/lib/billing";
import { freeTierLimits } from "@/lib/entitlements";

export const accountDeletionContactEmail = "support@mycrewconnections.app";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocumentCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
};

const freePlanLine = `Free includes ${freeTierLimits.connections} person and ${freeTierLimits.groups} group.`;

const premiumPriceLine = `Premium is ${billingPlan.monthlyPrice} per month or ${billingPlan.yearlyPrice} per year.`;

const yearlyLine = `Yearly billing is ${billingPlan.yearlyPrice} for the year (${billingPlan.yearlySavings}).`;

const collectionParagraphs = [
  "Sign-up collects your name, email, and password to create the account.",
  "Phone number is optional. If you add one, it is stored on your profile. When phone sign-in is available, that number can also receive a sign-in code.",
  "Mailing address is optional. If you add one, the street, city, region, postal code, and country are stored on your profile as the billing address.",
];

const processorParagraph =
  "Supabase stores the account and profile and handles sign-in. Stripe processes Premium payments. Vercel hosts the app.";

const deletionParagraph = `To delete your account, including the phone number and mailing address saved on it, email ${accountDeletionContactEmail}.`;

const cancelParagraphs = [
  "Premium renews each month or each year until you cancel. Cancel from Settings, in Billing. That opens Stripe's billing portal and stops the next renewal.",
  "After you cancel, Premium stays on until the end of the period you already paid. The app does not add a cancellation fee. Card numbers are entered on Stripe's checkout page and are not stored in this app.",
];

export function getPrivacyDocument(): LegalDocumentCopy {
  return {
    eyebrow: "Privacy",
    title: "Privacy",
    intro:
      "What the account form collects, why phone and mailing address are there, who processes them, and how to ask for deletion.",
    sections: [
      {
        heading: "Phone and address",
        paragraphs: collectionParagraphs,
      },
      {
        heading: "Who processes it",
        paragraphs: [processorParagraph],
      },
      {
        heading: "Deletion",
        paragraphs: [deletionParagraph],
      },
      {
        heading: "Billing and cancellation",
        paragraphs: [
          freePlanLine,
          premiumPriceLine,
          yearlyLine,
          ...cancelParagraphs,
        ],
      },
    ],
  };
}

export function getTermsDocument(): LegalDocumentCopy {
  return {
    eyebrow: "Terms",
    title: "Terms",
    intro:
      "How Free and Premium billing works, how to cancel, and what happens to a phone number or mailing address on the account.",
    sections: [
      {
        heading: "Plans and prices",
        paragraphs: [freePlanLine, premiumPriceLine, yearlyLine],
      },
      {
        heading: "Billing and cancellation",
        paragraphs: cancelParagraphs,
      },
      {
        heading: "Phone, address, and processors",
        paragraphs: [...collectionParagraphs, processorParagraph],
      },
      {
        heading: "Deletion",
        paragraphs: [deletionParagraph],
      },
    ],
  };
}
