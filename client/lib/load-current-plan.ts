import { getCurrentPlanState } from "@/lib/current-plan";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const currentPlanSelect =
  "stripe_subscription_id, stripe_subscription_status, stripe_current_period_end, stripe_cancel_at_period_end";

export async function loadCurrentPlan(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  email?: string | null,
) {
  const { data } = await supabase.from("profiles").select(currentPlanSelect).eq("id", userId).maybeSingle();

  return getCurrentPlanState(data, email);
}
