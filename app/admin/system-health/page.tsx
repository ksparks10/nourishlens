import { requirePermission } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { OpenFoodFactsProvider, UsdaProvider } from "@/providers/nutrition";
import { stripeIsConfigured } from "@/lib/stripe/server";
export default async function SystemHealth() {
  await requirePermission("system_health.read");
  const admin = createAdminClient();
  const [usda, off, failedStripe, providerErrors, incidents] =
    await Promise.all([
      new UsdaProvider().getProviderHealth(),
      new OpenFoodFactsProvider().getProviderHealth(),
      admin
        .from("stripe_events")
        .select("id", { count: "exact", head: true })
        .eq("processing_status", "failed"),
      admin
        .from("provider_api_logs")
        .select("id", { count: "exact", head: true })
        .eq("success", false),
      admin
        .from("system_incidents")
        .select("id,severity,status,summary,created_at")
        .neq("status", "resolved")
        .order("created_at", { ascending: false }),
    ]);
  return (
    <>
      <p className="eyebrow">OPERATIONS</p>
      <h1>System health</h1>
      <section className="summary-grid">
        <div className="card">
          <span>USDA</span>
          <strong>{usda.configured ? "Configured" : "Disabled"}</strong>
          <small>{usda.message}</small>
        </div>
        <div className="card">
          <span>Open Food Facts</span>
          <strong>{off.healthy ? "Ready" : "Unavailable"}</strong>
          <small>{off.message}</small>
        </div>
        <div className="card">
          <span>Stripe</span>
          <strong>
            {stripeIsConfigured() ? "Enabled" : "Safely disabled"}
          </strong>
        </div>
        <div className="card">
          <span>Failed webhooks</span>
          <strong>{failedStripe.count ?? 0}</strong>
        </div>
        <div className="card">
          <span>Provider errors</span>
          <strong>{providerErrors.count ?? 0}</strong>
        </div>
      </section>
      <section className="card">
        <h2>Open incidents</h2>
        {incidents.data?.length ? (
          incidents.data.map((item) => (
            <p key={item.id}>
              {item.severity}: {item.summary}
            </p>
          ))
        ) : (
          <p>No open incidents.</p>
        )}
      </section>
    </>
  );
}
