import { requirePermission } from "@/lib/auth/authorization";
import { inviteStaff, transferOwnership } from "./actions";
export default async function Staff({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("staff.manage");
  const [{ data: roles }, { data: invitations }] = await Promise.all([
    supabase.from("roles").select("id,key,name").in("key", ["staff", "admin"]),
    supabase
      .from("staff_invitations")
      .select("id,email,expires_at,accepted_at,revoked_at,roles(name)")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);
  return (
    <>
      <h1>Staff access</h1>
      {q.error && (
        <p className="error" role="alert">
          {q.error}
        </p>
      )}
      {q.message && <p role="status">{q.message}</p>}
      <section className="card">
        <h2>Invite staff</h2>
        <form className="form" action={inviteStaff}>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Role
            <select name="roleId" required>
              {roles?.map((role) => (
                <option value={role.id} key={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button">Send invitation</button>
        </form>
      </section>
      <section className="card">
        <h2>Recent invitations</h2>
        {invitations?.length ? (
          <ul>
            {invitations.map((invite) => (
              <li key={invite.id}>
                {invite.email} —{" "}
                {invite.accepted_at
                  ? "Accepted"
                  : invite.revoked_at
                    ? "Revoked"
                    : "Pending"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No invitations yet.</p>
        )}
      </section>
      <section className="card">
        <h2>Transfer ownership</h2>
        <p>
          This atomic, audited action removes your owner role and assigns it to
          an existing user. It cannot be undone by another administrator.
        </p>
        <form className="form" action={transferOwnership}>
          <label>
            New owner user UUID
            <input name="userId" required />
          </label>
          <label>
            Reason
            <input name="reason" minLength={10} required />
          </label>
          <button className="button">Transfer ownership</button>
        </form>
      </section>
    </>
  );
}
