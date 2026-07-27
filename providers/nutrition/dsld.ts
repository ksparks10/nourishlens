import "server-only";
import { completeness, nutrientNameAliases, safeNumber } from "./shared";
import { normalizeSearchQuery } from "../../lib/nutrition/search-query";
import type {
  NormalizedFood,
  NormalizedNutrient,
  NutritionProvider,
  ProviderHealth,
  SearchOptions,
} from "./types";
type Serving = { minQuantity?: number; maxQuantity?: number; unit?: string };
type Hit = {
  _id: string;
  _source: {
    fullName?: string;
    brandName?: string;
    upcSku?: string;
    servingSizes?: Serving[];
    physicalState?: { langualCodeDescription?: string };
    events?: { date?: string; type?: string }[];
  };
};
type Quantity = {
  quantity?: number;
  unit?: string;
  servingSizeQuantity?: number;
  servingSizeUnit?: string;
};
type Ingredient = {
  name?: string;
  ingredientGroup?: string;
  quantity?: Quantity[];
  nestedRows?: Ingredient[];
};
type Label = {
  id: number;
  fullName: string;
  brandName?: string;
  upcSku?: string;
  productType?: { langualCodeDescription?: string };
  servingSizes?: Serving[];
  ingredientRows?: Ingredient[];
};
const base = "https://api.ods.od.nih.gov/dsld/v9";
async function request<T>(path: string) {
  const response = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 86400 },
  });
  if (!response.ok)
    throw new Error(`NIH DSLD request failed (${response.status})`);
  return response.json() as Promise<T>;
}
const cleanBarcode = (value?: string) => {
  const code = (value ?? "").replace(/\D/g, "");
  return code.length >= 8 ? code : null;
};
function summary(hit: Hit): NormalizedFood {
  const source = hit._source,
    serving = source.servingSizes?.[0],
    quantity = safeNumber(serving?.minQuantity) ?? 1,
    unit =
      serving?.unit ??
      source.physicalState?.langualCodeDescription ??
      "serving";
  return {
    provider: "nih_dsld",
    providerId: hit._id,
    name: source.fullName ?? `NIH supplement ${hit._id}`,
    brand: source.brandName ?? null,
    description: "NIH Dietary Supplement Label Database",
    barcode: cleanBarcode(source.upcSku),
    imageUrl: null,
    foodType: "branded",
    servings: [
      {
        label: `${quantity} ${unit}`,
        amount: quantity,
        unit,
        gramWeight: 1,
        isDefault: true,
      },
    ],
    nutrients: [],
    dataCompleteness: 0,
    containsProjections: false,
  };
}
function flattenIngredients(rows: Ingredient[]): Ingredient[] {
  return rows.flatMap((row) => [
    row,
    ...flattenIngredients(row.nestedRows ?? []),
  ]);
}

function normalizedUnit(value?: string) {
  if (/calorie/i.test(value ?? "")) return "kcal";
  return (value ?? "").replace(/(?:mcg|Âµg).*$/i, "mcg").toLowerCase();
}

export function normalizeDsldLabel(label: Label): NormalizedFood {
  const serving = label.servingSizes?.[0],
    servingQuantity = safeNumber(serving?.minQuantity) ?? 1,
    servingUnit = serving?.unit ?? "serving",
    servingIsGrams = /^g(?:ram)?(?:\(s\)|s)?$/i.test(servingUnit),
    servingGrams = servingIsGrams ? servingQuantity : 1;
  const nutrients: NormalizedNutrient[] = flattenIngredients(
    label.ingredientRows ?? [],
  ).flatMap((row) => {
    const key =
      nutrientNameAliases[
        (row.name ?? row.ingredientGroup ?? "").toLowerCase()
      ];
    const quantity = row.quantity?.[0],
      amount = safeNumber(quantity?.quantity),
      quantityServingGrams = safeNumber(quantity?.servingSizeQuantity),
      basisGrams = servingIsGrams
        ? (quantityServingGrams ?? servingGrams)
        : servingGrams;
    if (!key || amount === null) return [];
    const unit = normalizedUnit(quantity?.unit);
    return [
      {
        key,
        name: row.name ?? row.ingredientGroup ?? key,
        amountPer100g: (amount / basisGrams) * 100,
        unit,
        classification: amount === 0 ? "confirmed_zero" : "provider_reported",
        providerCode: String(label.id),
      },
    ];
  });
  return {
    provider: "nih_dsld",
    providerId: String(label.id),
    name: label.fullName,
    brand: label.brandName ?? null,
    description:
      label.productType?.langualCodeDescription ?? "Dietary supplement",
    barcode: cleanBarcode(label.upcSku),
    imageUrl: null,
    foodType: "branded",
    servings: [
      {
        label: `${servingQuantity} ${servingUnit}`,
        amount: servingQuantity,
        unit: servingUnit,
        gramWeight: servingGrams,
        isDefault: true,
      },
    ],
    nutrients,
    dataCompleteness: completeness(nutrients),
    containsProjections: false,
  };
}
export class DsldProvider implements NutritionProvider {
  readonly key = "nih_dsld" as const;
  async searchFoods({ query }: SearchOptions) {
    const normalizedQuery = normalizeSearchQuery(query).replace(/^my\s+/, "");
    const data = await request<{ hits?: Hit[] }>(
      `/search-filter?q=${encodeURIComponent(normalizedQuery)}`,
    );
    const words = normalizedQuery
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(
        (word) => word.length > 1 && !["a", "an", "the", "of"].includes(word),
      );
    const relevant = (data.hits ?? []).filter((hit) => {
      const text =
        `${hit._source.fullName ?? ""} ${hit._source.brandName ?? ""}`.toLowerCase();
      return words.length === 0 || words.every((word) => text.includes(word));
    });
    const unique = new Map<string, Hit>();
    for (const hit of relevant) {
      const key = `${hit._source.brandName ?? ""}|${hit._source.fullName ?? ""}`
        .toLowerCase()
        .replace(/[^a-z0-9|]/g, "");
      const existing = unique.get(key);
      const offMarket =
        hit._source.events?.some((event) => event.type === "Off Market") ??
        false;
      const existingOffMarket =
        existing?._source.events?.some(
          (event) => event.type === "Off Market",
        ) ?? false;
      if (!existing || (existingOffMarket && !offMarket)) unique.set(key, hit);
    }
    return [...unique.values()].slice(0, 10).map(summary);
  }
  async getFoodById(id: string) {
    return normalizeDsldLabel(
      await request<Label>(`/label/${encodeURIComponent(id)}`),
    );
  }
  async getFoodByBarcode(barcode: string) {
    const data = await request<{ hits?: Hit[] }>(
      `/search-filter?q=${encodeURIComponent(`"${barcode}"`)}`,
    );
    const hit = data.hits?.[0];
    return hit ? this.getFoodById(hit._id) : null;
  }
  async getProviderHealth(): Promise<ProviderHealth> {
    return {
      provider: this.key,
      configured: true,
      healthy: true,
      message:
        "Free NIH public-domain API; no key required for standard limits",
    };
  }
}
