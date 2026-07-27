import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { normalizeDsldLabel } from "../../providers/nutrition/dsld";

describe("NIH DSLD label normalization", () => {
  it("reads nested dietary fiber and gram-based servings", () => {
    const food = normalizeDsldLabel({
      id: 13873,
      fullName: "MultiHealth Fiber Orange Fiber Singles",
      brandName: "Metamucil",
      servingSizes: [{ minQuantity: 12, unit: "Gram(s)" }],
      ingredientRows: [
        {
          name: "Total Carbohydrates",
          quantity: [{ quantity: 12, unit: "g", servingSizeQuantity: 12 }],
          nestedRows: [
            {
              name: "Dietary Fiber",
              quantity: [{ quantity: 3, unit: "g", servingSizeQuantity: 12 }],
            },
          ],
        },
      ],
    });
    expect(food.servings[0]).toMatchObject({ gramWeight: 12 });
    expect(food.nutrients.find((item) => item.key === "fiber")).toMatchObject({
      amountPer100g: 25,
      unit: "g",
    });
  });
});
