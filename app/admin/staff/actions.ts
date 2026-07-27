"use server";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { staffInvitation, ownershipTransfer } from "@/lib/validation/auth";

export async function inviteStaff(data: FormData) {
  const parsed = staffInvitation.safeParse({
    email: data.get("email"),
    roleId: data.get("roleId"),
  });
  if (!parsed.success) redirect("/admin/staff?error=Invalid+invitation");
  const { supabase, user } = await requirePermission("staff.manage");
  const { data: role } = await supabase
    .from("roles")
    .select("key")
    .eq("id", parsed.data.roleId)
    .single();
  if (!role || role.key === "owner")
    redirect("/admin/staff?error=Owner+cannot+be+assigned+by+invitation");
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();
  const { data: invitation, error } = await admin
    .from("staff_invitations")
    .insert({
      email: parsed.data.email,
      role_id: parsed.data.roleId,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !invitation)
    redirect("/admin/staff?error=An+active+invitation+already+exists");
  const next = `/accept-invitation?token=${encodeURIComponent(token)}`;
  const { error: mailError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  );
  if (mailError) {
    await admin
      .from("staff_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", invitation.id);
    redirect("/admin/staff?error=Invitation+email+could+not+be+sent");
  }
  await admin
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: "staff_invitation.create",
      target_type: "staff_invitation",
      target_id: invitation.id,
      reason: "Staff invitation created",
      metadata: { email: parsed.data.email, role: role.key },
    });
  redirect("/admin/staff?message=Invitation+sent");
}

export async function transferOwnership(data: FormData) {
  const parsed = ownershipTransfer.safeParse({
    userId: data.get("userId"),
    reason: data.get("reason"),
  });
  if (!parsed.success)
    redirect("/admin/staff?error=Enter+a+valid+user+ID+and+meaningful+reason");
  const { supabase } = await requirePermission("permissions.manage");
  const { error } = await supabase.rpc("transfer_ownership", {
    new_owner_id: parsed.data.userId,
    transfer_reason: parsed.data.reason,
  });
  if (error) redirect("/admin/staff?error=Ownership+transfer+failed");
  redirect("/app?message=Ownership+transferred");
}
