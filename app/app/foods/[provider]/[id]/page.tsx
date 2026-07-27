import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
import { ServingPreview } from "@/features/foods/serving-preview";
import { LogFoodForm } from "@/features/diary/log-food-form";
import {
  type NormalizedFood,
  type NormalizedNutrient,
} from "@/providers/nutrition";
import { providerFor } from "@/providers/nutrition/registry";
import {
  cacheExternalFoods,
  getCachedExternalFood,
} from "@/lib/nutrition/search";
import { FavoriteButton } from "@/features/foods/favorite-button";
import { importAndLogExternalFood } from "../../actions";
import { PortionSelector } from "@/features/foods/portion-selector";
import { effectiveDefaultServing } from "@/lib/nutrition/servings";
import { localDateInputValue } from "@/lib/date/local-date";

type NutrientRow = {
  amount_per_100g: number | null;
  classification: NormalizedNutrient["classification"];
  nutrients: { key: string; name: string; nutrient_units: { symbol: string } };
};
type ProjectionRow = {
  value: number;
  confidence_score: number;
  confidence_category: string;
  nutrients: { key: string; name: string };
  nutrient_units: { symbol: string };
};
type CatalogNutrient = {
  key: string;
  name: string;
  nutrient_units: { symbol: string };
};

async function internalFood(id: string): Promise<NormalizedFood | null> {
  const { supabase } = await requireUser();
  const [{ data }, { data: settings }, { data: catalog }] = await Promise.all([
    supabase
      .from("foods")
      .select(
        "id,name,brand,description,food_type,current_version_id,food_versions!foods_current_version_fk(data_completeness,contains_projections,food_servings(label,amount,unit,gram_weight,milliliter_volume,is_default),food_version_nutrients(amount_per_100g,classification,nutrients(key,name,nutrient_units(symbol))))",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("projection_settings")
      .select("minimum_included_threshold,experimental_enabled")
      .single(),
    supabase
      .from("nutrients")
      .select("key,name,nutrient_units:default_unit_id(symbol)")
      .eq("is_core", true)
      .order("name"),
  ]);
  if (!data) return null;
  const version = Array.isArray(data.food_versions)
    ? data.food_versions[0]
    : data.food_versions;
  const nutrientRows = (version?.food_version_nutrients ??
    []) as unknown as NutrientRow[];
  const { data: projectedData } = await supabase
    .from("nutrient_projections")
    .select(
      "value,confidence_score,confidence_category,nutrients(key,name),nutrient_units(symbol)",
    )
    .eq("food_version_id", data.current_version_id)
    .eq("status", "approved")
    .gte("confidence_score", settings?.minimum_included_threshold ?? 0.65);
  const exact = new Map(nutrientRows.map((row) => [row.nutrients.key, row]));
  const projections = new Map(
    ((projectedData ?? []) as unknown as ProjectionRow[])
      .filter(
        (row) =>
          !exact.has(row.nutrients.key) &&
          (row.confidence_category !== "experimental" ||
            settings?.experimental_enabled),
      )
      .map((row) => [row.nutrients.key, row]),
  );
  const nutrients: NormalizedNutrient[] = (
    (catalog ?? []) as unknown as CatalogNutrient[]
  ).map((item) => {
    const row = exact.get(item.key),
      projection = projections.get(item.key);
    return row
      ? {
          key: item.key,
          name: item.name,
          amountPer100g:
            row.amount_per_100g === null ? null : Number(row.amount_per_100g),
          unit: item.nutrient_units.symbol,
          classification: row.classification,
        }
      : projection
        ? {
            key: item.key,
            name: `${item.name} (projected)`,
            amountPer100g: Number(projection.value),
            unit: item.nutrient_units.symbol,
            classification: "projected",
          }
        : {
            key: item.key,
            name: item.name,
            amountPer100g: null,
            unit: item.nutrient_units.symbol,
            classification: "not_reported",
          };
  });
  return {
    provider: "internal",
    providerId: data.id,
    name: data.name,
    brand: data.brand,
    description: data.description,
    barcode: null,
    imageUrl: null,
    foodType: data.food_type as NormalizedFood["foodType"],
    servings: (version?.food_servings ?? []).map((serving) => ({
      label: serving.label,
      amount: Number(serving.amount),
      unit: serving.unit,
      gramWeight:
        serving.gram_weight === null ? null : Number(serving.gram_weight),
      milliliterVolume:
        serving.milliliter_volume === null
          ? null
          : Number(serving.milliliter_volume),
      isDefault: serving.is_default,
    })),
    nutrients,
    dataCompleteness: version?.data_completeness ?? 0,
    containsProjections: projections.size > 0,
  };
}

export default async function FoodDetail({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string; id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { provider, id } = await params;
  const { message } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: favorite } =
    provider === "internal"
      ? await supabase
          .from("favorite_foods")
          .select("food_id")
          .eq("user_id", user.id)
          .eq("food_id", id)
          .maybeSingle()
      : { data: null };
  let food: NormalizedFood | null = null;
  try {
    food =
      provider === "internal"
        ? await internalFood(id)
        : await getCachedExternalFood(provider, id);
    if (
      (!food || (provider === "nih_dsld" && food.nutrients.length === 0)) &&
      provider !== "internal"
    )
      food =
        (await providerFor(provider as NormalizedFood["provider"])?.getFoodById(
          id,
        )) ?? null;
    if (food && provider !== "internal") await cacheExternalFoods([food]);
  } catch {}
  if (!food) notFound();
  if (provider !== "internal") {
    const { data: catalog } = await supabase
      .from("nutrients")
      .select("key,name,nutrient_units:default_unit_id(symbol)")
      .eq("is_core", true)
      .order("name");
    const existing = new Map(
      food.nutrients.map((nutrient) => [nutrient.key, nutrient]),
    );
    food = {
      ...food,
      nutrients: ((catalog ?? []) as unknown as CatalogNutrient[]).map(
        (item) =>
          existing.get(item.key) ?? {
            key: item.key,
            name: item.name,
            amountPer100g: null,
            unit: item.nutrient_units.symbol,
            classification: "not_reported",
          },
      ),
    };
  }
  const sourceServing =
      food.servings.find((item) => item.isDefault) ?? food.servings[0],
    serving = effectiveDefaultServing(food.name, sourceServing);
  const today = localDateInputValue();
  const reported = new Set(
    food.nutrients
      .filter((item) => item.amountPer100g !== null)
      .map((item) => item.key),
  );
  const macroKeys = [
    "energy_kcal",
    "protein",
    "carbohydrate",
    "fat",
    "fiber",
    "sodium",
  ];
  const microKeys = food.nutrients
    .map((item) => item.key)
    .filter((key) => !macroKeys.includes(key));
  const macroCoverage = macroKeys.filter((key) => reported.has(key)).length;
  const microCoverage = microKeys.filter((key) => reported.has(key)).length;
  const overallCoverage = food.nutrients.length
    ? Math.round((reported.size / food.nutrients.length) * 100)
    : 0;
  return (
    <>
      <p className="eyebrow">{food.provider.replaceAll("_", " ")}</p>
      <div className="page-heading">
        <h1>{food.name}</h1>
        {provider === "internal" && (
          <FavoriteButton foodId={id} isFavorite={Boolean(favorite)} />
        )}
      </div>
      <p className="muted">
        {food.brand ?? "Generic food"} · {overallCoverage}% of all tracked
        nutrients reported
      </p>
      {message && (
        <p className="card" role="status">
          {message}
        </p>
      )}
      <div className="quality">
        <span>
          Macros {macroCoverage}/{macroKeys.length}
        </span>
        <span>
          Micronutrients {microCoverage}/{microKeys.length}
        </span>
        <span>
          {food.containsProjections
            ? "Contains clearly marked projected values"
            : "No projected values"}
        </span>
        <span>Source values are labeled</span>
      </div>
      <ServingPreview
        defaultGrams={serving.gramWeight}
        nutrients={food.nutrients}
      />
      {provider === "internal" ? (
        <LogFoodForm
          foodId={id}
          defaultGrams={serving.gramWeight}
          servingLabel={serving.label ?? undefined}
          nutrients={food.nutrients}
        />
      ) : (
        <section className="card">
          <h2>Log this food</h2>
          <p>
            Choose the amount, meal, and date. This one action saves the catalog
            record, adds it to your food log, and updates your dashboard.
          </p>
          <form className="form" action={importAndLogExternalFood}>
            <input type="hidden" name="provider" value={provider} />
            <input type="hidden" name="provider_id" value={id} />
            <div className="form-grid">
              <PortionSelector
                servingGrams={serving.gramWeight}
                servingLabel={serving.label ?? undefined}
              />
              <label>
                Meal
                <select name="meal_type" defaultValue="dinner">
                  <option value="breakfast">Breakfast</option>
                  <option value="morning_snack">Morning snack</option>
                  <option value="lunch">Lunch</option>
                  <option value="afternoon_snack">Afternoon snack</option>
                  <option value="dinner">Dinner</option>
                  <option value="evening_snack">Evening snack</option>
                </select>
              </label>
              <label>
                Date
                <input name="date" type="date" defaultValue={today} required />
              </label>
              <label>
                Time
                <input name="time" type="time" defaultValue="18:00" required />
              </label>
            </div>
            <label>
              Notes (optional)
              <input name="notes" maxLength={500} />
            </label>
            <button className="button">Log food and update dashboard</button>
          </form>
        </section>
      )}
    </>
  );
}
