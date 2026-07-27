"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
import { getCachedExternalFood } from "@/lib/nutrition/search";
import { providerFor } from "@/providers/nutrition/registry";
import type { ProviderKey } from "@/providers/nutrition";
import { revalidatePath } from "next/cache";
import { diaryEntrySchema } from "@/lib/validation/diary";
export async function toggleFavorite(data: FormData) {
  const id = z.string().uuid().safeParse(data.get("food_id"));
  if (!id.success) return;
  const { supabase, user } = await requireUser(),
    { data: existing } = await supabase
      .from("favorite_foods")
      .select("food_id")
      .eq("user_id", user.id)
      .eq("food_id", id.data)
      .maybeSingle();
  if (existing)
    await supabase
      .from("favorite_foods")
      .delete()
      .eq("user_id", user.id)
      .eq("food_id", id.data);
  else
    await supabase
      .from("favorite_foods")
      .insert({ user_id: user.id, food_id: id.data });
  revalidatePath(`/app/foods/internal/${id.data}`);
}
const schema = z.object({
  provider: z.enum(["usda_fdc", "nih_dsld", "health_canada_cnf"]),
  provider_id: z.string().min(1).max(200),
});
export async function importExternalFood(data: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/app/add-food?error=Invalid+catalog+food");
  const { supabase, user } = await requireUser(),
    { data: limits } = await supabase.rpc("consume_rate_limit", {
      p_scope: "food_import",
      p_subject: user.id,
      p_limit: 10,
      p_window_seconds: 60,
    });
  if (limits?.[0] && !limits[0].allowed)
    redirect("/app/add-food?error=Please+wait+before+importing+more+foods");
  let food = await getCachedExternalFood(
    parsed.data.provider,
    parsed.data.provider_id,
  );
  if (
    !food ||
    (parsed.data.provider === "nih_dsld" && food.nutrients.length === 0)
  )
    food =
      (await providerFor(parsed.data.provider as ProviderKey)?.getFoodById(
        parsed.data.provider_id,
      )) ?? null;
  if (!food) redirect("/app/add-food?error=Catalog+food+is+unavailable");
  const { data: foodId, error } = await supabase.rpc("import_normalized_food", {
    p_payload: food,
  });
  if (error || !foodId) redirect("/app/add-food?error=Unable+to+import+food");
  redirect(
    `/app/foods/internal/${foodId}?message=${encodeURIComponent("Food imported. Choose an amount and meal below to log it and update your dashboard.")}#add-to-diary`,
  );
}

const importAndLogSchema = schema.extend({
  grams: diaryEntrySchema.shape.grams,
  meal_type: diaryEntrySchema.shape.meal_type,
  date: diaryEntrySchema.shape.date,
  time: diaryEntrySchema.shape.time,
  notes: diaryEntrySchema.shape.notes,
});

export async function importAndLogExternalFood(data: FormData) {
  const parsed = importAndLogSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/app/add-food?error=Invalid+food+entry");
  const { supabase, user } = await requireUser();
  const { data: limits } = await supabase.rpc("consume_rate_limit", {
    p_scope: "food_import",
    p_subject: user.id,
    p_limit: 10,
    p_window_seconds: 60,
  });
  if (limits?.[0] && !limits[0].allowed)
    redirect("/app/add-food?error=Please+wait+before+importing+more+foods");
  let food = await getCachedExternalFood(
    parsed.data.provider,
    parsed.data.provider_id,
  );
  if (
    !food ||
    (parsed.data.provider === "nih_dsld" && food.nutrients.length === 0)
  )
    food =
      (await providerFor(parsed.data.provider as ProviderKey)?.getFoodById(
        parsed.data.provider_id,
      )) ?? null;
  if (!food) redirect("/app/add-food?error=Catalog+food+is+unavailable");
  const { data: foodId, error: importError } = await supabase.rpc(
    "import_normalized_food",
    { p_payload: food },
  );
  if (importError || !foodId)
    redirect("/app/add-food?error=Unable+to+import+food");
  const { error: logError } = await supabase.rpc(
    "log_food_entry_with_overrides",
    {
      p_food_id: foodId,
      p_grams: parsed.data.grams,
      p_meal_type: parsed.data.meal_type,
      p_date: parsed.data.date,
      p_time: parsed.data.time,
      p_notes: parsed.data.notes ?? null,
      p_overrides: {},
    },
  );
  if (logError)
    redirect(
      `/app/foods/internal/${foodId}?message=${encodeURIComponent("Food imported, but logging failed. Please use the Add to food log form below.")}#add-to-diary`,
    );
  revalidatePath("/app");
  revalidatePath("/app/diary");
  redirect(
    `/app?date=${parsed.data.date}&message=Food+logged+and+dashboard+updated`,
  );
}
