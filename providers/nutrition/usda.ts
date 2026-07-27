import "server-only";
import { env } from "@/lib/env";
import { normalizeUsdaFood, type UsdaFood } from "./usda-normalize";
import type { NutritionProvider, ProviderHealth, SearchOptions } from "./types";
async function request<T>(path: string, params: Record<string, string>) {
  const apiKey = env.USDA_FDC_API_KEY ?? "DEMO_KEY",
    url = new URL(`https://api.nal.usda.gov/fdc/v1${path}`);
  Object.entries({ ...params, api_key: apiKey }).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`USDA request failed (${response.status})`);
  return response.json() as Promise<T>;
}
export class UsdaProvider implements NutritionProvider {
  readonly key = "usda_fdc" as const;
  async searchFoods({ query, page = 1, pageSize = 10 }: SearchOptions) {
    const data = await request<{ foods: UsdaFood[] }>("/foods/search", {
      query,
      pageNumber: String(page),
      pageSize: String(Math.min(pageSize, 25)),
    });
    return (data.foods ?? [])
      .filter(
        (food) =>
          food.dataType !== "Experimental" &&
          !/randomized|controlled trial|secondary analysis|intervention|plasma|status among/i.test(
            food.description,
          ),
      )
      .map(normalizeUsdaFood)
      .filter((food) => food.nutrients.length > 0);
  }
  async getFoodById(id: string) {
    return normalizeUsdaFood(
      await request<UsdaFood>(`/food/${encodeURIComponent(id)}`, {}),
    );
  }
  async getFoodByBarcode(barcode: string) {
    const results = await this.searchFoods({ query: barcode, pageSize: 5 });
    return results.find((food) => food.barcode === barcode) ?? null;
  }
  async getProviderHealth(): Promise<ProviderHealth> {
    return {
      provider: this.key,
      configured: true,
      healthy: true,
      message: env.USDA_FDC_API_KEY
        ? "Configured with private free key"
        : "Using free DEMO_KEY local limits (30/hour, 50/day)",
    };
  }
}
