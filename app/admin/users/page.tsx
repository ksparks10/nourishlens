import Link from "next/link";
import { requirePermission } from "@/lib/auth/authorization";
import { setSuspension } from "./actions";
type UserRow = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  suspended_at: string | null;
  onboarding_completed_at: string | null;
  has_premium: boolean;
};
export default async function Users({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("users.manage");
  const { data } = await supabase.rpc("admin_search_users", {
    search_text: q.q ?? "",
    result_limit: 50,
  });
  const users = (data ?? []) as UserRow[];
  return (
    <>
      <p className="eyebrow">CUSTOMER SUPPORT</p>
      <h1>Users</h1>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p role="status">{q.message}</p>}
      <form className="date-selector">
        <label>
          Search email
          <input name="q" defaultValue={q.q} />
        </label>
        <button>Search</button>
      </form>
      <div className="progress-list">
        {users.map((row) => (
          <section className="card" key={row.user_id}>
            <div className="page-heading">
              <div>
                <Link href={`/admin/users/${row.user_id}`}>
                  <strong>{row.email}</strong>
                </Link>
                <p>
                  Joined {new Date(row.created_at).toLocaleDateString()} ·{" "}
                  {row.has_premium ? "Premium" : "Free"} ·{" "}
                  {row.suspended_at ? "Suspended" : "Active"}
                </p>
              </div>
              <form className="inline-form" action={setSuspension}>
                <input type="hidden" name="user_id" value={row.user_id} />
                <input
                  type="hidden"
                  name="suspend"
                  value={row.suspended_at ? "false" : "true"}
                />
                <input
                  name="reason"
                  placeholder="Required reason"
                  minLength={10}
                  required
                />
                <button>{row.suspended_at ? "Reactivate" : "Suspend"}</button>
              </form>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
