import { requireUser } from "@/lib/auth/authorization";
import { ProjectionToggle } from "@/components/projection-toggle";
import { validDiaryDate } from "@/lib/validation/diary";
import { DateSelector } from "@/components/date-selector";
import { projectedShare } from "@/lib/nutrition/projections";
type ProjectionRow = {
  amount: number;
  projection_confidence: number;
  projection_method: string;
  projection_lower_bound: number | null;
  projection_upper_bound: number | null;
  nutrients: { name: string };
  meal_entries: {
    food_name_snapshot: string;
    meals: { diary_days: { diary_date: string } };
  };
};
export default async function ProjectionReport({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const date = validDiaryDate(q.date);
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data }] = await Promise.all([
    supabase
      .from("profiles")
      .select("projection_display_mode")
      .eq("id", user.id)
      .single(),
    supabase
      .from("meal_entry_nutrient_snapshots")
      .select(
        "amount,projection_confidence,projection_method,projection_lower_bound,projection_upper_bound,nutrients(name),meal_entries!inner(food_name_snapshot,meals!inner(diary_days!inner(diary_date)))",
      )
      .eq("value_classification", "projected")
      .eq("meal_entries.meals.diary_days.diary_date", date),
  ]);
  const rows = (data ?? []) as unknown as ProjectionRow[];
  const projected = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DATA QUALITY</p>
          <h1>Projection report</h1>
        </div>
        <DateSelector date={date} action="/app/projections" />
      </div>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p role="status">{q.message}</p>}
      <section className="card">
        <h2>Choose what totals show</h2>
        <ProjectionToggle
          mode={profile?.projection_display_mode ?? "eligible"}
        />
        <p className="muted">
          Low-confidence projections are excluded before snapshotting.
          Experimental values are disabled by default.
        </p>
      </section>
      <section className="summary-grid">
        <div className="card">
          <span>Projected values</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="card">
          <span>Projected amount across units</span>
          <strong>{projected.toFixed(1)}</strong>
          <small>
            Informational only; mixed units are not a nutrient total
          </small>
        </div>
        <div className="card">
          <span>Illustrative share</span>
          <strong>{projectedShare(0, 0, projected)}%</strong>
        </div>
      </section>
      {rows.length ? (
        <div className="progress-list">
          {rows.map((row, index) => (
            <section className="card" key={index}>
              <strong>
                {row.nutrients.name} in {row.meal_entries.food_name_snapshot}
              </strong>
              <p>
                <span className="projection-mark">Projected</span>{" "}
                {Number(row.amount).toFixed(2)} ·{" "}
                {Math.round(Number(row.projection_confidence) * 100)}%
                confidence
              </p>
              <small>
                Method: {row.projection_method?.replaceAll("_", " ")} · Range{" "}
                {row.projection_lower_bound ?? "—"}–
                {row.projection_upper_bound ?? "—"}
              </small>
            </section>
          ))}
        </div>
      ) : (
        <section className="card">
          <p>No eligible projected values were used on this date.</p>
        </section>
      )}
    </>
  );
}
