"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
import { recalculateUserTargets } from "@/lib/nutrition/recalculate-targets";
import { poundsToKilograms } from "@/lib/measurements";

export async function saveWeight(data: FormData) {
  const parsed = z
    .object({
      logged_date: z.string().date(),
      weight_value: z.coerce.number().positive().max(1500),
      measurement_system: z.enum(["metric", "us"]),
      notes: z.string().trim().max(500),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/app/profile?error=Invalid+weight+entry#measurements");
  const { supabase, user } = await requireUser();
  const weightKg =
    parsed.data.measurement_system === "us"
      ? poundsToKilograms(parsed.data.weight_value)
      : parsed.data.weight_value;
  if (weightKg < 25 || weightKg > 500)
    redirect("/app/profile?error=Invalid+weight+entry#measurements");
  const { error } = await supabase.from("weight_logs").upsert(
    {
      user_id: user.id,
      logged_date: parsed.data.logged_date,
      weight_kg: weightKg,
      notes: parsed.data.notes,
    },
    { onConflict: "user_id,logged_date" },
  );
  if (error) redirect("/app/profile?error=Unable+to+save+weight#measurements");
  const { data: nutrition } = await supabase
    .from("nutrition_profiles")
    .update({ weight_kg: weightKg })
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (nutrition) {
    try {
      await recalculateUserTargets(supabase, user.id, nutrition);
    } catch {
      redirect(
        "/app/profile?error=Weight+saved+but+targets+could+not+be+updated#measurements",
      );
    }
  }
  revalidatePath("/app");
  revalidatePath("/app/profile");
  redirect("/app/profile?message=Weight+and+targets+updated#measurements");
}
