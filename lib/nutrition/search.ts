import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedFood, ProviderKey } from "@/providers/nutrition/types";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveDefaultServing } from "@/lib/nutrition/servings";
import {
  catalogFallbackQueries,
  foodNameMatchScore,
} from "@/lib/nutrition/search-query";
export interface FoodSearchResult {
  id: string;
  provider: ProviderKey;
  name: string;
  brand: string | null;
  foodType: string;
  isVerified: boolean;
  dataCompleteness: number;
  containsProjections: boolean;
  sourceKey: string;
  servingLabel: string | null;
  servingGrams: number | null;
  calories: number | null;
  imageUrl?: string | null;
}
type CatalogRow = {
  id: string;
  name: string;
  brand: string | null;
  food_type: string;
  is_verified: boolean;
  data_completeness: number;
  contains_projections: boolean;
  source_key: string | null;
  serving_label: string | null;
  serving_grams: number | null;
  calories: number | null;
};
export async function searchInternal(
  supabase: SupabaseClient,
  query: string,
  limit: number,
  offset: number,
): Promise<FoodSearchResult[]> {
  const { data, error } = await supabase.rpc("search_food_catalog", {
    search_query: query,
    result_limit: limit,
    result_offset: offset,
  });
  if (error) throw new Error("Catalog search failed");
  return ((data ?? []) as CatalogRow[]).map((row) => {
    const serving = effectiveDefaultServing(row.name, {
      label: row.serving_label,
      gramWeight: row.serving_grams === null ? null : Number(row.serving_grams),
    });
    return {
      id: row.id,
      provider: "internal",
      name: row.name,
      brand: row.brand,
      foodType: row.food_type,
      isVerified: row.is_verified,
      dataCompleteness: row.data_completeness,
      containsProjections: row.contains_projections,
      sourceKey: row.source_key ?? "internal",
      servingLabel: serving.label,
      servingGrams: serving.gramWeight,
      calories: row.calories === null ? null : Number(row.calories),
    };
  });
}

export async function searchInternalRobust(
  supabase: SupabaseClient,
  query: string,
  limit = 5,
): Promise<FoodSearchResult[]> {
  const searches = catalogFallbackQueries(query);
  if (!searches.length) return [];
  const batches = await Promise.all(
    searches.map((candidate) => searchInternal(supabase, candidate, limit, 0)),
  );
  const unique = new Map<string, FoodSearchResult>();
  for (const result of batches.flat()) unique.set(result.id, result);
  return [...unique.values()]
    .sort((a, b) => {
      const textDifference =
        foodNameMatchScore(query, b.name, b.brand) -
        foodNameMatchScore(query, a.name, a.brand);
      if (textDifference) return textDifference;
      const genericDifference =
        Number(b.foodType === "generic" && !b.brand) -
        Number(a.foodType === "generic" && !a.brand);
      if (genericDifference) return genericDifference;
      return b.dataCompleteness - a.dataCompleteness;
    })
    .slice(0, limit);
}
export function externalResult(food: NormalizedFood): FoodSearchResult {
  const sourceServing =
      food.servings.find((item) => item.isDefault) ?? food.servings[0],
    serving = effectiveDefaultServing(food.name, sourceServing);
  const calorie =
    food.nutrients.find((item) => item.key === "energy_kcal")?.amountPer100g ??
    null;
  return {
    id: food.providerId,
    provider: food.provider,
    name: food.name,
    brand: food.brand,
    foodType: food.foodType,
    isVerified: false,
    dataCompleteness: food.dataCompleteness,
    containsProjections: false,
    sourceKey: food.provider,
    servingLabel: serving.label,
    servingGrams: serving.gramWeight,
    calories:
      calorie !== null && serving.gramWeight
        ? (calorie * serving.gramWeight) / 100
        : null,
    imageUrl: food.imageUrl,
  };
}
export async function cacheExternalFoods(foods: NormalizedFood[]) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY || foods.length === 0) return;
  const admin = createAdminClient(),
    { error } = await admin.from("provider_food_cache").upsert(
      foods.map((food) => ({
        provider_key: food.provider,
        provider_record_id: food.providerId,
        normalized_payload: food,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })),
    );
  if (error)
    throw new Error(`Unable to cache external foods: ${error.message}`);
}
export async function getCachedExternalFood(
  provider: string,
  id: string,
): Promise<NormalizedFood | null> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("provider_food_cache")
    .select("normalized_payload")
    .eq("provider_key", provider)
    .eq("provider_record_id", id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return (data?.normalized_payload as NormalizedFood | undefined) ?? null;
}
