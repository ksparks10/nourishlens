import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export interface DailyTotal {
  nutrient_id: string;
  nutrient_key: string;
  nutrient_name: string;
  unit: string;
  confirmed_amount: number;
  calculated_amount: number;
  projected_amount: number;
  user_entered_amount: number;
  total_excluding_projections: number;
  total_including_projections: number;
  missing_count: number;
  food_count: number;
}
export interface DailyTarget {
  nutrient_id: string;
  target_amount: number | null;
  minimum_amount: number | null;
  maximum_amount: number | null;
  target_type: string;
  nutrients: {
    key: string;
    name: string;
    nutrient_categories: { key: string; name: string };
    nutrient_units: { symbol: string };
  };
  target_methodologies: { name: string; source_name: string };
}
export async function getDailyNutrition(
  supabase: SupabaseClient,
  date: string,
): Promise<{ totals: DailyTotal[]; targets: DailyTarget[] }> {
  const [{ data: totals, error }, { data: targets }] = await Promise.all([
    supabase.rpc("daily_nutrient_totals", { p_date: date }),
    supabase
      .from("user_nutrient_targets")
      .select(
        "nutrient_id,target_amount,minimum_amount,maximum_amount,target_type,nutrients(key,name,nutrient_categories(key,name),nutrient_units:default_unit_id(symbol)),target_methodologies(name,source_name)",
      ),
  ]);
  if (error) throw new Error("Unable to calculate daily totals");
  return {
    totals: (totals ?? []).map(
      (row: DailyTotal) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            typeof value === "string" && /amount|count/.test(key)
              ? Number(value)
              : value,
          ]),
        ) as unknown as DailyTotal,
    ),
    targets: (targets ?? []) as unknown as DailyTarget[],
  };
}
export function targetStatus(total: number, target?: DailyTarget) {
  if (
    !target ||
    target.target_type === "informational" ||
    target.target_type === "none"
  )
    return "No established target";
  if (target.maximum_amount !== null && total > Number(target.maximum_amount))
    return target.target_type === "upper_limit"
      ? "Above upper limit"
      : "Above target";
  if (target.minimum_amount !== null && total < Number(target.minimum_amount))
    return "Below target";
  if (
    target.maximum_amount !== null &&
    total >= Number(target.maximum_amount) * 0.9
  )
    return "Near maximum";
  return "Within target";
}
export function targetPercent(total: number, target?: DailyTarget) {
  const amount = Number(
    target?.target_amount ??
      target?.minimum_amount ??
      target?.maximum_amount ??
      0,
  );
  return amount > 0 ? Math.round((total / amount) * 100) : null;
}
