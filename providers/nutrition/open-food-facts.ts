import "server-only";
import { env } from "@/lib/env";
import { completeness, nutrientAliases, safeNumber } from "./shared";
import type {
  NormalizedFood,
  NormalizedNutrient,
  NutritionProvider,
  ProviderHealth,
  SearchOptions,
} from "./types";
type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: Record<string, unknown>;
};
function normalize(product: OffProduct): NormalizedFood | null {
  if (!product.product_name) return null;
  const nutrients: NormalizedNutrient[] = Object.entries(nutrientAliases)
    .filter(([code]) => !/^\d/.test(code))
    .flatMap(([code, key]) => {
      const value = safeNumber(product.nutriments?.[`${code}_100g`]);
      if (value === null) return [];
      const unit = String(
        product.nutriments?.[`${code}_unit`] ??
          (key === "energy_kcal" ? "kcal" : "g"),
      );
      return [
        {
          key,
          name: key.replaceAll("_", " "),
          amountPer100g: value,
          unit,
          classification: value === 0 ? "confirmed_zero" : "provider_reported",
          providerCode: code,
        },
      ];
    });
  const grams = safeNumber(product.serving_quantity);
  return {
    provider: "open_food_facts",
    providerId: product.code ?? product.product_name,
    name: product.product_name,
    brand: product.brands ?? null,
    description: product.quantity ?? null,
    barcode: product.code ?? null,
    imageUrl: product.image_front_small_url ?? null,
    foodType: "branded",
    servings: [
      {
        label: product.serving_size ?? (grams ? `${grams} g` : "100 g"),
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
async function request<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        env.OPEN_FOOD_FACTS_USER_AGENT ?? "NourishLens/0.1 (local-development)",
    },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 86400 },
  });
  if (!response.ok)
    throw new Error(`Open Food Facts request failed (${response.status})`);
  return response.json() as Promise<T>;
}
export class OpenFoodFactsProvider implements NutritionProvider {
  readonly key = "open_food_facts" as const;
  async searchFoods({ query, page = 1, pageSize = 10 }: SearchOptions) {
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(Math.min(pageSize, 25)));
    const data = await request<{ products?: OffProduct[] }>(url);
    return (data.products ?? [])
      .map(normalize)
      .filter((food): food is NormalizedFood => food !== null);
  }
  async getFoodById(id: string) {
    return this.getFoodByBarcode(id);
  }
  async getFoodByBarcode(barcode: string) {
    const url = new URL(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    );
    const data = await request<{ status: number; product?: OffProduct }>(url);
    return data.status === 1 && data.product ? normalize(data.product) : null;
  }
  async getProviderHealth(): Promise<ProviderHealth> {
    return {
      provider: this.key,
      configured: Boolean(env.OPEN_FOOD_FACTS_USER_AGENT),
      healthy: true,
      message: env.OPEN_FOOD_FACTS_USER_AGENT
        ? "Configured"
        : "Using local-development identification; configure before deployment",
    };
  }
}
