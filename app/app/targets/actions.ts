"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
import { ageOnDate, calculateTargets } from "@/lib/nutrition/targets";

export async function savePersonalTarget(data: FormData) {
  const parsed = z
    .object({
      target_id: z.string().uuid(),
      amount: z.coerce.number().positive().max(10000000),
      direction: z.enum(["minimum", "maximum"]),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/app/profile?error=Enter+a+valid+goal#targets");
  const { supabase } = await requireUser();
  const { data: method } = await supabase
    .from("target_methodologies")
    .select("id")
    .eq("key", "personal_tracking_goal")
    .single();
  const { error } = await supabase
    .from("user_nutrient_targets")
    .update({
      target_amount: parsed.data.amount,
      minimum_amount:
        parsed.data.direction === "minimum" ? parsed.data.amount : null,
      maximum_amount:
        parsed.data.direction === "maximum" ? parsed.data.amount : null,
      target_type: parsed.data.direction,
      methodology_id: method?.id,
      calculation_version: "personal-v1",
      is_overridden: true,
      effective_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.target_id);
  if (error)
    redirect("/app/profile?error=Unable+to+save+personal+goal#targets");
  revalidatePath("/app");
  revalidatePath("/app/targets");
  revalidatePath("/app/profile");
  redirect("/app/profile?message=Personal+goal+saved#targets");
}

export async function resetTarget(data: FormData) {
  const targetId = z.string().uuid().safeParse(data.get("target_id"));
  if (!targetId.success) redirect("/app/profile?error=Invalid+target#targets");
  const { supabase, user } = await requireUser();
  const [{ data: target }, { data: profile }, { data: methods }] =
    await Promise.all([
      supabase
        .from("user_nutrient_targets")
        .select("id,nutrients(key)")
        .eq("id", targetId.data)
        .single(),
      supabase
        .from("nutrition_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single(),
      supabase.from("target_methodologies").select("id,key"),
    ]);
  if (!target || !profile)
    redirect("/app/profile?error=Target+not+found#targets");
  const key = (target.nutrients as unknown as { key: string }).key;
  const recommended = calculateTargets({
    age: ageOnDate(profile.birth_date),
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    biologicalSex: profile.biological_sex,
    activityLevel: profile.activity_level,
    goal: profile.primary_goal,
    customCalories: profile.custom_calorie_target,
    customProtein: profile.custom_protein_target,
  }).find((item) => item.key === key);
  const methodology = methods?.find(
    (item) => item.key === (recommended?.methodology ?? "informational_only"),
  );
  const { error } = await supabase
    .from("user_nutrient_targets")
    .update({
      target_amount: recommended?.amount ?? null,
      minimum_amount: recommended?.minimum ?? null,
      maximum_amount: recommended?.maximum ?? null,
      target_type: recommended?.targetType ?? "informational",
      methodology_id: methodology?.id,
      calculation_version: "targets-v3",
      is_overridden: false,
      effective_at: new Date().toISOString(),
    })
    .eq("id", targetId.data);
  if (error) redirect("/app/profile?error=Unable+to+reset+goal#targets");
  revalidatePath("/app");
  revalidatePath("/app/targets");
  revalidatePath("/app/profile");
  redirect("/app/profile?message=Default+restored#targets");
}
