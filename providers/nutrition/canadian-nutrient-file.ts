import "server-only";
import { completeness, nutrientNameAliases, safeNumber } from "./shared";
import type {
  NormalizedFood,
  NormalizedNutrient,
  NutritionProvider,
  ProviderHealth,
  SearchOptions,
} from "./types";
import { foodNameMatchScore } from "@/lib/nutrition/search-query";
type Food = { food_code: number; food_description: string };
type Amount = {
  nutrient_value: number;
  nutrient_name_id: number;
  nutrient_web_name: string;
};
type NutrientName = {
  nutrient_name_id: number;
  unit: string;
  nutrient_web_name: string;
};
type Serving = { conversion_factor_value: number; measure_name: string };
const base = "https://food-nutrition.canada.ca/api/canadian-nutrient-file";
async function request<T>(path: string) {
  const response = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 604800 },
  });
  if (!response.ok)
    throw new Error(`Health Canada request failed (${response.status})`);
  return response.json() as Promise<T>;
}
async function foods() {
  return request<Food[]>("/food/?lang=en&type=json");
}
async function nutrientNames() {
  return request<NutrientName[]>("/nutrientname/?lang=en&type=json");
}
export class CanadianNutrientFileProvider implements NutritionProvider {
  readonly key = "health_canada_cnf" as const;
  async searchFoods({
    query,
    page = 1,
    pageSize = 10,
  }: SearchOptions): Promise<NormalizedFood[]> {
    const matches = (await foods())
        .map((food) => ({
          food,
          score: foodNameMatchScore(query, food.food_description),
        }))
        .filter(({ score }) => score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            a.food.food_description.localeCompare(b.food.food_description),
        )
        .map(({ food }) => food)
        .slice((page - 1) * pageSize, page * pageSize),
      details = await Promise.allSettled(
        matches.map((food) => this.getFoodById(String(food.food_code))),
      );
    return details.flatMap((result) =>
      result.status === "fulfilled" && result.value ? [result.value] : [],
    );
  }
  async getFoodById(id: string): Promise<NormalizedFood | null> {
    const code = Number(id);
    if (!Number.isInteger(code)) return null;
    const [foodList, amounts, names, servings] = await Promise.all([
      foods(),
      request<Amount[]>(`/nutrientamount/?id=${code}&lang=en&type=json`),
      nutrientNames(),
      request<Serving[]>(`/servingsize/?id=${code}&lang=en&type=json`),
    ]);
    const food = foodList.find((item) => item.food_code === code);
    if (!food) return null;
    const nameMap = new Map(names.map((item) => [item.nutrient_name_id, item]));
    const nutrients: NormalizedNutrient[] = amounts.flatMap((item) => {
      const meta = nameMap.get(item.nutrient_name_id),
        key =
          nutrientNameAliases[
            (meta?.nutrient_web_name ?? item.nutrient_web_name).toLowerCase()
          ],
        amount = safeNumber(item.nutrient_value);
      if (!key || amount === null) return [];
      return [
        {
          key,
          name: meta?.nutrient_web_name ?? item.nutrient_web_name,
          amountPer100g: amount,
          unit: (meta?.unit ?? "").toLowerCase(),
          classification: amount === 0 ? "confirmed_zero" : "provider_reported",
          providerCode: String(item.nutrient_name_id),
        },
      ];
    });
    const serving = servings[0],
      grams = serving ? safeNumber(serving.conversion_factor_value * 100) : 100;
    return {
      provider: this.key,
      providerId: id,
      name: food.food_description,
      brand: null,
      description: "Health Canada Canadian Nutrient File",
      barcode: null,
      imageUrl: null,
      foodType: "generic",
      servings: [
        {
          label: serving?.measure_name ?? "100 g",
          amount: 1,
          unit: "serving",
          gramWeight: grams ?? 100,
          isDefault: true,
        },
      ],
      nutrients,
      dataCompleteness: completeness(nutrients),
      containsProjections: false,
    };
  }
  async getFoodByBarcode(): Promise<NormalizedFood | null> {
    return null;
  }
  async getProviderHealth(): Promise<ProviderHealth> {
    return {
      provider: this.key,
      configured: true,
      healthy: true,
      message: "Free Government of Canada API; no key required",
    };
  }
}
