import { normalizeSearchQuery } from "./search-query";

export const STANDARD_WATER_GLASS_GRAMS = 236.6;

export function isPlainDrinkingWater(name: string) {
  const normalized = normalizeSearchQuery(name);
  const recognizedWaterType =
    /^water (?:bottled|carbonated|distilled|drinking|mineral|municipal|plain|purified|sparkling|spring|tap|well)(?: |$)/.test(
      normalized,
    );
  return (
    normalized === "water" ||
    recognizedWaterType ||
    /^(?:beverage|beverages) water(?: |$)/.test(normalized)
  );
}

export function effectiveDefaultServing(
  foodName: string,
  serving?: { label?: string | null; gramWeight?: number | null } | null,
) {
  const grams = serving?.gramWeight ?? null;
  const genericReferenceServing =
    grams === null ||
    (Math.abs(grams - 100) < 0.01 &&
      /^(?:100\s*g|serving)?$/i.test(serving?.label?.trim() ?? ""));
  if (isPlainDrinkingWater(foodName) && genericReferenceServing)
    return {
      label: "1 glass (8 fl oz)",
      gramWeight: STANDARD_WATER_GLASS_GRAMS,
    };
  return {
    label: serving?.label ?? null,
    gramWeight: grams ?? 100,
  };
}
