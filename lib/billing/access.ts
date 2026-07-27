import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
export async function getAccessStatus() {
  const { supabase, user } = await requireUser();
  const [{ data: premium }, { data: subscriptions }, { data: grants }] =
    await Promise.all([
      supabase.rpc("has_premium_access", { check_user_id: user.id }),
      supabase
        .from("subscriptions")
        .select(
          "status,current_period_end,cancel_at_period_end,subscription_plans(name,billing_interval)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("access_grants")
        .select("grant_type,starts_at,expires_at,reason")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
    ]);
  return {
    hasPremium: Boolean(premium),
    subscription: subscriptions?.[0] ?? null,
    grants: grants ?? [],
  };
}
export async function requirePremiumAccess() {
  const status = await getAccessStatus();
  if (!status.hasPremium)
    redirect("/app/billing?error=Premium+or+complimentary+access+is+required");
  return status;
}
