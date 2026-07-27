import { requireUser } from "@/lib/auth/authorization";
import { localDateInputValue } from "@/lib/date/local-date";
import { logSavedMeal, saveRecentMeal } from "./actions";
type Saved = {
  id: string;
  name: string;
  default_meal_type: string | null;
  saved_meal_items: { id: string; food_name_snapshot: string; grams: number }[];
};
type Recent = {
  id: string;
  meal_types: { name: string };
  diary_days: { diary_date: string };
  meal_entries: { id: string; food_name_snapshot: string }[];
};
export default async function SavedMeals({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: savedData }, { data: recentData }] = await Promise.all([
    supabase
      .from("saved_meals")
      .select(
        "id,name,default_meal_type,saved_meal_items(id,food_name_snapshot,grams)",
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("meals")
      .select(
        "id,meal_types(name),diary_days!inner(diary_date,user_id),meal_entries(id,food_name_snapshot)",
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const saved = (savedData ?? []) as unknown as Saved[];
  const recent = (recentData ?? []) as unknown as Recent[];
  const today = localDateInputValue();
  return (
    <>
      <p className="eyebrow">REUSABLE MEALS</p>
      <h1>Saved meals</h1>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p role="status">{q.message}</p>}
      {saved.map((meal) => (
        <section className="card" key={meal.id}>
          <h2>{meal.name}</h2>
          <p>
            {meal.saved_meal_items
              .map((item) => item.food_name_snapshot)
              .join(", ")}
          </p>
          <form className="form-grid" action={logSavedMeal}>
            <input type="hidden" name="saved_meal_id" value={meal.id} />
            <label>
              Date
              <input name="date" type="date" defaultValue={today} />
            </label>
            <label>
              Meal
              <select
                name="meal_type"
                defaultValue={meal.default_meal_type ?? "dinner"}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="morning_snack">Morning snack</option>
                <option value="afternoon_snack">Afternoon snack</option>
                <option value="evening_snack">Evening snack</option>
              </select>
            </label>
            <button>Log meal</button>
          </form>
        </section>
      ))}
      <section className="card">
        <h2>Save a recent food-log meal</h2>
        {recent.map((meal) => (
          <form className="entry" action={saveRecentMeal} key={meal.id}>
            <input type="hidden" name="meal_id" value={meal.id} />
            <span>
              {meal.diary_days.diary_date} · {meal.meal_types.name} ·{" "}
              {meal.meal_entries.length} foods
            </span>
            <input
              name="name"
              aria-label="Saved meal name"
              placeholder="Name this meal"
              required
            />
            <button>Save</button>
          </form>
        ))}
      </section>
    </>
  );
}
