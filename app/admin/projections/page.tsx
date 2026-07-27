import { requirePermission } from "@/lib/auth/authorization";
import { reviewProjection, updateThresholds } from "./actions";

type Projection = {
  id: string;
  value: number;
  lower_bound: number | null;
  upper_bound: number | null;
  confidence_score: number;
  confidence_category: string;
  status: string;
  explanation: string;
  foods: { name: string; brand: string | null };
  nutrients: { name: string };
  nutrient_units: { symbol: string };
  projection_methods: { name: string };
  nutrient_projection_references: { id: string }[];
};

export default async function ProjectionAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; status?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("projections.manage");
  const status = ["pending", "approved", "rejected", "invalidated"].includes(
    q.status ?? "",
  )
    ? q.status!
    : "pending";
  const [{ data }, { data: settings }] = await Promise.all([
    supabase
      .from("nutrient_projections")
      .select(
        "id,value,lower_bound,upper_bound,confidence_score,confidence_category,status,explanation,foods(name,brand),nutrients(name),nutrient_units(symbol),projection_methods(name),nutrient_projection_references(id)",
      )
      .eq("status", status)
      .order("confidence_score", { ascending: true }),
    supabase.from("projection_settings").select("*").single(),
  ]);
  const projections = (data ?? []) as unknown as Projection[];
  return (
    <>
      <p className="eyebrow">NUTRITION DATA</p>
      <h1>Projection review</h1>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p role="status">{q.message}</p>}
      <section className="card">
        <h2>Inclusion thresholds</h2>
        <form className="form-grid" action={updateThresholds}>
          <label>
            High
            <input
              name="high"
              type="number"
              min="0"
              max="1"
              step=".01"
              defaultValue={settings?.high_threshold}
            />
          </label>
          <label>
            Moderate
            <input
              name="moderate"
              type="number"
              min="0"
              max="1"
              step=".01"
              defaultValue={settings?.moderate_threshold}
            />
          </label>
          <label>
            Low
            <input
              name="low"
              type="number"
              min="0"
              max="1"
              step=".01"
              defaultValue={settings?.low_threshold}
            />
          </label>
          <label>
            Minimum included
            <input
              name="minimum"
              type="number"
              min="0"
              max="1"
              step=".01"
              defaultValue={settings?.minimum_included_threshold}
            />
          </label>
          <label>
            <input
              name="experimental"
              type="checkbox"
              defaultChecked={settings?.experimental_enabled}
            />{" "}
            Enable experimental totals
          </label>
          <button>Save thresholds</button>
        </form>
      </section>
      <nav className="quality">
        <a href="?status=pending">Pending</a>
        <a href="?status=approved">Approved</a>
        <a href="?status=rejected">Rejected</a>
        <a href="?status=invalidated">Invalidated</a>
      </nav>
      {projections.length ? (
        projections.map((projection) => (
          <section className="card projection-review" key={projection.id}>
            <h2>
              {projection.nutrients.name} · {projection.foods.brand}{" "}
              {projection.foods.name}
            </h2>
            <p>
              <span className="projection-mark">
                {projection.confidence_category}
              </span>{" "}
              {Math.round(Number(projection.confidence_score) * 100)}% ·{" "}
              {projection.value} {projection.nutrient_units.symbol} per 100 g ·{" "}
              {projection.projection_methods.name}
            </p>
            <p>{projection.explanation}</p>
            <small>
              Range {projection.lower_bound ?? "—"}–
              {projection.upper_bound ?? "—"} ·{" "}
              {projection.nutrient_projection_references.length} references
            </small>
            {["pending", "approved"].includes(projection.status) && (
              <form className="form" action={reviewProjection}>
                <input
                  type="hidden"
                  name="projection_id"
                  value={projection.id}
                />
                <label>
                  Decision
                  <select name="decision">
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                    <option value="recalculate">Queue recalculation</option>
                    {projection.status === "approved" && (
                      <option value="invalidated">Invalidate</option>
                    )}
                  </select>
                </label>
                <label>
                  Required reason
                  <input name="reason" minLength={10} required />
                </label>
                <button>Record review</button>
              </form>
            )}
          </section>
        ))
      ) : (
        <section className="card">
          <p>No {status} projections.</p>
        </section>
      )}
    </>
  );
}
