"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
export async function saveContent(data: FormData) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      title: z.string().trim().min(2).max(200),
      body: z.string().trim().min(10).max(20000),
      published: z.string().optional(),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/content?error=Invalid+content");
  const { supabase, user } = await requirePermission("content.manage");
  const { error } = await supabase
    .from("content_blocks")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      is_published: parsed.data.published === "on",
      updated_by: user.id,
    })
    .eq("id", parsed.data.id);
  if (error) redirect("/admin/content?error=Unable+to+save+content");
  redirect("/admin/content?message=Content+saved");
}
