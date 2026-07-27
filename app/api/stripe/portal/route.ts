import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getStripe, stripeIsConfigured } from "@/lib/stripe/server";
export async function POST() {
  if (!stripeIsConfigured())
    return Response.json(
      { error: { code: "billing_disabled" } },
      { status: 503 },
    );
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: { code: "unauthorized" } }, { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data)
    return Response.json({ error: { code: "no_customer" } }, { status: 404 });
  const session = await getStripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/app/billing`,
  });
  return Response.redirect(session.url, 303);
}
