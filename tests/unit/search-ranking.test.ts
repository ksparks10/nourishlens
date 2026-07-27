import { describe, expect, it } from "vitest";
import {
  deduplicateFoods,
  rankFoodResults,
} from "../../lib/nutrition/search-ranking";
import type { NormalizedFood } from "../../providers/nutrition/types";

function food(
  name: string,
  provider: NormalizedFood["provider"],
  description: string,
  dataCompleteness: number,
): NormalizedFood {
  return {
    provider,
    providerId: `${provider}-${description}`,
    name,
    brand: null,
    description,
    barcode: null,
    imageUrl: null,
    foodType: description === "Branded" ? "branded" : "generic",
    servings: [],
    nutrients: [],
    dataCompleteness,
    containsProjections: false,
  };
}

describe("food search ranking", () => {
  it("prioritizes composition sources over branded label records", () => {
    const ranked = rankFoodResults(
      [
        food("Peanuts", "usda_fdc", "Branded", 80),
        food("Peanuts", "usda_fdc", "Foundation", 45),
        food("Peanuts", "health_canada_cnf", "Health Canada", 40),
      ],
      "peanuts",
    );
    expect(ranked.map((item) => item.description)).toEqual([
      "Foundation",
      "Health Canada",
      "Branded",
    ]);
  });

  it("keeps the stronger source when duplicate names collide", () => {
    const result = deduplicateFoods([
      food("Carrots, raw", "usda_fdc", "Branded", 90),
      food("Carrots, raw", "usda_fdc", "SR Legacy", 50),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBe("SR Legacy");
  });

  it("ranks a direct coffee beverage above coffee cake", () => {
    const ranked = rankFoodResults(
      [
        food("Cake, coffee cake, fruit", "usda_fdc", "Foundation", 90),
        food("Coffee, brewed", "health_canada_cnf", "Health Canada", 60),
        food("Coffee", "usda_fdc", "SR Legacy", 55),
      ],
      "coffee",
    );
    expect(ranked.map((item) => item.name)).toEqual([
      "Coffee",
      "Coffee, brewed",
      "Cake, coffee cake, fruit",
    ]);
  });
});
