"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
export async function saveRecentMeal(data: FormData) {
  const parsed = z
    .object({
      meal_id: z.string().uuid(),
      name: z.string().trim().min(2).max(100),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/app/saved-meals?error=Enter+a+name");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("save_diary_meal", {
    p_meal_id: parsed.data.meal_id,
    p_name: parsed.data.name,
  });
  if (error) redirect("/app/saved-meals?error=Unable+to+save+meal");
  redirect("/app/saved-meals?message=Meal+saved");
}
export async function logSavedMeal(data: FormData) {
  const parsed = z
    .object({
      saved_meal_id: z.string().uuid(),
      date: z.string().date(),
      meal_type: z.enum([
        "breakfast",
        "morning_snack",
        "lunch",
        "afternoon_snack",
        "dinner",
        "evening_snack",
      ]),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/app/saved-meals?error=Invalid+date+or+meal");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("log_saved_meal", {
    p_saved_meal_id: parsed.data.saved_meal_id,
    p_date: parsed.data.date,
    p_meal_type: parsed.data.meal_type,
  });
  if (error) redirect("/app/saved-meals?error=Unable+to+log+saved+meal");
  redirect(`/app/diary?date=${parsed.data.date}&message=Saved+meal+logged`);
}
