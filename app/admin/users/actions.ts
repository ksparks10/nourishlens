"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
export async function setSuspension(data: FormData) {
  const parsed = z
    .object({
      user_id: z.string().uuid(),
      suspend: z.enum(["true", "false"]),
      reason: z.string().trim().min(10).max(500),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/users?error=Valid+reason+required");
  const { supabase } = await requirePermission("users.manage");
  const { error } = await supabase.rpc("admin_set_user_suspension", {
    target_user: parsed.data.user_id,
    suspend: parsed.data.suspend === "true",
    action_reason: parsed.data.reason,
  });
  if (error) redirect("/admin/users?error=User+status+update+failed");
  redirect("/admin/users?message=User+status+updated");
}
export async function addNote(data: FormData) {
  const parsed = z
    .object({
      user_id: z.string().uuid(),
      note: z.string().trim().min(3).max(2000),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/users?error=Invalid+note");
  const { supabase, user } = await requirePermission("users.manage");
  const { error } = await supabase
    .from("admin_user_notes")
    .insert({
      user_id: parsed.data.user_id,
      author_id: user.id,
      note: parsed.data.note,
    });
  if (error) redirect("/admin/users?error=Unable+to+save+note");
  redirect(`/admin/users/${parsed.data.user_id}?message=Note+saved`);
}
export async function authorizePrivateAccess(data: FormData) {
  const parsed = z
    .object({
      user_id: z.string().uuid(),
      reason: z.string().trim().min(10).max(500),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    redirect("/admin/users?error=Meaningful+access+reason+required");
  const { supabase } = await requirePermission("nutrition.private.read");
  const { data: logId, error } = await supabase.rpc(
    "log_private_nutrition_access",
    { target_user: parsed.data.user_id, access_reason: parsed.data.reason },
  );
  if (error || !logId) redirect("/admin/users?error=Private+access+denied");
  redirect(`/admin/users/${parsed.data.user_id}?access=${logId}`);
}
export async function revokeGrant(data: FormData) {
  const parsed = z
    .object({
      grant_id: z.string().uuid(),
      user_id: z.string().uuid(),
      reason: z.string().trim().min(10).max(500),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/users?error=Reason+required");
  const { user } = await requirePermission("billing.manage");
  const admin = createAdminClient();
  await admin
    .from("access_grants")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.grant_id);
  await admin
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: "access.revoke",
      target_type: "access_grant",
      target_id: parsed.data.grant_id,
      reason: parsed.data.reason,
      metadata: { user_id: parsed.data.user_id },
    });
  redirect(`/admin/users/${parsed.data.user_id}?message=Access+revoked`);
}
