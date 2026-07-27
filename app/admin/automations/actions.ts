"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
export async function updateAutomation(data: FormData) {
  const parsed = z
    .object({ id: z.string().uuid(), active: z.string().optional() })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/automations?error=Invalid+automation");
  const { supabase } = await requirePermission("automations.manage");
  await supabase
    .from("automation_definitions")
    .update({ is_active: parsed.data.active === "on" })
    .eq("id", parsed.data.id);
  redirect("/admin/automations?message=Automation+updated");
}
export async function testAutomation(data: FormData) {
  const id = z.string().uuid().safeParse(data.get("id"));
  if (!id.success) redirect("/admin/automations?error=Invalid+automation");
  const { supabase } = await requirePermission("automations.manage");
  const { error } = await supabase.rpc("run_automation", {
    p_automation_id: id.data,
    p_payload: { manual_test: true },
  });
  if (error) redirect("/admin/automations?error=Test+failed");
  redirect("/admin/automations?message=Test+recorded");
}
