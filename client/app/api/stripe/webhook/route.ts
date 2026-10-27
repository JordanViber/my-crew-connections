import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { billingIdentityUpdateAllowed, checkoutSessionGrantsPremium, decideCheckoutPremiumGrant } from "@/lib/billing";
import { createServerAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) {
    return null;
  }

  return typeof customer === "string" ? customer : customer.id;
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const value = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  return value ? new Date(value * 1000).toISOString() : null;
}

async function syncSubscription(subscription: Stripe.Subscription, fallbackUserId?: string | null) {
  const customerId = getCustomerId(subscription.customer);
  const userId = fallbackUserId?.trim() || null;

  if (!customerId && !userId) {
    return;
  }

  const supabase = createServerAdminSupabaseClient();
  const profileQuery = supabase
    .from("profiles")
    .select("id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status");
  const profileResult = userId
    ? await profileQuery.eq("id", userId).maybeSingle()
    : await profileQuery.eq("stripe_customer_id", customerId).maybeSingle();

  if (profileResult.error) {
    throw new Error(`Failed to load billing profile: ${profileResult.error.message}`);
  }

  const profile = profileResult.data;

  if (!profile) {
    return;
  }

  const identity = billingIdentityUpdateAllowed(profile, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  });

  if (!identity.ok) {
    return;
  }

  const firstItem = subscription.items.data[0];
  const { error } = await supabase.from("profiles").update({
    stripe_customer_id: customerId ?? profile.stripe_customer_id,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_price_id: firstItem?.price.id ?? null,
    stripe_current_period_end: getSubscriptionPeriodEnd(subscription),
    stripe_cancel_at_period_end: subscription.cancel_at_period_end,
  }).eq("id", profile.id);

  if (error) {
    throw new Error(`Failed to sync subscription: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (checkoutSessionGrantsPremium(session) && typeof session.subscription === "string") {
      const grant = decideCheckoutPremiumGrant({
        clientReferenceId: session.client_reference_id,
        metadataUserId: session.metadata?.supabase_user_id,
        customerEmail: session.customer_details?.email ?? session.customer_email,
      });

      if (grant.grant) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncSubscription(subscription, grant.userId);
      }
    }
  }

  if (
    event.type === "customer.subscription.created"
    || event.type === "customer.subscription.updated"
    || event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    await syncSubscription(subscription, subscription.metadata?.supabase_user_id?.trim() || null);
  }

  return NextResponse.json({ received: true });
}
