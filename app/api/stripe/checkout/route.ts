import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutPlan } from "@/lib/validation/billing";
import { env } from "@/lib/env";
import {
  getStripe,
  priceForPlan,
  stripeIsConfigured,
} from "@/lib/stripe/server";
export async function POST(request: NextRequest) {
  if (!stripeIsConfigured())
    return Response.json(
      {
        error: {
          code: "billing_disabled",
          message: "Billing has not been enabled by the owner",
        },
      },
      { status: 503 },
    );
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email)
    return Response.json({ error: { code: "unauthorized" } }, { status: 401 });
  const form = await request.formData();
  const plan = checkoutPlan.safeParse(form.get("plan"));
  if (!plan.success)
    return Response.json({ error: { code: "invalid_plan" } }, { status: 400 });
  const stripe = getStripe();
  const admin = createAdminClient();
  let { data: customer } = await admin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!customer) {
    const created = await stripe.customers.create(
      { email: user.email, metadata: { supabase_user_id: user.id } },
      { idempotencyKey: `customer-${user.id}` },
    );
    const result = await admin
      .from("stripe_customers")
      .upsert({ user_id: user.id, stripe_customer_id: created.id })
      .select("stripe_customer_id")
      .single();
    customer = result.data;
  }
  if (!customer)
    return Response.json(
      { error: { code: "customer_failed" } },
      { status: 500 },
    );
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customer.stripe_customer_id,
      line_items: [{ price: priceForPlan(plan.data), quantity: 1 }],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/app/billing?checkout=returned`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/app/billing?checkout=canceled`,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, plan: plan.data },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan: plan.data },
      },
    },
    {
      idempotencyKey: `checkout-${user.id}-${plan.data}-${Math.floor(Date.now() / 300000)}`,
    },
  );
  return Response.redirect(session.url!, 303);
}
