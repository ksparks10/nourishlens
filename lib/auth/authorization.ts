import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended_at")
    .eq("id", user.id)
    .single();
  if (profile?.suspended_at) {
    await supabase.auth.signOut();
    redirect("/login?error=Account+suspended");
  }
  return { supabase, user };
}

export async function requirePermission(permission: string) {
  const context = await requireUser();
  const { data, error } = await context.supabase.rpc("has_permission", {
    requested_permission: permission,
  });
  if (error || !data) redirect("/app");
  return context;
}
