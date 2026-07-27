"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
export async function reviewSubmission(data: FormData) {
  const parsed = z
    .object({
      submission_id: z.string().uuid(),
      food_id: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      reason: z.string().trim().min(10).max(1000),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/admin/foods?error=Valid+decision+reason+required");
  const { user } = await requirePermission("food.manage");
  const admin = createAdminClient();
  if (parsed.data.decision === "approved")
    await admin
      .from("foods")
      .update({ is_public: true, is_verified: true })
      .eq("id", parsed.data.food_id);
  await admin
    .from("custom_food_submissions")
    .update({
      status: parsed.data.decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reason: parsed.data.reason,
    })
    .eq("id", parsed.data.submission_id);
  await admin
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: `food_submission.${parsed.data.decision}`,
      target_type: "food",
      target_id: parsed.data.food_id,
      reason: parsed.data.reason,
    });
  redirect("/admin/foods?message=Submission+reviewed");
}
export async function resolveReport(data: FormData) {
  const parsed = z
    .object({
      report_id: z.string().uuid(),
      status: z.enum(["resolved", "rejected"]),
      reason: z.string().trim().min(10).max(1000),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/admin/foods?error=Resolution+reason+required");
  const { user } = await requirePermission("food.manage");
  const admin = createAdminClient();
  await admin
    .from("food_reports")
    .update({
      status: parsed.data.status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      resolution_notes: parsed.data.reason,
    })
    .eq("id", parsed.data.report_id);
  await admin
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: `food_report.${parsed.data.status}`,
      target_type: "food_report",
      target_id: parsed.data.report_id,
      reason: parsed.data.reason,
    });
  redirect("/admin/foods?message=Report+resolved");
}
