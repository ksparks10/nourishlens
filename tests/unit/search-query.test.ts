import { describe, expect, it } from "vitest";
import {
  catalogFallbackQueries,
  foodNameMatchScore,
  normalizeSearchQuery,
  searchTextScore,
} from "../../lib/nutrition/search-query";

describe("search query normalization", () => {
  it("builds layered fallbacks for reordered catalog names", () => {
    expect(catalogFallbackQueries("Romaine lettuce, raw")).toEqual([
      "romaine lettuce raw",
      "romaine lettuce",
      "lettuce romaine",
      "romaine",
      "lettuce",
    ]);
  });

  it.each([
    ["sphagetti and meatballs", "spaghetti and meatballs"],
    ["fil oil", "fish oil"],
    ["multivitmain", "multivitamin"],
    ["men's vitamins", "men multivitamin"],
    ["women's multi vitamin", "women multivitamin"],
    ["kids vitamins", "children multivitamin"],
    ["portabella mushrooms", "portobello mushroom"],
    ["potatoes", "potato"],
  ])("normalizes %s", (query, expected) => {
    expect(normalizeSearchQuery(query)).toBe(expected);
  });

  it("matches an unlisted one-character typo", () => {
    expect(searchTextScore("carot", "Carrots, raw")).toBeGreaterThan(0);
  });

  it("does not fuzzy-match unrelated short words", () => {
    expect(searchTextScore("ham", "Yam, cooked")).toBe(0);
  });

  it("scores direct food names above incidental dish-name matches", () => {
    expect(foodNameMatchScore("coffee", "Coffee, brewed")).toBeGreaterThan(
      foodNameMatchScore("coffee", "Cake, coffee cake, fruit"),
    );
  });
});
