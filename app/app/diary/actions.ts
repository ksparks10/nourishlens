"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
import { diaryEntrySchema } from "@/lib/validation/diary";
export async function logFood(data: FormData) {
  const parsed = diaryEntrySchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect(`/app/diary?error=Invalid+food+entry`);
  let overrides: Record<string, string> = {};
  try {
    const raw = JSON.parse(
      String(data.get("nutrient_overrides") ?? "{}"),
    ) as unknown;
    if (raw && typeof raw === "object" && !Array.isArray(raw))
      overrides = raw as Record<string, string>;
  } catch {
    redirect(`/app/diary?error=Invalid+nutrient+corrections`);
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("log_food_entry_with_overrides", {
    p_food_id: parsed.data.food_id,
    p_grams: parsed.data.grams,
    p_meal_type: parsed.data.meal_type,
    p_date: parsed.data.date,
    p_time: parsed.data.time,
    p_notes: parsed.data.notes ?? null,
    p_overrides: overrides,
  });
  if (error)
    redirect(`/app/diary?date=${parsed.data.date}&error=Unable+to+log+food`);
  revalidatePath("/app");
  revalidatePath("/app/diary");
  redirect(
    `/app?date=${parsed.data.date}&message=Food+logged+and+dashboard+updated`,
  );
}
export async function updateEntryNutrients(data: FormData) {
  const parsed = z
    .object({ entry_id: z.string().uuid(), date: z.string().date() })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/app/diary?error=Invalid+nutrient+update");
  const overrides = Object.fromEntries(
    [...data.entries()]
      .filter(
        ([key, value]) =>
          key.startsWith("nutrient__") && String(value).trim() !== "",
      )
      .map(([key, value]) => [key.slice(10), String(value)]),
  );
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("apply_entry_nutrient_overrides", {
    p_entry_id: parsed.data.entry_id,
    p_overrides: overrides,
  });
  if (error)
    redirect(
      `/app/diary?date=${parsed.data.date}&error=Unable+to+update+nutrients`,
    );
  revalidatePath("/app");
  revalidatePath("/app/diary");
  redirect(`/app/diary?date=${parsed.data.date}&message=Nutrients+updated`);
}
export async function deleteEntry(data: FormData) {
  const id = z.string().uuid().safeParse(data.get("entry_id"));
  const date = z.string().date().safeParse(data.get("date"));
  if (!id.success || !date.success) redirect("/app/diary?error=Invalid+entry");
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("meal_entries")
    .delete()
    .eq("id", id.data);
  if (error)
    redirect(`/app/diary?date=${date.data}&error=Unable+to+delete+entry`);
  revalidatePath("/app");
  revalidatePath("/app/diary");
  redirect(`/app/diary?date=${date.data}&message=Entry+deleted`);
}
export async function updateEntry(data: FormData) {
  const parsed = z
    .object({
      entry_id: z.string().uuid(),
      date: z.string().date(),
      grams: z.coerce.number().positive().max(10000),
      meal_type: diaryEntrySchema.shape.meal_type,
      notes: z.string().max(500).optional(),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/app/diary?error=Invalid+entry+update");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("update_food_entry", {
    p_entry_id: parsed.data.entry_id,
    p_grams: parsed.data.grams,
    p_meal_type: parsed.data.meal_type,
    p_notes: parsed.data.notes ?? null,
  });
  if (error)
    redirect(
      `/app/diary?date=${parsed.data.date}&error=Unable+to+update+entry`,
    );
  revalidatePath("/app");
  revalidatePath("/app/diary");
  redirect(`/app/diary?date=${parsed.data.date}&message=Entry+updated`);
}
export async function duplicateEntry(data: FormData) {
  const parsed = z
    .object({ entry_id: z.string().uuid(), date: z.string().date() })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/app/diary?error=Invalid+entry");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("duplicate_food_entry", {
    p_entry_id: parsed.data.entry_id,
  });
  if (error)
    redirect(
      `/app/diary?date=${parsed.data.date}&error=Unable+to+duplicate+entry`,
    );
  revalidatePath("/app");
  revalidatePath("/app/diary");
  redirect(`/app/diary?date=${parsed.data.date}&message=Entry+duplicated`);
}
export async function saveMeal(data: FormData) {
  const parsed = z
    .object({
      meal_id: z.string().uuid(),
      date: z.string().date(),
      name: z.string().trim().min(2).max(100),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/app/diary?error=Enter+a+saved+meal+name");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("save_diary_meal", {
    p_meal_id: parsed.data.meal_id,
    p_name: parsed.data.name,
  });
  if (error)
    redirect(`/app/diary?date=${parsed.data.date}&error=Unable+to+save+meal`);
  redirect(`/app/diary?date=${parsed.data.date}&message=Meal+saved`);
}
