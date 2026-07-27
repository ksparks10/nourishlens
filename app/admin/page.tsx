import Link from "next/link";
import { requirePermission } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
export default async function Admin() {
  await requirePermission("admin.access");
  const admin = createAdminClient();
  const [profiles, foods, entries, projections, subscriptions, redemptions] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("foods").select("id", { count: "exact", head: true }),
      admin.from("meal_entries").select("id", { count: "exact", head: true }),
      admin
        .from("nutrient_projections")
        .select("id", { count: "exact", head: true }),
      admin.from("subscriptions").select("id", { count: "exact", head: true }),
      admin
        .from("promo_code_redemptions")
        .select("id", { count: "exact", head: true }),
    ]);
  const cards = [
    ["Users", profiles.count, "/admin/users"],
    ["Foods", foods.count, "/admin/foods"],
    ["Foods logged", entries.count, "/admin/analytics"],
    ["Projections", projections.count, "/admin/projections"],
    ["Subscriptions", subscriptions.count, "/admin/analytics"],
    ["Promo redemptions", redemptions.count, "/admin/promo-codes"],
  ] as const;
  return (
    <>
      <p className="eyebrow">SYSTEM OVERVIEW</p>
      <h1>Administration</h1>
      <section className="summary-grid">
        {cards.map(([label, count, href]) => (
          <Link className="card" href={href} key={label}>
            <span>{label}</span>
            <strong>{count ?? "—"}</strong>
          </Link>
        ))}
      </section>
    </>
  );
}
