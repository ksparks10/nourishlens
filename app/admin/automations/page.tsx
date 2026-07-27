import { requirePermission } from "@/lib/auth/authorization";
import { testAutomation, updateAutomation } from "./actions";
export default async function Automations({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("automations.manage");
  const { data } = await supabase
    .from("automation_definitions")
    .select(
      "id,key,name,trigger_type,action_type,is_active,last_run_at,last_success_at,last_failure_at,execution_count",
    )
    .order("name");
  return (
    <>
      <p className="eyebrow">WORKFLOWS</p>
      <h1>Automations</h1>
      <p className="muted">
        No email or external action is sent by the local test runner; tests only
        record an execution.
      </p>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p>{q.message}</p>}
      {data?.map((item) => (
        <section className="card" key={item.id}>
          <h2>{item.name}</h2>
          <p>
            {item.trigger_type} → {item.action_type} · {item.execution_count}{" "}
            runs
          </p>
          <div className="actions">
            <form action={updateAutomation}>
              <input type="hidden" name="id" value={item.id} />
              <label>
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={item.is_active}
                />{" "}
                Active
              </label>
              <button>Save</button>
            </form>
            <form action={testAutomation}>
              <input type="hidden" name="id" value={item.id} />
              <button>Test safely</button>
            </form>
          </div>
        </section>
      ))}
    </>
  );
}
