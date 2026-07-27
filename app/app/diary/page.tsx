import Link from "next/link";
import { requireUser } from "@/lib/auth/authorization";
import { validDiaryDate } from "@/lib/validation/diary";
import { DateSelector } from "@/components/date-selector";
import { updateEntry } from "./actions";
import { EntryActions } from "@/features/diary/entry-actions";
type Entry = {
  id: string;
  food_name_snapshot: string;
  brand_snapshot: string | null;
  gram_weight: number;
  notes: string | null;
  logged_at: string;
  meal_entry_nutrient_snapshots: {
    amount: number | null;
    value_classification: string;
    nutrients: {
      key: string;
      nutrient_categories: { key: string };
    };
  }[];
};
type Meal = {
  id: string;
  meal_types: { key: string; name: string; sort_order: number };
  meal_entries: Entry[];
};
type NutrientOption = {
  key: string;
  name: string;
  nutrient_categories: { key: string; name: string; sort_order: number };
};
export default async function Diary({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    error?: string;
    message?: string;
    meal?: string;
    category?: string;
    nutrient?: string;
  }>;
}) {
  const q = await searchParams;
  const date = validDiaryDate(q.date);
  const { supabase } = await requireUser();
  const [{ data }, { data: categoryRows }, { data: nutrientRows }] =
    await Promise.all([
      supabase
        .from("diary_days")
        .select(
          "id,meals(id,meal_types(key,name,sort_order),meal_entries(id,food_name_snapshot,brand_snapshot,gram_weight,notes,logged_at,meal_entry_nutrient_snapshots(amount,value_classification,nutrients(key,nutrient_categories(key)))))",
        )
        .eq("diary_date", date)
        .maybeSingle(),
      supabase
        .from("nutrient_categories")
        .select("key,name,sort_order")
        .order("sort_order"),
      supabase
        .from("nutrients")
        .select("key,name,nutrient_categories(key,name,sort_order)")
        .order("name"),
    ]);
  const meals = ((data?.meals ?? []) as unknown as Meal[]).sort(
    (a, b) => a.meal_types.sort_order - b.meal_types.sort_order,
  );
  const categories = categoryRows ?? [];
  const nutrients = (nutrientRows ?? []) as unknown as NutrientOption[];
  const validMealKeys = new Set([
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "dinner",
    "evening_snack",
  ]);
  const mealFilter = validMealKeys.has(q.meal ?? "") ? q.meal : "";
  const categoryFilter = categories.some((item) => item.key === q.category)
    ? q.category
    : "";
  const nutrientFilter = nutrients.some((item) => item.key === q.nutrient)
    ? q.nutrient
    : "";
  const hasNutrient = (entry: Entry) =>
    entry.meal_entry_nutrient_snapshots.some(
      (snapshot) =>
        snapshot.amount !== null &&
        Number(snapshot.amount) > 0 &&
        !["not_reported", "not_applicable"].includes(
          snapshot.value_classification,
        ) &&
        (!categoryFilter ||
          snapshot.nutrients.nutrient_categories.key === categoryFilter) &&
        (!nutrientFilter || snapshot.nutrients.key === nutrientFilter),
    );
  const filteredMeals = meals
    .filter((meal) => !mealFilter || meal.meal_types.key === mealFilter)
    .map((meal) => ({
      ...meal,
      meal_entries: meal.meal_entries.filter(
        (entry) => (!categoryFilter && !nutrientFilter) || hasNutrient(entry),
      ),
    }))
    .filter((meal) => meal.meal_entries.length > 0);
  const totalEntries = meals.reduce(
    (sum, meal) => sum + meal.meal_entries.length,
    0,
  );
  const filteredEntries = filteredMeals.reduce(
    (sum, meal) => sum + meal.meal_entries.length,
    0,
  );
  const filtersActive = Boolean(mealFilter || categoryFilter || nutrientFilter);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FOOD LOG</p>
          <h1>Food log</h1>
        </div>
        <DateSelector date={date} action="/app/diary" />
      </div>
      {q.error && (
        <p className="error" role="alert">
          {q.error}
        </p>
      )}
      {q.message && <p role="status">{q.message}</p>}
      <section className="card food-log-filters">
        <div>
          <p className="eyebrow">FILTER FOOD LOG</p>
          <strong>Show foods by meal or nutrient contribution</strong>
        </div>
        <form action="/app/diary" method="get">
          <input type="hidden" name="date" value={date} />
          <label>
            Meal
            <select name="meal" defaultValue={mealFilter}>
              <option value="">All meals</option>
              <option value="breakfast">Breakfast</option>
              <option value="morning_snack">Morning snack</option>
              <option value="lunch">Lunch</option>
              <option value="afternoon_snack">Afternoon snack</option>
              <option value="dinner">Dinner</option>
              <option value="evening_snack">Evening snack</option>
            </select>
          </label>
          <label>
            Nutrient category
            <select name="category" defaultValue={categoryFilter}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option value={category.key} key={category.key}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Specific nutrient
            <select name="nutrient" defaultValue={nutrientFilter}>
              <option value="">All nutrients</option>
              {categories.map((category) => {
                const options = nutrients.filter(
                  (nutrient) =>
                    nutrient.nutrient_categories.key === category.key,
                );
                return options.length ? (
                  <optgroup label={category.name} key={category.key}>
                    {options.map((nutrient) => (
                      <option value={nutrient.key} key={nutrient.key}>
                        {nutrient.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </label>
          <button className="button">Apply filters</button>
          {filtersActive && (
            <Link
              className="food-log-clear-filter"
              href={`/app/diary?date=${date}`}
            >
              Clear
            </Link>
          )}
        </form>
        <small className="muted">
          Showing {filteredEntries} of {totalEntries} logged foods. Nutrient
          filters include foods with a reported amount greater than zero.
        </small>
      </section>
      {meals.length === 0 ? (
        <section className="card">
          <h2>Nothing logged</h2>
          <p className="muted">
            Search the catalog and add your first food for this date.
          </p>
          <Link className="button" href="/app/add-food">
            Add food
          </Link>
        </section>
      ) : filteredMeals.length === 0 ? (
        <section className="card">
          <h2>No foods match these filters</h2>
          <p className="muted">
            Try another meal, category, or nutrient—or clear the filters to see
            the complete food log.
          </p>
          <Link className="button" href={`/app/diary?date=${date}`}>
            Clear filters
          </Link>
        </section>
      ) : (
        filteredMeals.map((meal) => (
          <section className="card meal" key={meal.id}>
            <h2>{meal.meal_types.name}</h2>
            {meal.meal_entries.map((entry) => (
              <div className="entry" key={entry.id}>
                <div>
                  <strong>{entry.food_name_snapshot}</strong>
                  <p>
                    {entry.brand_snapshot ?? "Generic"} ·{" "}
                    {Number(entry.gram_weight).toFixed(1)} g
                  </p>
                  {entry.notes && <small>{entry.notes}</small>}
                  <p>
                    <Link href={`/app/diary/${entry.id}/nutrients`}>
                      Review or correct nutrients
                    </Link>
                  </p>
                  <details>
                    <summary>Edit amount or move meal</summary>
                    <form className="inline-form" action={updateEntry}>
                      <input type="hidden" name="entry_id" value={entry.id} />
                      <input type="hidden" name="date" value={date} />
                      <input
                        aria-label="Grams"
                        name="grams"
                        type="number"
                        defaultValue={Number(entry.gram_weight)}
                        min="0.1"
                        max="10000"
                        step="0.1"
                      />
                      <select
                        aria-label="Meal"
                        name="meal_type"
                        defaultValue={meal.meal_types.name
                          .toLowerCase()
                          .replace(" ", "_")}
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="morning_snack">Morning snack</option>
                        <option value="lunch">Lunch</option>
                        <option value="afternoon_snack">Afternoon snack</option>
                        <option value="dinner">Dinner</option>
                        <option value="evening_snack">Evening snack</option>
                      </select>
                      <input
                        aria-label="Notes"
                        name="notes"
                        defaultValue={entry.notes ?? ""}
                      />
                      <button>Save</button>
                    </form>
                  </details>
                </div>
                <EntryActions
                  entryId={entry.id}
                  foodName={entry.food_name_snapshot}
                />
              </div>
            ))}
          </section>
        ))
      )}
    </>
  );
}
