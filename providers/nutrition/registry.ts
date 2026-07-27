import "server-only";
import { UsdaProvider } from "./usda";
import { DsldProvider } from "./dsld";
import { CanadianNutrientFileProvider } from "./canadian-nutrient-file";
import type { NutritionProvider, ProviderKey } from "./types";
export const externalProviders = () =>
  [
    new UsdaProvider(),
    new DsldProvider(),
    new CanadianNutrientFileProvider(),
  ] satisfies NutritionProvider[];
export function providersForQuery(query: string): NutritionProvider[] {
  void query;
  return externalProviders();
}
export function providerFor(key: ProviderKey): NutritionProvider | null {
  return externalProviders().find((provider) => provider.key === key) ?? null;
}
