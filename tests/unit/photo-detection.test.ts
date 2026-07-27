import { describe, expect, it } from "vitest";
import {
  isLikelyEdibleDetection,
  isPlausiblePhotoCatalogMatch,
} from "../../lib/nutrition/photo-detection";

describe("photo food detection filtering", () => {
  it.each([
    "fabric background",
    "tablecloth",
    "paper napkin",
    "plastic fork",
    "food wrapper",
  ])("removes non-food scene item %s", (name) => {
    expect(isLikelyEdibleDetection(name)).toBe(false);
  });

  it.each(["glazed doughnut", "Caesar salad", "bowl of cereal"])(
    "keeps edible item %s",
    (name) => {
      expect(isLikelyEdibleDetection(name)).toBe(true);
    },
  );

  it("rejects a preparation-only catalog match for a different food", () => {
    expect(
      isPlausiblePhotoCatalogMatch("Croutons", "Veal, liver, pan-fried"),
    ).toBe(false);
    expect(
      isPlausiblePhotoCatalogMatch(
        "Romaine lettuce",
        "Lettuce, cos or romaine",
      ),
    ).toBe(true);
    expect(
      isPlausiblePhotoCatalogMatch(
        "Dressing",
        "Frozen entree, pasta, penne with chicken in a cream sauce, heated",
      ),
    ).toBe(false);
    expect(
      isPlausiblePhotoCatalogMatch(
        "Caesar dressing",
        "Salad dressing, caesar",
      ),
    ).toBe(true);
  });
});
