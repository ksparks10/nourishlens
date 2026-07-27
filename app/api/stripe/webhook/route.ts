import Stripe from "stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, stripeIsConfigured } from "@/lib/stripe/server";
export const runtime = "nodejs";
const supported = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);
const statusMap: Record<string, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "expired",
  unpaid: "unpaid",
  paused: "unpaid",
};
async function syncSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  let userId = subscription.metadata.supabase_user_id;
  if (!userId) {
    const { data } = await admin
      .from("stripe_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) throw new Error("Subscription customer is not linked to a user");
  const priceId = subscription.items.data[0]?.price.id;
  const planKey =
    priceId === env.STRIPE_MONTHLY_PRICE_ID
      ? "premium_monthly"
      : priceId === env.STRIPE_ANNUAL_PRICE_ID
        ? "premium_annual"
        : null;
  const { data: plan } = planKey
    ? await admin
        .from("subscription_plans")
        .select("id")
        .eq("key", planKey)
        .single()
    : { data: null };
  const firstItem = subscription.items.data[0];
  const timestamp = (value: number | undefined) =>
    value ? new Date(value * 1000).toISOString() : null;
  const { error } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan_id: plan?.id ?? null,
        stripe_subscription_id: subscription.id,
        status: statusMap[subscription.status] ?? "unpaid",
        current_period_start: timestamp(firstItem?.current_period_start),
        current_period_end: timestamp(firstItem?.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: timestamp(subscription.trial_end ?? undefined),
      },
      { onConflict: "stripe_subscription_id" },
    );
  if (error) throw new Error(error.message);
}
export async function POST(request: Request) {
  if (!stripeIsConfigured() || !env.STRIPE_WEBHOOK_SECRET)
    return Response.json({ error: "Billing disabled" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return Response.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("stripe_events")
    .select("processing_status,attempt_count")
    .eq("id", event.id)
    .maybeSingle();
  if (
    existing?.processing_status === "processed" ||
    existing?.processing_status === "ignored"
  )
    return Response.json({ received: true, duplicate: true });
  if (existing)
    await admin
      .from("stripe_events")
      .update({
        processing_status: "processing",
        attempt_count: existing.attempt_count + 1,
        last_error: null,
      })
      .eq("id", event.id);
  else {
    const { error } = await admin
      .from("stripe_events")
      .insert({
        id: event.id,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
      });
    if (error?.code === "23505")
      return Response.json({ received: true, duplicate: true });
    if (error)
      return Response.json(
        { error: "Unable to record event" },
        { status: 500 },
      );
  }
  try {
    if (supported.has(event.type))
      await syncSubscription(event.data.object as Stripe.Subscription);
    else {
      await admin
        .from("stripe_events")
        .update({
          processing_status: "ignored",
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);
      return Response.json({ received: true, ignored: true });
    }
    await admin
      .from("stripe_events")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    return Response.json({ received: true });
  } catch (error) {
    await admin
      .from("stripe_events")
      .update({
        processing_status: "failed",
        last_error:
          error instanceof Error ? error.message : "Unknown processing error",
      })
      .eq("id", event.id);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
