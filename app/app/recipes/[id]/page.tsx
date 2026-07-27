import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
import type { ImportedIngredient } from "@/lib/recipes/instagram";

type Total = {
  id: string;
  confirmed_amount: number;
  calculated_amount: number;
  projected_amount: number;
  total_excluding_projections: number;
  total_including_projections: number;
  lower_bound: number | null;
  upper_bound: number | null;
  projected_percentage: number;
  nutrients: { name: string };
  nutrient_units: { symbol: string };
};

export default async function RecipeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("recipes")
    .select(
      "id,name,description,servings,preparation_notes,source_url,source_platform,imported_ingredients,import_status,current_version_id,recipe_versions!recipes_current_version_fk(total_weight_grams,recipe_ingredients(id,food_name_snapshot,grams),recipe_nutrient_snapshots(id,confirmed_amount,calculated_amount,projected_amount,total_excluding_projections,total_including_projections,lower_bound,upper_bound,projected_percentage,nutrients(name),nutrient_units(symbol)))",
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const version = Array.isArray(data.recipe_versions)
    ? data.recipe_versions[0]
    : data.recipe_versions;
  const totals = (version?.recipe_nutrient_snapshots ??
    []) as unknown as Total[];
  const importedIngredients = Array.isArray(data.imported_ingredients)
    ? (data.imported_ingredients as unknown as ImportedIngredient[])
    : [];
  const instructions: string[] = (data.preparation_notes ?? "")
    .split("\n")
    .filter(Boolean);

  return (
    <>
      <p className="eyebrow">RECIPE</p>
      <h1>{data.name}</h1>
      <p className="muted">
        {data.description} · {data.servings} servings
        {version?.total_weight_grams
          ? ` · ${version.total_weight_grams} g total`
          : ""}
      </p>
      {query.message && <p role="status">{query.message}</p>}
      {data.source_platform === "instagram" && data.source_url && (
        <div className="source-banner">
          <span>Imported from Instagram</span>
          <Link href={data.source_url} target="_blank" rel="noreferrer">
            View original post
          </Link>
        </div>
      )}
      <section className="card">
        <h2>Ingredients</h2>
        <ul>
          {version?.recipe_ingredients?.map((item) => (
            <li key={item.id}>
              {item.food_name_snapshot} — {item.grams} g
            </li>
          ))}
          {!version &&
            importedIngredients.map((item, index) => (
              <li key={`${item.raw}-${index}`}>{item.raw}</li>
            ))}
        </ul>
      </section>
      {instructions.length > 0 && (
        <section className="card">
          <h2>Directions</h2>
          <ol className="recipe-directions">
            {instructions.map((instruction, index) => (
              <li key={`${instruction}-${index}`}>{instruction}</li>
            ))}
          </ol>
        </section>
      )}
      {version ? (
        <section className="card">
          <h2>Nutrition per serving</h2>
          <div className="nutrient-grid">
            {totals.map((total) => (
              <div key={total.id}>
                <dt>{total.nutrients.name}</dt>
                <dd>
                  {(
                    Number(total.total_including_projections) /
                    Number(data.servings)
                  ).toFixed(2)}{" "}
                  {total.nutrient_units.symbol}
                </dd>
                {Number(total.projected_amount) > 0 && (
                  <small className="projection-mark">
                    {Number(total.projected_percentage).toFixed(1)}% projected
                  </small>
                )}
                <small>
                  Confirmed-only{" "}
                  {(
                    Number(total.total_excluding_projections) /
                    Number(data.servings)
                  ).toFixed(2)}{" "}
                  · Range {total.lower_bound ?? "—"}–{total.upper_bound ?? "—"}
                </small>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="card">
          <h2>Nutrition matching</h2>
          <p className="muted">
            The recipe is saved. Nutrition will appear after its ingredient
            lines are matched to foods in the Nourish Lens catalog.
          </p>
        </section>
      )}
    </>
  );
}
