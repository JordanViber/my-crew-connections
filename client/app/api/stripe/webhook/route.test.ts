import { POST } from "@/app/api/stripe/webhook/route";

const periodEnd = 1893456000;
const periodEndIso = "2030-01-01T00:00:00.000Z";

type BillingProfile = {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
};

const {
  updates,
  constructEvent,
  retrieve,
  setProfile,
  resetHarness,
  createClient,
} = vi.hoisted(() => {
  const updates: Array<Record<string, unknown>> = [];
  let profile: BillingProfile | null = null;
  const constructEvent = vi.fn();
  const retrieve = vi.fn();

  function createClient() {
    return {
      from(table: string) {
        if (table !== "profiles") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: profile, error: null }),
                };
              },
            };
          },
          update(values: Record<string, unknown>) {
            updates.push(values);
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      },
    };
  }

  return {
    updates,
    constructEvent,
    retrieve,
    createClient,
    setProfile(next: BillingProfile | null) {
      profile = next;
    },
    resetHarness() {
      updates.length = 0;
      profile = null;
      constructEvent.mockReset();
      retrieve.mockReset();
    },
  };
});

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent },
    subscriptions: { retrieve },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServerAdminSupabaseClient: () => createClient(),
}));

const emptyProfile: BillingProfile = {
  id: "user-1",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_subscription_status: null,
};

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_new",
    customer: "cus_new",
    status: "active",
    cancel_at_period_end: false,
    metadata: { supabase_user_id: "user-1" },
    items: {
      data: [{
        price: { id: "price_month" },
        current_period_end: periodEnd,
      }],
    },
    ...overrides,
  };
}

async function postEvent(event: { type: string; data: { object: unknown } }) {
  constructEvent.mockReturnValue(event);

  const response = await POST(new Request("https://example.test/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=test" },
    body: "{}",
  }));

  expect(response.status).toBe(200);
}

describe("stripe webhook period end", () => {
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetHarness();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    setProfile(emptyProfile);
  });

  afterEach(() => {
    errorLog.mockRestore();
  });

  it("stores the subscription period end after checkout.session.completed", async () => {
    retrieve.mockResolvedValue(subscription());

    await postEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          status: "complete",
          subscription: "sub_new",
          client_reference_id: "user-1",
          metadata: { supabase_user_id: "user-1" },
          customer_details: { email: "other@example.com" },
        },
      },
    });

    expect(retrieve).toHaveBeenCalledWith("sub_new");
    expect(updates).toEqual([{
      stripe_customer_id: "cus_new",
      stripe_subscription_id: "sub_new",
      stripe_subscription_status: "active",
      stripe_price_id: "price_month",
      stripe_current_period_end: periodEndIso,
      stripe_cancel_at_period_end: false,
    }]);
  });

  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
  ])("stores the subscription period end on %s", async (type) => {
    await postEvent({
      type,
      data: { object: subscription() },
    });

    expect(retrieve).not.toHaveBeenCalled();
    expect(updates[0]?.stripe_current_period_end).toBe(periodEndIso);
  });

  it("does not grant Premium from an email-only checkout", async () => {
    await postEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          status: "complete",
          subscription: "sub_new",
          client_reference_id: null,
          metadata: {},
          customer_details: { email: "person@example.com" },
          customer_email: "person@example.com",
        },
      },
    });

    expect(retrieve).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it("does not grant Premium when metadata does not match client_reference_id", async () => {
    await postEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          status: "complete",
          subscription: "sub_new",
          client_reference_id: "user-from-reference",
          metadata: { supabase_user_id: "user-from-metadata" },
          customer_details: { email: "person@example.com" },
        },
      },
    });

    expect(retrieve).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it("does not overwrite a different live subscription", async () => {
    setProfile({
      id: "user-1",
      stripe_customer_id: "cus_new",
      stripe_subscription_id: "sub_live",
      stripe_subscription_status: "active",
    });

    await postEvent({
      type: "customer.subscription.updated",
      data: { object: subscription({ id: "sub_other" }) },
    });

    expect(updates).toEqual([]);
  });

  it("does not overwrite a different customer", async () => {
    setProfile({
      id: "user-1",
      stripe_customer_id: "cus_existing",
      stripe_subscription_id: null,
      stripe_subscription_status: null,
    });

    await postEvent({
      type: "customer.subscription.updated",
      data: { object: subscription({ customer: "cus_other" }) },
    });

    expect(updates).toEqual([]);
  });
});
