import { describe, expect, it } from "vitest";
import { normalizeUsdaFood } from "../../providers/nutrition/usda-normalize";

describe("USDA FoodData Central normalization", () => {
  it("supports nested detail nutrients", () => {
    const food = normalizeUsdaFood({
      fdcId: 123,
      description: "Test food",
      servingSize: 28,
      servingSizeUnit: "GRM",
      foodNutrients: [
        {
          amount: 7,
          nutrient: { id: 1079, name: "Fiber, total dietary", unitName: "G" },
        },
      ],
    });
    expect(food.servings[0]?.gramWeight).toBe(28);
    expect(food.nutrients[0]).toMatchObject({
      key: "fiber",
      amountPer100g: 7,
      unit: "g",
    });
  });

  it("supports abridged search nutrients and deduplicates keys", () => {
    const food = normalizeUsdaFood({
      fdcId: 456,
      description: "Search food",
      foodNutrients: [
        {
          nutrientId: 1008,
          nutrientName: "Energy",
          unitName: "KCAL",
          value: 100,
        },
        {
          nutrientId: 2047,
          nutrientName: "Energy",
          unitName: "KCAL",
          value: 101,
        },
      ],
    });
    expect(food.nutrients).toHaveLength(1);
    expect(food.nutrients[0]).toMatchObject({
      key: "energy_kcal",
      unit: "kcal",
    });
  });
});
