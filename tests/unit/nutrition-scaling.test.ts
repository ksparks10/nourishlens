import { describe, expect, it } from "vitest";
import {
  ouncesToGrams,
  scaleAmount,
  scaleNutrients,
} from "../../lib/nutrition/scaling";
import { completeness, safeNumber } from "../../providers/nutrition/shared";
describe("nutrition scaling", () => {
  it("scales per-100g values deterministically", () =>
    expect(scaleAmount(205, 180)).toBe(369));
  it("preserves missing values", () =>
    expect(scaleAmount(null, 180)).toBeNull());
  it("converts ounces", () => expect(ouncesToGrams(2)).toBeCloseTo(56.699, 3));
  it("rejects invalid quantities", () =>
    expect(() => scaleAmount(10, 0)).toThrow());
  it("preserves classifications", () =>
    expect(
      scaleNutrients(
        [
          {
            key: "protein",
            name: "Protein",
            amountPer100g: 7,
            unit: "g",
            classification: "provider_reported",
          },
        ],
        50,
      )[0],
    ).toMatchObject({ amount: 3.5, classification: "provider_reported" }));
});
describe("provider normalization helpers", () => {
  it("does not accept negative or invalid nutrient values", () => {
    expect(safeNumber(-1)).toBeNull();
    expect(safeNumber("unknown")).toBeNull();
  });
  it("scores completeness across all tracked nutrients", () =>
    expect(
      completeness([
        {
          key: "energy_kcal",
          name: "Calories",
          amountPer100g: 10,
          unit: "kcal",
          classification: "provider_reported",
        },
      ]),
    ).toBe(1));
});
