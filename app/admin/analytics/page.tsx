import { requirePermission } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
export default async function Analytics() {
  await requirePermission("analytics.read");
  const admin = createAdminClient();
  const [
    users,
    paid,
    grants,
    entries,
    searches,
    events,
    projections,
    invalidated,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),
    admin
      .from("access_grants")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null),
    admin.from("meal_entries").select("id", { count: "exact", head: true }),
    admin
      .from("product_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "food.search"),
    admin
      .from("stripe_events")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "failed"),
    admin
      .from("nutrient_projections")
      .select("id", { count: "exact", head: true }),
    admin
      .from("projection_reviews")
      .select("id", { count: "exact", head: true })
      .eq("decision", "invalidated"),
  ]);
  const cards = [
    ["Total users", users.count],
    ["Paid users", paid.count],
    ["Complimentary grants", grants.count],
    ["Foods logged", entries.count],
    ["Food searches", searches.count],
    ["Failed Stripe events", events.count],
    ["Total projections", projections.count],
    ["Invalidated projections", invalidated.count],
  ];
  return (
    <>
      <p className="eyebrow">AGGREGATE METRICS</p>
      <h1>Analytics</h1>
      <p className="muted">
        Only aggregate operational counts are shown; private nutrition details
        are excluded.
      </p>
      <section className="summary-grid">
        {cards.map(([label, value]) => (
          <div className="card" key={label}>
            <span>{label}</span>
            <strong>{value ?? 0}</strong>
          </div>
        ))}
      </section>
      <section className="card">
        <h2>Revenue metrics</h2>
        <p>
          MRR, ARR, churn, and trial conversion remain unavailable until you
          configure Stripe prices and test-mode subscription events.
        </p>
      </section>
    </>
  );
}
