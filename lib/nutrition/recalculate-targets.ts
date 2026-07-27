import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ageOnDate, calculateTargets } from "@/lib/nutrition/targets";

type Profile = {
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  biological_sex: "female" | "male" | "unspecified";
  activity_level:
    "sedentary" | "light" | "moderate" | "very_active" | "extra_active";
  primary_goal:
    | "maintain"
    | "lose"
    | "gain"
    | "build_muscle"
    | "diet_quality"
    | "micronutrients"
    | "custom";
  custom_calorie_target?: number | null;
  custom_protein_target?: number | null;
};

export async function recalculateUserTargets(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
) {
  const targets = calculateTargets({
    age: ageOnDate(profile.birth_date),
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    biologicalSex: profile.biological_sex,
    activityLevel: profile.activity_level,
    goal: profile.primary_goal,
    customCalories: profile.custom_calorie_target,
    customProtein: profile.custom_protein_target,
  });
  const [
    { data: nutrients },
    { data: methods },
    { data: units },
    { data: existing },
  ] = await Promise.all([
    supabase
      .from("nutrients")
      .select("id,key")
      .in(
        "key",
        targets.map((item) => item.key),
      ),
    supabase.from("target_methodologies").select("id,key"),
    supabase.from("nutrient_units").select("id,symbol"),
    supabase
      .from("user_nutrient_targets")
      .select("nutrient_id,is_overridden,nutrients(key)")
      .eq("user_id", userId),
  ]);
  const personalKeys = new Set(
    (existing ?? []).flatMap((item) => {
      const nutrient = item.nutrients as unknown as { key: string } | null;
      return item.is_overridden &&
        nutrient &&
        !["energy_kcal", "protein"].includes(nutrient.key)
        ? [nutrient.key]
        : [];
    }),
  );
  const rows = targets
    .filter((target) => !personalKeys.has(target.key))
    .map((target) => ({
      user_id: userId,
      nutrient_id: nutrients?.find((item) => item.key === target.key)?.id,
      unit_id: units?.find((item) => item.symbol === target.unit)?.id,
      methodology_id: methods?.find((item) => item.key === target.methodology)
        ?.id,
      target_amount: target.amount,
      minimum_amount: target.minimum ?? null,
      maximum_amount: target.maximum ?? null,
      target_type: target.targetType,
      calculation_version: "targets-v4",
      is_overridden: target.overridden,
      effective_at: new Date().toISOString(),
    }));
  if (
    rows.some((row) => !row.nutrient_id || !row.unit_id || !row.methodology_id)
  )
    throw new Error("Target reference data is incomplete");
  const { error } = await supabase
    .from("user_nutrient_targets")
    .upsert(rows, { onConflict: "user_id,nutrient_id" });
  if (error) throw new Error("Unable to recalculate nutrition targets");
}
