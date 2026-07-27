import Link from "next/link";
import { requireUser } from "@/lib/auth/authorization";
export default async function Recipes() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("recipes")
    .select("id,name,description,servings,updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">REUSABLE FOOD</p>
          <h1>Recipes</h1>
        </div>
        <div className="heading-actions">
          <Link className="button button-secondary" href="/app/recipes/import">
            Import from Instagram
          </Link>
          <Link className="button" href="/app/recipes/new">
            New recipe
          </Link>
        </div>
      </div>
      {data?.length ? (
        <div className="progress-list">
          {data.map((recipe) => (
            <Link
              className="card"
              href={`/app/recipes/${recipe.id}`}
              key={recipe.id}
            >
              <strong>{recipe.name}</strong>
              <p>{recipe.servings} servings</p>
              <small>{recipe.description}</small>
            </Link>
          ))}
        </div>
      ) : (
        <section className="card">
          <p>No recipes yet.</p>
        </section>
      )}
    </>
  );
}
