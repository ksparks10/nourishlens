import { describe, expect, it } from "vitest";
import {
  effectiveDefaultServing,
  isPlainDrinkingWater,
} from "../../lib/nutrition/servings";

describe("food serving defaults", () => {
  it("uses an eight-ounce glass for a generic 100 g water reference", () => {
    expect(
      effectiveDefaultServing("Water, tap, drinking", {
        label: "100 g",
        gramWeight: 100,
      }),
    ).toEqual({ label: "1 glass (8 fl oz)", gramWeight: 236.6 });
  });

  it("preserves an explicitly sized water bottle", () => {
    expect(
      effectiveDefaultServing("Water, bottled", {
        label: "1 bottle",
        gramWeight: 500,
      }),
    ).toEqual({ label: "1 bottle", gramWeight: 500 });
  });

  it("does not treat foods containing a similar word as drinking water", () => {
    expect(isPlainDrinkingWater("Watermelon, raw")).toBe(false);
    expect(isPlainDrinkingWater("Water chestnuts")).toBe(false);
  });
});
