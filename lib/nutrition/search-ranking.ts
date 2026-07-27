import type { NormalizedFood } from "@/providers/nutrition/types";
import {
  foodNameMatchScore,
  normalizeSearchQuery,
  searchTextScore,
} from "./search-query";

function wordsIn(query: string) {
  return normalizeSearchQuery(query)
    .split(" ")
    .filter((word) => word.length > 1);
}

function hits(food: NormalizedFood, words: string[]) {
  const text = `${food.name} ${food.brand ?? ""}`;
  return words.filter((word) => searchTextScore(word, text) > 0).length;
}

export function sourcePriority(food: NormalizedFood) {
  if (food.provider === "nih_dsld") return 500;
  if (food.provider === "health_canada_cnf") return 440;
  if (food.provider !== "usda_fdc") return 100;
  const type = (food.description ?? "").toLowerCase();
  if (type.includes("foundation")) return 500;
  if (type.includes("sr legacy")) return 480;
  if (type.includes("survey") || type.includes("fndds")) return 460;
  if (type.includes("branded")) return 200;
  return food.foodType === "generic" ? 420 : 220;
}

export function deduplicateFoods(foods: NormalizedFood[]) {
  const unique = new Map<string, NormalizedFood>();
  for (const food of foods) {
    const key = `${food.brand ?? "generic"}|${food.name}`
      .toLowerCase()
      .replace(/[^a-z0-9|]/g, "");
    const existing = unique.get(key);
    if (
      !existing ||
      sourcePriority(food) > sourcePriority(existing) ||
      (sourcePriority(food) === sourcePriority(existing) &&
        food.dataCompleteness > existing.dataCompleteness)
    )
      unique.set(key, food);
  }
  return [...unique.values()];
}

export function rankFoodResults(foods: NormalizedFood[], query: string) {
  const words = wordsIn(query);
  return foods
    .filter((food) => {
      const matchCount = hits(food, words);
      return (
        words.length === 0 ||
        matchCount >= Math.max(1, Math.ceil(words.length / 2))
      );
    })
    .sort((a, b) => {
      const relevanceDifference =
        foodNameMatchScore(query, b.name, b.brand) -
        foodNameMatchScore(query, a.name, a.brand);
      if (relevanceDifference) return relevanceDifference;
      const hitDifference = hits(b, words) - hits(a, words);
      if (hitDifference) return hitDifference;
      const sourceDifference = sourcePriority(b) - sourcePriority(a);
      if (sourceDifference) return sourceDifference;
      return (
        b.dataCompleteness - a.dataCompleteness || a.name.localeCompare(b.name)
      );
    });
}
