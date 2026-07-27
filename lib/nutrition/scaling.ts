import type { NormalizedNutrient } from "@/providers/nutrition/types";
export function scaleAmount(per100g: number | null, grams: number) {
  if (per100g === null) return null;
  if (!Number.isFinite(grams) || grams <= 0)
    throw new Error("Serving grams must be positive");
  return Math.round((per100g * grams * 10000) / 100) / 10000;
}
export function scaleNutrients(nutrients: NormalizedNutrient[], grams: number) {
  return nutrients.map((nutrient) => ({
    ...nutrient,
    amount: scaleAmount(nutrient.amountPer100g, grams),
  }));
}
export function ouncesToGrams(ounces: number) {
  if (!Number.isFinite(ounces) || ounces <= 0)
    throw new Error("Ounces must be positive");
  return ounces * 28.349523125;
}
