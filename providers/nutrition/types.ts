export type NutrientClassification =
  | "measured"
  | "provider_reported"
  | "calculated"
  | "projected"
  | "inferred"
  | "user_entered"
  | "confirmed_zero"
  | "not_reported"
  | "not_applicable";
export type ProviderKey =
  | "internal"
  | "usda_fdc"
  | "open_food_facts"
  | "nih_dsld"
  | "health_canada_cnf";
export interface NormalizedNutrient {
  key: string;
  name: string;
  amountPer100g: number | null;
  unit: string;
  classification: NutrientClassification;
  providerCode?: string;
}
export interface NormalizedServing {
  label: string;
  amount: number;
  unit: string;
  gramWeight: number | null;
  milliliterVolume?: number | null;
  isDefault: boolean;
}
export interface NormalizedFood {
  provider: ProviderKey;
  providerId: string;
  name: string;
  brand: string | null;
  description: string | null;
  barcode: string | null;
  imageUrl: string | null;
  foodType: "generic" | "branded" | "restaurant";
  servings: NormalizedServing[];
  nutrients: NormalizedNutrient[];
  dataCompleteness: number;
  containsProjections: boolean;
}
export interface SearchOptions {
  query: string;
  page?: number;
  pageSize?: number;
}
export interface ProviderHealth {
  provider: string;
  configured: boolean;
  healthy: boolean;
  message: string;
}
export interface NutritionProvider {
  readonly key: NormalizedFood["provider"];
  searchFoods(options: SearchOptions): Promise<NormalizedFood[]>;
  getFoodById(id: string): Promise<NormalizedFood | null>;
  getFoodByBarcode(barcode: string): Promise<NormalizedFood | null>;
  getProviderHealth(): Promise<ProviderHealth>;
}
