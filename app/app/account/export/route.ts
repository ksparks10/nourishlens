import { requireUser } from "@/lib/auth/authorization";
export async function GET() {
  const { supabase, user } = await requireUser();
  const [
    profile,
    nutritionProfile,
    targets,
    diary,
    roles,
    permissions,
    deletionRequests,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("nutrition_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_nutrient_targets")
      .select(
        "*,nutrients(key,name),nutrient_units(symbol),target_methodologies(key,name,source_name,source_version)",
      ),
    supabase
      .from("diary_days")
      .select(
        "*,meals(*,meal_types(key,name),meal_entries(*,meal_entry_nutrient_snapshots(*,nutrients(key,name),nutrient_units(symbol))))",
      )
      .order("diary_date"),
    supabase
      .from("user_roles")
      .select("assigned_at,roles(key,name)")
      .eq("user_id", user.id),
    supabase
      .from("user_permissions")
      .select("granted,assigned_at,permissions(key,description)")
      .eq("user_id", user.id),
    supabase
      .from("account_deletion_requests")
      .select("status,requested_at,completed_at")
      .eq("user_id", user.id),
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, createdAt: user.created_at },
    profile: profile.data,
    nutritionProfile: nutritionProfile.data,
    targets: targets.data ?? [],
    diary: diary.data ?? [],
    roles: roles.data ?? [],
    permissionOverrides: permissions.data ?? [],
    deletionRequests: deletionRequests.data ?? [],
  };
  return Response.json(body, {
    headers: {
      "Content-Disposition": `attachment; filename="nourish-lens-${user.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
