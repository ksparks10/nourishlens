import { requireUser } from "@/lib/auth/authorization";
import { createRecipe } from "../actions";
export default async function NewRecipe({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requireUser();
  const { data: foods } = await supabase
    .from("foods")
    .select("id,name,brand")
    .eq("is_public", true)
    .is("deleted_at", null)
    .order("name")
    .limit(100);
  return (
    <>
      <p className="eyebrow">RECIPE BUILDER</p>
      <h1>Create recipe</h1>
      {q.error && <p className="error">{q.error}</p>}
      <form className="card form" action={createRecipe}>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Description
          <input name="description" />
        </label>
        <label>
          Number of servings
          <input
            name="servings"
            type="number"
            min=".1"
            step=".1"
            defaultValue="4"
            required
          />
        </label>
        <h2>Ingredients</h2>
        {[0, 1, 2].map((index) => (
          <div className="form-grid" key={index}>
            <label>
              Food
              <select name={`food_${index}`} defaultValue="">
                <option value="">Choose food</option>
                {foods?.map((food) => (
                  <option value={food.id} key={food.id}>
                    {food.brand ? `${food.brand} — ` : ""}
                    {food.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Grams
              <input name={`grams_${index}`} type="number" min=".1" step=".1" />
            </label>
          </div>
        ))}
        <button className="button">Create and calculate</button>
      </form>
    </>
  );
}
