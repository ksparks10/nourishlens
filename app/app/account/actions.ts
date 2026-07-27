"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
export async function deleteAccount(data: FormData) {
  if (data.get("confirmation") !== "DELETE")
    redirect("/app/account?error=Type+DELETE+to+confirm");
  const { user } = await requireUser();
  const admin = createAdminClient();
  await admin
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: "account.delete",
      target_type: "user",
      target_id: user.id,
      reason: "User requested immediate account deletion",
    });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) redirect("/app/account?error=Unable+to+delete+account");
  redirect("/?message=Account+deleted");
}
