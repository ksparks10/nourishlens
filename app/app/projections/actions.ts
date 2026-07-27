"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
export async function setProjectionDisplay(data: FormData) {
  const mode =
    data.get("mode") === "confirmed_only" ? "confirmed_only" : "eligible";
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ projection_display_mode: mode })
    .eq("id", user.id);
  if (error)
    redirect("/app/projections?error=Unable+to+save+display+preference");
  revalidatePath("/app");
  revalidatePath("/app/nutrients/[key]", "page");
  redirect("/app/projections?message=Display+preference+updated");
}
