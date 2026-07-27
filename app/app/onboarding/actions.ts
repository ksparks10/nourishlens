"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
import { onboardingSchema } from "@/lib/validation/onboarding";
import {
  ageOnDate,
  calculateTargets,
  type CalculatedTarget,
} from "@/lib/nutrition/targets";
export async function completeOnboarding(data: FormData) {
  const parsed = onboardingSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/app/onboarding?error=Review+the+highlighted+profile+values");
  const { supabase, user } = await requireUser();
  const input = parsed.data;
  const age = ageOnDate(input.birth_date);
  if (age < 13 || age > 120)
    redirect("/app/onboarding?error=Enter+a+valid+birth+date");
  const omega: CalculatedTarget = {
    key: "omega_3",
    amount: input.biological_sex === "female" ? 1100 : 1600,
    minimum: input.biological_sex === "female" ? 1100 : 1600,
    unit: "mg",
    targetType: "minimum",
    methodology: "us_daily_value",
    overridden: false,
  };
  const targets = [
    ...calculateTargets({
      age,
      heightCm: input.height_cm,
      weightKg: input.weight_kg,
      biologicalSex: input.biological_sex,
      activityLevel: input.activity_level,
      goal: input.primary_goal,
      customCalories: input.custom_calorie_target,
      customProtein: input.custom_protein_target,
    }),
    omega,
  ];
  const { error: profileError } = await supabase
    .from("nutrition_profiles")
    .upsert({
      user_id: user.id,
      ...input,
      pregnancy_status: "not_applicable",
      calculation_version: "targets-v2",
    });
  if (profileError) redirect("/app/onboarding?error=Unable+to+save+profile");
  const [{ data: nutrients }, { data: methods }, { data: units }] =
    await Promise.all([
      supabase
        .from("nutrients")
        .select("id,key")
        .in(
          "key",
          targets.map((target) => target.key),
        ),
      supabase.from("target_methodologies").select("id,key"),
      supabase.from("nutrient_units").select("id,symbol"),
    ]);
  const rows = targets.map((target) => ({
    user_id: user.id,
    nutrient_id: nutrients?.find((n) => n.key === target.key)?.id,
    unit_id: units?.find((unit) => unit.symbol === target.unit)?.id,
    methodology_id: methods?.find((method) => method.key === target.methodology)
      ?.id,
    target_amount: target.amount,
    minimum_amount: target.minimum ?? null,
    maximum_amount: target.maximum ?? null,
    target_type: target.targetType,
    calculation_version: "targets-v2",
    is_overridden: target.overridden,
  }));
  if (
    rows.some((row) => !row.nutrient_id || !row.unit_id || !row.methodology_id)
  )
    redirect("/app/onboarding?error=Target+reference+data+is+missing");
  const { error: targetError } = await supabase
    .from("user_nutrient_targets")
    .upsert(rows, { onConflict: "user_id,nutrient_id" });
  if (targetError) redirect("/app/onboarding?error=Unable+to+save+targets");
  await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);
  redirect("/app?message=Profile+and+targets+created");
}
