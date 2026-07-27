import Link from "next/link";
import { requirePermission } from "@/lib/auth/authorization";
import { processRecalculation } from "../actions";
export default async function Recalculations({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  const { supabase } = await requirePermission("projections.manage");
  const { data } = await supabase
    .from("projection_recalculations")
    .select(
      "id,reason,algorithm_version,status,created_at,nutrient_projections(explanation)",
    )
    .order("created_at", { ascending: false });
  return (
    <>
      <p className="eyebrow">PROJECTION WORKER</p>
      <h1>Recalculations</h1>
      <Link href="/admin/projections">Back to review queue</Link>
      {q.error && <p className="error">{q.error}</p>}
      {q.message && <p>{q.message}</p>}
      {data?.map((item) => (
        <section className="card" key={item.id}>
          <strong>
            {item.status} · algorithm {item.algorithm_version}
          </strong>
          <p>{item.reason}</p>
          {item.status === "queued" && (
            <form action={processRecalculation}>
              <input type="hidden" name="request_id" value={item.id} />
              <button>Process now</button>
            </form>
          )}
        </section>
      ))}
    </>
  );
}
