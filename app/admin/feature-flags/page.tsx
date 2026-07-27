import { requirePermission } from "@/lib/auth/authorization";
import { updateFlag } from "./actions";
export default async function Flags({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("feature_flags.manage");
  const { data } = await supabase
    .from("feature_flags")
    .select("id,key,description,is_enabled")
    .order("key");
  return (
    <>
      <p className="eyebrow">RELEASE CONTROL</p>
      <h1>Feature flags</h1>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p>{q.message}</p>}
      {data?.map((flag) => (
        <form className="card entry" action={updateFlag} key={flag.id}>
          <input type="hidden" name="id" value={flag.id} />
          <div>
            <strong>{flag.key}</strong>
            <p>{flag.description}</p>
          </div>
          <label>
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={flag.is_enabled}
            />{" "}
            Enabled
          </label>
          <button>Save</button>
        </form>
      ))}
    </>
  );
}
