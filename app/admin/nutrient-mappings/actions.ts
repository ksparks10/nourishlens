"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
export async function saveMapping(data: FormData) {
  const parsed = z
    .object({
      provider_key: z.enum(["usda_fdc", "open_food_facts"]),
      provider_nutrient_code: z.string().trim().min(1).max(100),
      nutrient_id: z.string().uuid(),
      source_unit: z.string().trim().max(20),
      conversion_factor: z.coerce.number().positive().max(1000000),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/admin/nutrient-mappings?error=Invalid+mapping");
  const { supabase, user } = await requirePermission("nutrients.manage");
  const { error } = await supabase
    .from("provider_nutrient_mappings")
    .upsert(
      { ...parsed.data, created_by: user.id },
      { onConflict: "provider_key,provider_nutrient_code" },
    );
  if (error) redirect("/admin/nutrient-mappings?error=Unable+to+save+mapping");
  redirect("/admin/nutrient-mappings?message=Mapping+saved");
}
