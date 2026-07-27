import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export type FoodRecommendation = {
  food_id: string;
  food_name: string;
  brand: string | null;
  serving_label: string | null;
  serving_grams: number | null;
  score: number;
  nutrient_hits: number;
  contributions: {
    key: string;
    name: string;
    amountPer100g: number;
    unit: string;
    targetShare?: number;
    currentProgress?: number;
    deficitWeight?: number;
  }[];
};
export async function getFoodRecommendations(
  supabase: SupabaseClient,
  keys: string[],
  limit = 10,
): Promise<FoodRecommendation[]> {
  if (keys.length === 0) return [];
  const { data, error } = await supabase.rpc("recommend_foods_for_nutrients", {
    p_nutrient_keys: [...new Set(keys)],
    p_limit: limit,
  });
  if (error) throw new Error("Unable to load food recommendations");
  return (data ?? []).map((row: FoodRecommendation) => ({
    ...row,
    score: Number(row.score),
    serving_grams:
      row.serving_grams === null ? null : Number(row.serving_grams),
    contributions: (row.contributions ?? []).map((item) => ({
      ...item,
      amountPer100g: Number(item.amountPer100g),
      targetShare: Number(item.targetShare),
    })),
  }));
}
export async function getGapFoodRecommendations(
  supabase: SupabaseClient,
  gaps: { key: string; progressPercent: number; deficitWeight: number }[],
  limit = 10,
): Promise<FoodRecommendation[]> {
  if (!gaps.length) return [];
  const { data, error } = await supabase.rpc("recommend_foods_for_gaps", {
    p_gaps: gaps.map((gap) => ({
      key: gap.key,
      progress_percent: gap.progressPercent,
      deficit_weight: gap.deficitWeight,
    })),
    p_limit: limit,
  });
  if (error) throw new Error("Unable to load nutrient-gap recommendations");
  return (data ?? []).map((row: FoodRecommendation) => ({
    ...row,
    score: Number(row.score),
    serving_grams:
      row.serving_grams === null ? null : Number(row.serving_grams),
    contributions: (row.contributions ?? []).map((item) => ({
      ...item,
      amountPer100g: Number(item.amountPer100g),
      currentProgress: Number(item.currentProgress),
      deficitWeight: Number(item.deficitWeight),
    })),
  }));
}
