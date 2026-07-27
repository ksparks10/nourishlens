import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { addNote, authorizePrivateAccess, revokeGrant } from "../actions";
export default async function UserDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ access?: string; message?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const { user } = await requirePermission("users.manage");
  const admin = createAdminClient();
  const [
    { data: authUser },
    { data: profile },
    { data: notes },
    { data: grants },
  ] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from("profiles").select("*").eq("id", id).single(),
    admin
      .from("admin_user_notes")
      .select("id,note,created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("access_grants")
      .select("id,grant_type,expires_at,revoked_at,reason")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!authUser?.user) notFound();
  let privateData: null | { nutritionProfile: unknown; diary: unknown } = null;
  if (q.access) {
    const { data: access } = await admin
      .from("admin_access_logs")
      .select("id")
      .eq("id", q.access)
      .eq("actor_id", user.id)
      .eq("target_user_id", id)
      .maybeSingle();
    if (access) {
      const [nutrition, diary] = await Promise.all([
        admin
          .from("nutrition_profiles")
          .select("*")
          .eq("user_id", id)
          .maybeSingle(),
        admin
          .from("diary_days")
          .select(
            "diary_date,meals(meal_types(name),meal_entries(food_name_snapshot,gram_weight))",
          )
          .eq("user_id", id)
          .order("diary_date", { ascending: false })
          .limit(7),
      ]);
      privateData = { nutritionProfile: nutrition.data, diary: diary.data };
    }
  }
  return (
    <>
      <p className="eyebrow">USER RECORD</p>
      <h1>{authUser.user.email}</h1>
      {q.message && <p role="status">{q.message}</p>}
      <section className="card">
        <p>ID: {id}</p>
        <p>Created: {new Date(authUser.user.created_at).toLocaleString()}</p>
        <p>Status: {profile?.suspended_at ? "Suspended" : "Active"}</p>
      </section>
      <section className="card">
        <h2>Internal notes</h2>
        <form className="form" action={addNote}>
          <input type="hidden" name="user_id" value={id} />
          <textarea name="note" required />
          <button>Add note</button>
        </form>
        {notes?.map((note) => (
          <p key={note.id}>
            {note.note}{" "}
            <small>{new Date(note.created_at).toLocaleString()}</small>
          </p>
        ))}
      </section>
      <section className="card">
        <h2>Access grants</h2>
        {grants?.map((grant) => (
          <div className="entry" key={grant.id}>
            <span>
              {grant.grant_type} ·{" "}
              {grant.revoked_at
                ? "Revoked"
                : grant.expires_at
                  ? `Expires ${grant.expires_at}`
                  : "Permanent"}
            </span>
            {!grant.revoked_at && (
              <form action={revokeGrant}>
                <input type="hidden" name="grant_id" value={grant.id} />
                <input type="hidden" name="user_id" value={id} />
                <input
                  name="reason"
                  placeholder="Revocation reason"
                  minLength={10}
                  required
                />
                <button>Revoke</button>
              </form>
            )}
          </div>
        ))}
      </section>
      <section className="card">
        <h2>Private nutrition data</h2>
        {privateData ? (
          <pre>{JSON.stringify(privateData, null, 2)}</pre>
        ) : (
          <form className="form" action={authorizePrivateAccess}>
            <input type="hidden" name="user_id" value={id} />
            <label>
              Required access reason
              <input name="reason" minLength={10} required />
            </label>
            <button>Authorize and view</button>
          </form>
        )}
      </section>
    </>
  );
}
