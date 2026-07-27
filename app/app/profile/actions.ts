"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
import { recalculateUserTargets } from "@/lib/nutrition/recalculate-targets";
import { feetInchesToCentimeters, poundsToKilograms } from "@/lib/measurements";

const profileSchema = z.object({
  display_name: z.string().trim().max(100),
  timezone: z.string().min(1).max(64),
});
const optionalNumber = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (value == null || value === "" ? null : value),
    z.coerce.number().min(minimum).max(maximum).nullable(),
  );
const nutritionSchema = z.object({
  birth_date: z.string().date(),
  height_feet: optionalNumber(1, 9),
  height_inches: z.preprocess(
    (value) => (value == null || value === "" ? null : value),
    z.coerce.number().min(0).max(11.9).nullable(),
  ),
  weight_value: z.coerce.number().positive().max(1500),
  biological_sex: z.enum(["female", "male", "unspecified"]),
  activity_level: z.enum([
    "sedentary",
    "light",
    "moderate",
    "very_active",
    "extra_active",
  ]),
  primary_goal: z.enum([
    "maintain",
    "lose",
    "gain",
    "build_muscle",
    "diet_quality",
    "micronutrients",
    "custom",
  ]),
  dietary_pattern: z.string().max(50),
  target_weight_value: optionalNumber(1, 1500),
  custom_calorie_target: optionalNumber(1000, 10000),
  custom_protein_target: optionalNumber(10, 1000),
});

export async function updateProfile(data: FormData) {
  const parsed = profileSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/app/profile?error=Invalid+profile#account-profile");
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);
  redirect(
    error
      ? "/app/profile?error=Unable+to+save#account-profile"
      : "/app/profile?message=Profile+saved#account-profile",
  );
}

export async function updateNutritionProfile(data: FormData) {
  const parsed = nutritionSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect(
      "/app/profile?error=Review+your+nutrition+profile#nutrition-profile",
    );
  const { supabase, user } = await requireUser();
  const input = parsed.data;
  const heightCm =
    input.height_feet === null || input.height_inches === null
      ? null
      : feetInchesToCentimeters(input.height_feet, input.height_inches);
  if (heightCm === null)
    redirect("/app/profile?error=Enter+your+complete+height#nutrition-profile");
  const values = {
    user_id: user.id,
    birth_date: input.birth_date,
    height_cm: heightCm,
    weight_kg: poundsToKilograms(input.weight_value),
    measurement_system: "us",
    biological_sex: input.biological_sex,
    activity_level: input.activity_level,
    primary_goal: input.primary_goal,
    dietary_pattern: input.dietary_pattern,
    target_weight_kg:
      input.target_weight_value === null
        ? null
        : poundsToKilograms(input.target_weight_value),
    custom_calorie_target: input.custom_calorie_target,
    custom_protein_target: input.custom_protein_target,
    pregnancy_status: "not_applicable",
    calculation_version: "targets-v3",
  };
  if (
    values.height_cm < 80 ||
    values.height_cm > 260 ||
    values.weight_kg < 25 ||
    values.weight_kg > 500 ||
    (values.target_weight_kg !== null &&
      (values.target_weight_kg < 25 || values.target_weight_kg > 500))
  )
    redirect(
      "/app/profile?error=Review+your+height+and+weight#nutrition-profile",
    );
  const { error } = await supabase.from("nutrition_profiles").upsert(values);
  if (error)
    redirect(
      "/app/profile?error=Unable+to+save+nutrition+profile#nutrition-profile",
    );
  try {
    await recalculateUserTargets(supabase, user.id, values);
  } catch {
    redirect(
      "/app/profile?error=Profile+saved+but+targets+could+not+be+updated#nutrition-profile",
    );
  }
  revalidatePath("/app");
  revalidatePath("/app/profile");
  redirect(
    "/app/profile?message=Nutrition+profile+and+targets+updated#nutrition-profile",
  );
}
