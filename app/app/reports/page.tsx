import { requireUser } from "@/lib/auth/authorization";
type Day = {
  diary_date: string;
  meals: {
    meal_entries: {
      meal_entry_nutrient_snapshots: {
        amount: number | null;
        value_classification: string;
        nutrients: { key: string; name: string };
      }[];
    }[];
  }[];
};
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const q = await searchParams;
  const days = [7, 30, 90].includes(Number(q.days)) ? Number(q.days) : 30;
  const end =
    q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to)
      ? new Date(`${q.to}T00:00:00Z`)
      : new Date();
  const start =
    q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from)
      ? new Date(`${q.from}T00:00:00Z`)
      : new Date(end.getTime() - (days - 1) * 86400000);
  const from = start.toISOString().slice(0, 10),
    to = end.toISOString().slice(0, 10);
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("diary_days")
    .select(
      "diary_date,meals(meal_entries(meal_entry_nutrient_snapshots(amount,value_classification,nutrients(key,name))))",
    )
    .gte("diary_date", from)
    .lte("diary_date", to)
    .order("diary_date");
  const diary = (data ?? []) as unknown as Day[];
  const totals = new Map<
    string,
    { name: string; confirmed: number; projected: number; days: Set<string> }
  >();
  for (const day of diary)
    for (const meal of day.meals)
      for (const entry of meal.meal_entries)
        for (const row of entry.meal_entry_nutrient_snapshots) {
          if (row.amount === null) continue;
          const current = totals.get(row.nutrients.key) ?? {
            name: row.nutrients.name,
            confirmed: 0,
            projected: 0,
            days: new Set<string>(),
          };
          if (row.value_classification === "projected")
            current.projected += Number(row.amount);
          else current.confirmed += Number(row.amount);
          current.days.add(day.diary_date);
          totals.set(row.nutrients.key, current);
        }
  const rows = [...totals.entries()].map(([key, value]) => ({
    key,
    ...value,
    averageConfirmed: value.confirmed / Math.max(diary.length, 1),
    averageWithProjection:
      (value.confirmed + value.projected) / Math.max(diary.length, 1),
    projectedShare:
      value.confirmed + value.projected > 0
        ? (value.projected / (value.confirmed + value.projected)) * 100
        : 0,
  }));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">HISTORICAL ANALYSIS</p>
          <h1>Nutrition reports</h1>
        </div>
        <a
          className="button"
          href={`/app/reports/export?from=${from}&to=${to}`}
        >
          Export CSV
        </a>
      </div>
      <nav className="quality">
        <a href="?days=7">7 days</a>
        <a href="?days=30">30 days</a>
        <a href="?days=90">90 days</a>
      </nav>
      <form className="date-selector">
        <label>
          From
          <input name="from" type="date" defaultValue={from} />
        </label>
        <label>
          To
          <input name="to" type="date" defaultValue={to} />
        </label>
        <button>Custom range</button>
      </form>
      <section className="summary-grid">
        <div className="card">
          <span>Days with logs</span>
          <strong>{diary.length}</strong>
        </div>
        <div className="card">
          <span>Nutrients tracked</span>
          <strong>{rows.length}</strong>
        </div>
      </section>
      <div className="progress-list">
        {rows.map((row) => (
          <section className="card" key={row.key}>
            <strong>{row.name}</strong>
            <p>
              Daily confirmed average {row.averageConfirmed.toFixed(1)} · With
              projections {row.averageWithProjection.toFixed(1)}
            </p>
            <small>
              {row.projectedShare.toFixed(1)}% projected · {row.days.size} days
              represented
            </small>
          </section>
        ))}
      </div>
    </>
  );
}
