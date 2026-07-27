import { requirePermission } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
export default async function AuditLogs({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const q = await searchParams;
  await requirePermission("audit.manage");
  const admin = createAdminClient();
  let query = admin
    .from("audit_logs")
    .select(
      "id,actor_id,action,target_type,target_id,reason,metadata,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (q.action) query = query.ilike("action", `%${q.action}%`);
  const { data } = await query;
  return (
    <>
      <p className="eyebrow">ACCOUNTABILITY</p>
      <h1>Audit logs</h1>
      <form className="date-selector">
        <label>
          Action filter
          <input name="action" defaultValue={q.action} />
        </label>
        <button>Filter</button>
      </form>
      <div className="progress-list">
        {data?.map((log) => (
          <section className="card" key={log.id}>
            <strong>{log.action}</strong>
            <p>
              {log.target_type}: {log.target_id}
            </p>
            <p>{log.reason}</p>
            <small>
              {new Date(log.created_at).toLocaleString()} · Actor{" "}
              {log.actor_id ?? "system"}
            </small>
          </section>
        ))}
      </div>
    </>
  );
}
