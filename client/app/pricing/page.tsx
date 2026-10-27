import type { Metadata } from "next";
import { PricingPlans } from "@/components/pricing-plans";
import { createBillingCheckoutAction } from "@/app/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing",
};

export default async function PricingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="shell px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto max-w-6xl">
        <PricingPlans
          signedIn={Boolean(user)}
          checkoutAction={createBillingCheckoutAction}
          titleAs="h1"
        />
      </div>
    </main>
  );
}
