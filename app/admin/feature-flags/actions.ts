"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
export async function updateFlag(data: FormData) {
  const parsed = z
    .object({ id: z.string().uuid(), enabled: z.string().optional() })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/feature-flags?error=Invalid+flag");
  const { supabase, user } = await requirePermission("feature_flags.manage");
  const { error } = await supabase
    .from("feature_flags")
    .update({ is_enabled: parsed.data.enabled === "on", updated_by: user.id })
    .eq("id", parsed.data.id);
  if (error) redirect("/admin/feature-flags?error=Unable+to+update+flag");
  redirect("/admin/feature-flags?message=Flag+updated");
}
