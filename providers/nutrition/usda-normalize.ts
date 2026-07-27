import {
  completeness,
  nutrientAliases,
  nutrientNameAliases,
  safeNumber,
} from "./shared";
import type { NormalizedFood, NormalizedNutrient } from "./types";

export type UsdaNutrient = {
  nutrientId?: number;
  nutrientNumber?: string;
  nutrientName?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: {
    id?: number;
    number?: string;
    name?: string;
    unitName?: string;
  };
};
export type UsdaFood = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaNutrient[];
  dataType?: string;
};

function normalizedUnit(value?: string) {
  if (/kcal/i.test(value ?? "")) return "kcal";
  return (value ?? "").replace(/(?:mcg|Âµg|µg).*$/i, "mcg").toLowerCase();
}

export function normalizeUsdaFood(food: UsdaFood): NormalizedFood {
  const nutrientMap = new Map<string, NormalizedNutrient>();
  for (const item of food.foodNutrients ?? []) {
    const code = String(
        item.nutrientId ??
          item.nutrientNumber ??
          item.nutrient?.id ??
          item.nutrient?.number ??
          "",
      ),
      name = item.nutrientName ?? item.nutrient?.name ?? "",
      key =
        nutrientAliases[code] ?? nutrientNameAliases[name.trim().toLowerCase()],
      amount = safeNumber(item.value ?? item.amount);
    if (!key || amount === null) continue;
    nutrientMap.set(key, {
      key,
      name: name || key,
      amountPer100g: amount,
      unit: normalizedUnit(item.unitName ?? item.nutrient?.unitName),
      classification: amount === 0 ? "confirmed_zero" : "provider_reported",
      providerCode: code,
    });
  }
  const nutrients = [...nutrientMap.values()];
  const servingAmount = safeNumber(food.servingSize),
    servingUnit = food.servingSizeUnit ?? "g",
    servingIsGrams = /^(?:g|grm|gram|grams)$/i.test(servingUnit),
    isBranded = Boolean(food.brandOwner || food.brandName);
  return {
    provider: "usda_fdc",
    providerId: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner ?? food.brandName ?? null,
    description: food.dataType ?? null,
    barcode: food.gtinUpc ?? null,
    imageUrl: null,
    foodType: isBranded ? "branded" : "generic",
    servings: [
      {
        label: servingAmount ? `${servingAmount} ${servingUnit}` : "100 g",
        amount: 1,
        unit: "serving",
        gramWeight: servingIsGrams && servingAmount ? servingAmount : 100,
        isDefault: true,
      },
    ],
    nutrients,
    dataCompleteness: completeness(nutrients),
    containsProjections: false,
  };
}
