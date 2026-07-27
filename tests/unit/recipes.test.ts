import { describe, expect, it } from "vitest";
import { calculateRecipeNutrition } from "../../lib/nutrition/recipes";
describe("recipe nutrition", () => {
  const parts = [
    { nutrientKey: "iron", amount: 8, classification: "calculated" },
    {
      nutrientKey: "iron",
      amount: 2,
      classification: "projected",
      lowerBound: 1,
      upperBound: 3,
    },
  ];
  it("calculates total and per-serving nutrition", () =>
    expect(calculateRecipeNutrition(parts, 5).iron).toMatchObject({
      includingProjections: 10,
      excludingProjections: 8,
      perServingIncluding: 2,
      perServingExcluding: 1.6,
    }));
  it("preserves projected lineage in totals", () =>
    expect(calculateRecipeNutrition(parts, 5).iron).toMatchObject({
      projected: 2,
      projectedPercentage: 20,
      lowerBound: 9,
      upperBound: 11,
    }));
  it("rejects invalid serving counts", () =>
    expect(() => calculateRecipeNutrition(parts, 0)).toThrow());
  it("does not treat missing ingredient nutrients as zero contributions", () =>
    expect(
      calculateRecipeNutrition(
        [{ nutrientKey: "zinc", amount: null, classification: "not_reported" }],
        2,
      ).zinc,
    ).toBeUndefined());
});
