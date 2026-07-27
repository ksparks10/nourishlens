import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
import { updateEntryNutrients } from "../../actions";

type Nutrient = {
  key: string;
  name: string;
  nutrient_categories: { name: string; sort_order: number };
  nutrient_units: { symbol: string };
};
type Snapshot = {
  amount: number | null;
  value_classification: string;
  nutrients: { key: string };
};
export default async function EntryNutrients({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  const { supabase } = await requireUser();
  const [{ data: entry }, { data: nutrients }] = await Promise.all([
    supabase
      .from("meal_entries")
      .select(
        "id,food_name_snapshot,gram_weight,logged_at,meals(diary_days(diary_date)),meal_entry_nutrient_snapshots(amount,value_classification,nutrients(key))",
      )
      .eq("id", entryId)
      .maybeSingle(),
    supabase
      .from("nutrients")
      .select(
        "key,name,nutrient_categories(name,sort_order),nutrient_units:default_unit_id(symbol)",
      )
      .eq("is_core", true)
      .order("name"),
  ]);
  if (!entry) notFound();
  const snapshots = (entry.meal_entry_nutrient_snapshots ??
    []) as unknown as Snapshot[];
  const byKey = new Map(snapshots.map((row) => [row.nutrients.key, row]));
  const date =
    (entry.meals as unknown as { diary_days: { diary_date: string } })
      ?.diary_days.diary_date ?? String(entry.logged_at).slice(0, 10);
  const rows = ((nutrients ?? []) as unknown as Nutrient[]).sort(
    (a, b) =>
      a.nutrient_categories.sort_order - b.nutrient_categories.sort_order ||
      a.name.localeCompare(b.name),
  );
  return (
    <>
      <p className="eyebrow">FOOD LOG CORRECTIONS</p>
      <h1>{entry.food_name_snapshot}</h1>
      <p className="muted">
        Review the calculated amounts for this{" "}
        {Number(entry.gram_weight).toFixed(1)} g food-log serving. Enter only
        corrections or missing values you know.
      </p>
      <form className="form" action={updateEntryNutrients}>
        <input type="hidden" name="entry_id" value={entryId} />
        <input type="hidden" name="date" value={date} />
        <div className="nutrient-edit-grid">
          {rows.map((nutrient) => {
            const snapshot = byKey.get(nutrient.key);
            return (
              <label key={nutrient.key}>
                {nutrient.name}
                <span>
                  {nutrient.nutrient_categories.name} ·{" "}
                  {nutrient.nutrient_units.symbol} ·{" "}
                  {snapshot?.value_classification.replaceAll("_", " ") ??
                    "not reported"}
                </span>
                <input
                  name={`nutrient__${nutrient.key}`}
                  type="number"
                  min="0"
                  max="10000000"
                  step="any"
                  placeholder={
                    snapshot?.amount == null
                      ? "Missing—enter if known"
                      : String(Number(snapshot.amount))
                  }
                />
              </label>
            );
          })}
        </div>
        <div className="actions">
          <button className="button">Save nutrient corrections</button>
          <Link className="card" href={`/app/diary?date=${date}`}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
