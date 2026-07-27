"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
export async function reviewProjection(data: FormData) {
  const parsed = z
    .object({
      projection_id: z.string().uuid(),
      decision: z.enum(["approved", "rejected", "invalidated", "recalculate"]),
      reason: z.string().trim().min(10).max(1000),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/admin/projections?error=A+meaningful+review+reason+is+required");
  const { supabase } = await requirePermission("projections.manage");
  const { error } =
    parsed.data.decision === "recalculate"
      ? await supabase.rpc("request_projection_recalculation", {
          p_projection_id: parsed.data.projection_id,
          p_reason: parsed.data.reason,
        })
      : await supabase.rpc("review_projection", {
          p_projection_id: parsed.data.projection_id,
          p_decision: parsed.data.decision,
          p_reason: parsed.data.reason,
        });
  if (error) redirect("/admin/projections?error=Projection+review+failed");
  revalidatePath("/admin/projections");
  redirect("/admin/projections?message=Projection+reviewed");
}
export async function updateThresholds(data: FormData) {
  const parsed = z
    .object({
      high: z.coerce.number().min(0).max(1),
      moderate: z.coerce.number().min(0).max(1),
      low: z.coerce.number().min(0).max(1),
      minimum: z.coerce.number().min(0).max(1),
      experimental: z.string().optional(),
    })
    .safeParse(Object.fromEntries(data));
  if (
    !parsed.success ||
    !(
      parsed.data.high > parsed.data.moderate &&
      parsed.data.moderate > parsed.data.low
    )
  )
    redirect(
      "/admin/projections?error=Thresholds+must+descend+from+high+to+low",
    );
  const { supabase, user } = await requirePermission("projections.manage");
  const { error } = await supabase
    .from("projection_settings")
    .update({
      high_threshold: parsed.data.high,
      moderate_threshold: parsed.data.moderate,
      low_threshold: parsed.data.low,
      minimum_included_threshold: parsed.data.minimum,
      experimental_enabled: parsed.data.experimental === "on",
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) redirect("/admin/projections?error=Unable+to+save+thresholds");
  redirect("/admin/projections?message=Thresholds+updated");
}
export async function processRecalculation(data: FormData) {
  const id = z.string().uuid().safeParse(data.get("request_id"));
  if (!id.success)
    redirect("/admin/projections/recalculations?error=Invalid+request");
  const { supabase } = await requirePermission("projections.manage");
  const { error } = await supabase.rpc("process_projection_recalculation", {
    p_request_id: id.data,
  });
  if (error)
    redirect("/admin/projections/recalculations?error=Recalculation+failed");
  redirect(
    "/admin/projections/recalculations?message=Projection+recalculated+and+returned+to+review",
  );
}
