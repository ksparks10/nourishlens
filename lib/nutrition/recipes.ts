export interface RecipeNutrientPart {
  nutrientKey: string;
  amount: number | null;
  classification: string;
  lowerBound?: number | null;
  upperBound?: number | null;
}
export function calculateRecipeNutrition(
  parts: RecipeNutrientPart[],
  servings: number,
) {
  if (!Number.isFinite(servings) || servings <= 0)
    throw new Error("Recipe servings must be positive");
  const result: Record<
    string,
    {
      confirmed: number;
      calculated: number;
      projected: number;
      includingProjections: number;
      excludingProjections: number;
      lowerBound: number;
      upperBound: number;
      projectedPercentage: number;
      perServingIncluding: number;
      perServingExcluding: number;
    }
  > = {};
  for (const part of parts) {
    if (part.amount === null) continue;
    const row = result[part.nutrientKey] ?? {
      confirmed: 0,
      calculated: 0,
      projected: 0,
      includingProjections: 0,
      excludingProjections: 0,
      lowerBound: 0,
      upperBound: 0,
      projectedPercentage: 0,
      perServingIncluding: 0,
      perServingExcluding: 0,
    };
    if (
      ["measured", "provider_reported", "confirmed_zero"].includes(
        part.classification,
      )
    )
      row.confirmed += part.amount;
    else if (part.classification === "projected") row.projected += part.amount;
    else row.calculated += part.amount;
    row.includingProjections += part.amount;
    if (part.classification !== "projected")
      row.excludingProjections += part.amount;
    row.lowerBound += part.lowerBound ?? part.amount;
    row.upperBound += part.upperBound ?? part.amount;
    row.projectedPercentage = row.includingProjections
      ? Math.round((row.projected / row.includingProjections) * 10000) / 100
      : 0;
    row.perServingIncluding =
      Math.round((row.includingProjections / servings) * 1e6) / 1e6;
    row.perServingExcluding =
      Math.round((row.excludingProjections / servings) * 1e6) / 1e6;
    result[part.nutrientKey] = row;
  }
  return result;
}
