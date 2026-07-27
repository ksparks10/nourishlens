import { requirePremiumAccess } from "@/lib/billing/access";
import { requireUser } from "@/lib/auth/authorization";
import { localDateInputValue } from "@/lib/date/local-date";
const csv = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;
type ExportDay = {
  diary_date: string;
  meals: {
    meal_types: { name: string };
    meal_entries: {
      food_name_snapshot: string;
      brand_snapshot: string | null;
      quantity: number;
      unit: string;
      food_version_id: string;
      meal_entry_nutrient_snapshots: {
        amount: number | null;
        value_classification: string;
        source_classification: string;
        projection_confidence: number | null;
        projection_method: string | null;
        projection_id: string | null;
        nutrients: { name: string };
        nutrient_units: { symbol: string };
      }[];
    }[];
  }[];
};
export async function GET(request: Request) {
  await requirePremiumAccess();
  const url = new URL(request.url);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("from") ?? "")
    ? url.searchParams.get("from")!
    : localDateInputValue(new Date(Date.now() - 29 * 86400000));
  const to = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("to") ?? "")
    ? url.searchParams.get("to")!
    : localDateInputValue();
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("diary_days")
    .select(
      "diary_date,meals(meal_types(name),meal_entries(food_name_snapshot,brand_snapshot,quantity,unit,food_version_id,meal_entry_nutrient_snapshots(amount,value_classification,source_classification,projection_confidence,projection_method,projection_id,nutrients(name),nutrient_units(symbol))))",
    )
    .gte("diary_date", from)
    .lte("diary_date", to)
    .order("diary_date");
  const lines = [
    "Date,Meal,Food,Brand,Serving,Nutrient,Value,Unit,Value classification,Confirmed amount,Projected amount,Projection confidence,Projection method,Food version,Projection ID",
  ];
  for (const day of (data ?? []) as unknown as ExportDay[])
    for (const meal of day.meals)
      for (const entry of meal.meal_entries)
        for (const nutrient of entry.meal_entry_nutrient_snapshots) {
          const projected = nutrient.value_classification === "projected";
          lines.push(
            [
              day.diary_date,
              meal.meal_types.name,
              entry.food_name_snapshot,
              entry.brand_snapshot,
              `${entry.quantity} ${entry.unit}`,
              nutrient.nutrients.name,
              nutrient.amount,
              nutrient.nutrient_units.symbol,
              nutrient.value_classification,
              projected ? 0 : nutrient.amount,
              projected ? nutrient.amount : 0,
              nutrient.projection_confidence,
              nutrient.projection_method,
              entry.food_version_id,
              nutrient.projection_id,
            ]
              .map(csv)
              .join(","),
          );
        }
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nutrition-${from}-to-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
