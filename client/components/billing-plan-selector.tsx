"use client";

import { useState } from "react";
import { createBillingCheckoutAction } from "@/app/actions";
import { billingPlan, type BillingInterval } from "@/lib/billing";

const choices: {
  interval: BillingInterval;
  title: string;
  price: string;
  detail: string;
  savings?: string;
}[] = [
  {
    interval: "monthly",
    title: "Monthly",
    price: `${billingPlan.monthlyPrice}/mo`,
    detail: "Flexible month-to-month access.",
  },
  {
    interval: "yearly",
    title: "Yearly",
    price: `${billingPlan.yearlyPrice}/yr`,
    detail: "Same Premium access with annual billing.",
    savings: "$10 saved each year",
  },
];

export function BillingPlanSelector() {
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("yearly");
  const selectedChoice = choices.find((choice) => choice.interval === selectedInterval) ?? choices[1];

  return (
    <form action={createBillingCheckoutAction} className="grid gap-3">
      <input name="interval" type="hidden" value={selectedInterval} />
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => {
          const selected = choice.interval === selectedInterval;

          return (
            <button
              key={choice.interval}
              aria-pressed={selected}
              className={`rounded-lg border p-3.5 text-left transition ${
                selected
                  ? "border-accent bg-accent-soft shadow-[inset_0_0_0_1px_rgba(209,96,61,0.16)]"
                  : "border-border bg-surface-muted hover:border-accent/30"
              }`}
              onClick={() => setSelectedInterval(choice.interval)}
              type="button"
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-semibold text-foreground">{choice.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-foreground/60">{choice.detail}</span>
                </span>
                <span className="text-right text-lg font-semibold text-foreground">{choice.price}</span>
              </span>
              {choice.savings ? (
                <span className="mt-3 inline-flex rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-[#174632]">
                  {choice.savings}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <button className="button-primary w-full" type="submit">
        Continue with {selectedChoice.title.toLowerCase()}
      </button>
    </form>
  );
}
