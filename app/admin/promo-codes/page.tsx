import { requirePermission } from "@/lib/auth/authorization";
import { createPromoCode, grantAccess, updatePromoCode } from "./actions";
type Code = {
  id: string;
  name: string;
  code_hint: string;
  is_active: boolean;
  access_duration_days: number | null;
  redemption_limit: number | null;
  redemption_count: number;
};
export default async function PromoCodes({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("promo_codes.manage");
  const { data } = await supabase
    .from("promo_codes")
    .select(
      "id,name,code_hint,is_active,access_duration_days,redemption_limit,redemption_count",
    )
    .order("created_at");
  const codes = (data ?? []) as Code[];
  return (
    <>
      <p className="eyebrow">ACCESS MANAGEMENT</p>
      <h1>Promo codes</h1>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p role="status">{q.message}</p>}
      <section className="card">
        <h2>Create code</h2>
        <p className="muted">
          The raw code is never stored. Record it securely before submitting.
        </p>
        <form className="form" action={createPromoCode}>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Code
            <input name="code" required />
          </label>
          <label>
            Duration in days (blank is permanent)
            <input name="duration" type="number" min="1" />
          </label>
          <label>
            Redemption limit (blank is unlimited)
            <input name="limit" type="number" min="1" />
          </label>
          <button>Create code</button>
        </form>
      </section>
      {codes.map((code) => (
        <section className="card" key={code.id}>
          <h2>
            {code.name} · {code.code_hint}
          </h2>
          <p>
            {code.redemption_count} redemptions ·{" "}
            {code.is_active ? "Active" : "Inactive"}
          </p>
          <form className="form-grid" action={updatePromoCode}>
            <input type="hidden" name="id" value={code.id} />
            <label>
              <input
                name="active"
                type="checkbox"
                defaultChecked={code.is_active}
              />{" "}
              Active
            </label>
            <label>
              Duration days
              <input
                name="duration"
                type="number"
                min="1"
                defaultValue={code.access_duration_days ?? ""}
              />
            </label>
            <label>
              Limit
              <input
                name="limit"
                type="number"
                min="1"
                defaultValue={code.redemption_limit ?? ""}
              />
            </label>
            <button>Update</button>
          </form>
        </section>
      ))}
      <section className="card">
        <h2>Grant complimentary access</h2>
        <form className="form" action={grantAccess}>
          <label>
            User UUID
            <input name="user_id" required />
          </label>
          <label>
            Duration days (blank is permanent)
            <input name="days" type="number" min="1" />
          </label>
          <label>
            Required reason
            <input name="reason" minLength={10} required />
          </label>
          <button>Grant access</button>
        </form>
      </section>
    </>
  );
}
