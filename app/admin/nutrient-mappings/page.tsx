import { requirePermission } from "@/lib/auth/authorization";
import { saveMapping } from "./actions";
type Mapping = {
  id: string;
  provider_key: string;
  provider_nutrient_code: string;
  source_unit: string | null;
  conversion_factor: number;
  nutrients: { name: string };
};
export default async function Mappings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("nutrients.manage");
  const [{ data: nutrients }, { data: mappingData }] = await Promise.all([
    supabase.from("nutrients").select("id,name").order("name"),
    supabase
      .from("provider_nutrient_mappings")
      .select(
        "id,provider_key,provider_nutrient_code,source_unit,conversion_factor,nutrients(name)",
      )
      .order("provider_key"),
  ]);
  const mappings = (mappingData ?? []) as unknown as Mapping[];
  return (
    <>
      <p className="eyebrow">NORMALIZATION</p>
      <h1>Provider nutrient mappings</h1>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p>{q.message}</p>}
      <section className="card">
        <form className="form" action={saveMapping}>
          <label>
            Provider
            <select name="provider_key">
              <option value="usda_fdc">USDA FoodData Central</option>
              <option value="open_food_facts">Open Food Facts</option>
            </select>
          </label>
          <label>
            Provider code
            <input name="provider_nutrient_code" required />
          </label>
          <label>
            Internal nutrient
            <select name="nutrient_id">
              {nutrients?.map((n) => (
                <option value={n.id} key={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source unit
            <input name="source_unit" />
          </label>
          <label>
            Conversion factor
            <input
              name="conversion_factor"
              type="number"
              step=".000001"
              defaultValue="1"
            />
          </label>
          <button>Save mapping</button>
        </form>
      </section>
      {mappings.map((mapping) => (
        <p className="card" key={mapping.id}>
          {mapping.provider_key}: {mapping.provider_nutrient_code} →{" "}
          {mapping.nutrients.name} × {mapping.conversion_factor}
        </p>
      ))}
    </>
  );
}
