import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
export function stripeIsConfigured() {
  return (
    env.STRIPE_BILLING_ENABLED === "true" &&
    Boolean(
      env.STRIPE_SECRET_KEY &&
      env.STRIPE_WEBHOOK_SECRET &&
      env.STRIPE_MONTHLY_PRICE_ID &&
      env.STRIPE_ANNUAL_PRICE_ID,
    )
  );
}
export function getStripe() {
  if (!stripeIsConfigured() || !env.STRIPE_SECRET_KEY)
    throw new Error("Stripe billing is not enabled by the owner");
  return new Stripe(env.STRIPE_SECRET_KEY, {
    appInfo: { name: "Nourish Lens", version: "0.1.0" },
  });
}
export function priceForPlan(plan: "monthly" | "annual") {
  const price =
    plan === "monthly"
      ? env.STRIPE_MONTHLY_PRICE_ID
      : env.STRIPE_ANNUAL_PRICE_ID;
  if (!price) throw new Error("Stripe price is not configured");
  return price;
}
